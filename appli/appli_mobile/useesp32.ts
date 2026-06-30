import { useEffect, useRef, useState } from "react";
import { Platform, PermissionsAndroid } from "react-native";
import { BleManager, Device, Subscription } from "react-native-ble-plx";
import { Buffer } from "buffer";
import AsyncStorage from "@react-native-async-storage/async-storage";

// CONSTANTES & UUID CONFIG ESP32
// Ces UUID doivent correspondre exactement à ceux définis côté firmware ESP32
const SERVICE_UUID = "2d3a0001-5a72-4f50-9d9a-8f8c5b6c7e1f";
const AUTH_CHAR_UUID = "2d3a0006-5a72-4f50-9d9a-8f8c5b6c7e1f";
const RESULT_CHAR_UUID = "2d3a0003-5a72-4f50-9d9a-8f8c5b6c7e1f";
const STATS_CHAR_UUID = "2d3a0004-5a72-4f50-9d9a-8f8c5b6c7e1f";
const SPIN_CHAR_UUID = "2d3a0002-5a72-4f50-9d9a-8f8c5b6c7e1f";
const INFO_CHAR_UUID = "2d3a0005-5a72-4f50-9d9a-8f8c5b6c7e1f";
const LOCK_CHAR_UUID = "2d3a0007-5a72-4f50-9d9a-8f8c5b6c7e1f";
const HISTORY_CHAR_UUID = "2d3a0008-5a72-4f50-9d9a-8f8c5b6c7e1f";
const CONFIG_CHAR_UUID = "2d3a000a-5a72-4f50-9d9a-8f8c5b6c7e1f";

// Clés AsyncStorage pour la reconnexion automatique (device + PIN mémorisés)
const STORAGE_KEY_LAST_DEVICE = "@esp32_last_device_id";
const STORAGE_KEY_LAST_PIN = "@esp32_last_pin";

// Instance unique du BleManager, partagée par toute l'app (singleton)
let manager: BleManager | null = null;

function getManager(): BleManager {
  if (!manager) manager = new BleManager();
  return manager;
}

// Flag global pour éviter de lancer plusieurs scans BLE en parallèle
let isScanActive = false;

function safeStopScan() {
  if (isScanActive) {
    getManager().stopDeviceScan();
    isScanActive = false;
  }
}

// Demande les permissions nécessaires au scan BLE (différentes selon la version d'Android)
//Assure les permissions 
async function ensurePermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  const apiLevel = Platform.Version as number;
  if (apiLevel < 31) {
    // Avant Android 12, seule la localisation est nécessaire pour scanner en BLE
    const r = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    return r === PermissionsAndroid.RESULTS.GRANTED;
  }
  // À partir d'Android 12, permissions BLUETOOTH_SCAN / BLUETOOTH_CONNECT dédiées
  const res = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  ]);
  return Object.values(res).every(
    (v) => v === PermissionsAndroid.RESULTS.GRANTED
  );
}

//info données par esp32
// Configuration de la roue telle que renvoyée par l'ESP32 (nombre de cases, leds par case, leds perdantes...)
export type WheelConfig = {
  loaded: boolean;
  numCases: number;
  ledsPerCase: number;
  totalLeds: number;
  losingLeds: number[]; 
};

// État global exposé par le hook, reflète à la fois la connexion BLE et l'état fonctionnel de la roue
export type Esp32State = {
  status: "idle" | "scanning" | "connecting" | "connected" | "authenticated" | "error";
  device: Device | null;
  counter: number | null;
  statusText: string | null;
  error: string | null;
  remainingTrials: number;
  history: number[];
  isLocked: boolean;
  isSpinning: boolean;
  pendingCounter: number | null;
  targetLedIndexGlobal: number | null;
  config: WheelConfig | null;
};

export function useEsp32() {
  const [state, setState] = useState<Esp32State>({
    status: "idle",
    device: null,
    counter: null,
    statusText: null,
    error: null,
    remainingTrials: 3,
    history: [],
    isLocked: true,
    isSpinning: false,
    pendingCounter: null,
    targetLedIndexGlobal: null,
    config: null,
  });

  // Référence vers la subscription au monitoring BLE (notifications de résultat)
  const subscription = useRef<Subscription | null>(null);
  // Timer de timeout du scan, pour arrêter de chercher l'appareil après 20s
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Indique si le dernier spin a été déclenché via le bouton BANKRUPT (cible forcée sur une LED perdante)
  const isLaunchedTarget = useRef<boolean>(false);
  // Copie synchrone de `state`, nécessaire car les callbacks BLE (closures) capturent
  // une version figée de `state` au moment de leur création — stateRef permet toujours
  // d'accéder à la valeur la plus à jour, même depuis un callback ancien
  const stateRef = useRef(state);

  // Garde stateRef.current synchronisé avec le state React à chaque rendu
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Nettoyage global au démontage du hook : on coupe tout proprement
  // (scan, subscription, connexion BLE) pour éviter les fuites mémoire / callbacks fantômes
  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      if (subscription.current) subscription.current.remove();
      safeStopScan();
      if (stateRef.current.device) {
        stateRef.current.device.cancelConnection().catch(() => {});
      }
    };
  }, []);

  // Lit et décode la caractéristique CONFIG_CHAR_UUID pour récupérer la config de la roue
  //Va recuperer les configs au bon endroit
  const fetchWheelConfig = async (connectedDevice: Device): Promise<WheelConfig> => {
    const c = await connectedDevice.readCharacteristicForService(SERVICE_UUID, CONFIG_CHAR_UUID);
    const buf = Buffer.from(c.value ?? "", "base64");

    // Format binaire attendu : [loaded, numCases, ledsPerCase, nbLosing, ...losingLedIndexes]
    const loaded = buf[0] === 1;
    const numCases = buf[1];
    const ledsPerCase = buf[2];
    const nbLosing = buf[3];
    const losingLeds = Array.from(buf.slice(4, 4 + nbLosing));

    return {
      loaded,
      numCases,
      ledsPerCase,
      totalLeds: numCases * ledsPerCase,
      losingLeds,
    };
  };

  // Étapes communes après une connexion réussie (directe ou via scan) :
  // négociation MTU, découverte des services, écoute de la déconnexion, sauvegarde de l'ID device
  const setupConnectedDevice = async (connectedDevice: Device) => {
    if (Platform.OS === "android") {
      // Augmente la taille max des paquets BLE pour accélérer les échanges (Android uniquement)
      await connectedDevice.requestMTU(512).catch(() => {});
    }

    // Petit délai de stabilisation avant de découvrir les services (évite certains bugs BLE)
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await connectedDevice.discoverAllServicesAndCharacteristics();

    // Si l'ESP32 se déconnecte (perte de portée, reset...), on reset entièrement l'état local
    connectedDevice.onDisconnected(() => {
      if (subscription.current) {
        subscription.current.remove();
        subscription.current = null;
      }
      setState((s) => ({
        ...s,
        status: "idle",
        device: null,
        counter: null,
        statusText: "Déconnecté de l'appareil",
        history: [],
        isLocked: true,
        isSpinning: false,
        pendingCounter: null,
        targetLedIndexGlobal: null,
        config: null,
      }));
    });

    // Mémorise l'ID du device pour permettre une reconnexion directe la prochaine fois (sans re-scanner)
    await AsyncStorage.setItem(STORAGE_KEY_LAST_DEVICE, connectedDevice.id).catch((e) =>
      console.error("Impossible de repérer l'ID de l'appareil", e)
    );

    setState((s) => ({
      ...s,
      status: "connected",
      device: connectedDevice,
      statusText: "Connecté, vérification de l'authentification...",
    }));
  };

  // Lance un scan BLE classique (sans device connu) et se connecte au premier ESP32-Roue trouvé
  const executeScanAndConnect = async () => {
    const bleState = await getManager().state();
    if (bleState !== "PoweredOn") {
      setState((s) => ({
        ...s,
        status: "error",
        error: "Bluetooth non disponible. Vérifiez qu'il est activé.",
        statusText: "Bluetooth désactivé ou non autorisé.",
      }));
      return;
    }

    safeStopScan();
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);

    // Abandon du scan après 20s si aucun appareil compatible n'est trouvé
    scanTimeoutRef.current = setTimeout(() => {
      safeStopScan();
      setState((s) => ({
        ...s,
        status: "error",
        error: "Appareil non trouvé (Timeout 20s).",
        statusText: "L'ESP32 ne répond pas ou n'émet plus.",
      }));
    }, 20000);

    isScanActive = true;
    getManager().startDeviceScan(null, null, async (err, device) => {
      if (err) {
        isScanActive = false;
        if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
        setState((s) => ({
          ...s,
          status: "error",
          error: err.message,
          statusText: "Erreur lors du scan BLE.",
        }));
        return;
      }

      if (!device) return;
      // On ne s'intéresse qu'à l'appareil portant le nom exact attendu
      if (device.name !== "ESP32-Roue") return;

      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      safeStopScan();

      setState((s) => ({ ...s, status: "connecting" }));

      try {
        const connected = await device.connect();
        await setupConnectedDevice(connected);
      } catch (e: any) {
        console.error("Erreur de connexion BLE : ", e);
        setState((s) => ({
          ...s,
          status: "error",
          error: e.message || "Connexion échouée",
          statusText: "Impossible de stabiliser la liaison",
        }));
      }
    });
  };

  // Point d'entrée principal pour se connecter : tente d'abord une reconnexion directe
  // au dernier device connu (et renvoie son PIN automatiquement), sinon lance un scan complet
  // Scan aux alentours pour trouver un device compatible
  const scanAndConnect = async () => {
    if (!(await ensurePermissions())) {
      setState((s) => ({ ...s, status: "error", error: "Permissions refusées" }));
      return;
    }

    try {
      const savedDeviceId = await AsyncStorage.getItem(STORAGE_KEY_LAST_DEVICE);
      const savedPin = await AsyncStorage.getItem(STORAGE_KEY_LAST_PIN);

      //si le device est déjà connu, il se reconnecte sans avoir besoin de rentrer le code pin
      if (savedDeviceId) {
        setState((s) => ({
          ...s,
          status: "connecting",
          error: null,
          remainingTrials: 3,
          statusText: "Connexion directe à l'appareil connu...",
          history: [],
        }));

        try {
          const connected = await getManager().connectToDevice(savedDeviceId);
          await setupConnectedDevice(connected);

          if (savedPin) {
            console.log("[AUTO-AUTH] Clé PIN trouvée en mémoire locale, envoi...");
            await sendPin(savedPin, connected);
          }
          return;
        } catch (directConnectError) {
          // Si la reconnexion directe échoue (device hors de portée, ID invalide...),
          // on bascule sur un scan classique plutôt que d'échouer complètement
          console.warn("Échec direct connect, bascule sur recherche standard...", directConnectError);
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      setState((s) => ({
        ...s,
        status: "scanning",
        error: null,
        remainingTrials: 3,
        statusText: "Recherche globale de l'appareil...",
        history: [],
      }));

      await executeScanAndConnect();
    } catch (e: any) {
      setState((s) => ({ ...s, status: "error", error: e.message }));
    }
  };

  // Envoie le code PIN à l'ESP32 pour s'authentifier, puis récupère toutes les données
  // initiales nécessaires (config, stats, historique, état du verrou) et démarre l'écoute des résultats
  //Envoie du pin si le device n'etait pas connu
  const sendPin = async (pinStr: string, targetedDevice?: Device): Promise<boolean> => {
    const currentDevice = targetedDevice || stateRef.current.device;

    if (!currentDevice) {
      setState((s) => ({ ...s, error: "Aucun appareil disponible pour l'envoi du PIN" }));
      return false;
    }

    try {
      // Le PIN est envoyé en uint32 little-endian, format attendu par le firmware
      const pinNumber = parseInt(pinStr, 10);
      const buf = Buffer.alloc(4);
      buf.writeUInt32LE(pinNumber, 0);
      const payload = buf.toString("base64");

      await currentDevice.writeCharacteristicWithResponseForService(SERVICE_UUID, AUTH_CHAR_UUID, payload);

      await new Promise((resolve) => setTimeout(resolve, 500));
      
      let currentConfig = await fetchWheelConfig(currentDevice);
      
      // Si la config n'est pas encore "loaded" côté ESP32, on déclenche son chargement
      // puis on la relit une seconde fois
      if (!currentConfig.loaded) {
        await currentDevice.writeCharacteristicWithResponseForService(
          SERVICE_UUID,
          CONFIG_CHAR_UUID,
          Buffer.from([0]).toString("base64")
        );
        await new Promise((resolve) => setTimeout(resolve, 500));
        currentConfig = await fetchWheelConfig(currentDevice);
      }

      await currentDevice.readCharacteristicForService(SERVICE_UUID, STATS_CHAR_UUID);

      // Lecture de l'historique initial stocké côté ESP32 (format : [count, ...idLots])
      const c = await currentDevice.readCharacteristicForService(SERVICE_UUID, HISTORY_CHAR_UUID);
      const bytes = Buffer.from(c.value ?? "", "base64");
      const count = bytes[0];
      const defaultHistory = Array.from({ length: count }, (_, i) => bytes[1 + i]);

      // Lecture de l'état du verrou actuel (0 = verrouillé côté ESP32)
      const lockChar = await currentDevice.readCharacteristicForService(SERVICE_UUID, LOCK_CHAR_UUID);
      const initialLockState = Buffer.from(lockChar.value ?? "", "base64")[0] === 0;

      // Abonnement aux notifications de résultat de spin envoyées par l'ESP32
      subscription.current = currentDevice.monitorCharacteristicForService(
      SERVICE_UUID,
      RESULT_CHAR_UUID,
      (e, characteristic) => {
        if (e) {
          console.error("Erreur lors du monitor de RESULT_CHAR :", e);
          return;
        }
        if (!characteristic?.value) return;

        const bytesNotify = Buffer.from(characteristic.value, "base64");
        const rawCounter = bytesNotify.readUInt8(0);
        console.log("Notification reçue, rawCounter brut =", rawCounter);

        const currentConfig = stateRef.current.config;
        const casesCount = currentConfig?.numCases || 12;
        
        // On garde la case brute calculée, SANS AUCUN DÉCALAGE NI FILTRE 'while' !
        let winningCase = rawCounter % casesCount;

        let chosenLed: number | null = null;

        if (currentConfig) {
          const startLed = winningCase * currentConfig.ledsPerCase;
          const ledsQuarter = Array.from(
            { length: currentConfig.ledsPerCase },
            (_, idx) => startLed + idx
          );

          const ledsLosing = ledsQuarter.filter((led) =>
            currentConfig.losingLeds.includes(led)
          );

          // Sélection de la LED
          if (isLaunchedTarget.current) {
            // Bouton BANKRUPT cliqué : on force l'aiguille sur une LED noire du quartier
            if (ledsLosing.length > 0) {
              chosenLed = ledsLosing[Math.floor(Math.random() * ledsLosing.length)];
            } else {
              chosenLed = ledsQuarter[0];
            }
          } else {
            // Bouton SPIN ou BOOT : Aléatoire complet parmi les 4 LEDs du quartier (gagnantes ou perdantes)
            chosenLed = ledsQuarter[Math.floor(Math.random() * ledsQuarter.length)];
          }
        }

        console.log(`Résultat -> Case: ${winningCase}, LED: ${chosenLed}`);

        // On verrouille systématiquement la roue dès qu'un résultat de spin arrive
        // (sécurité pour éviter un nouveau spin pendant l'animation)
        setState((s) => ({
          ...s,
          isSpinning: true,
          pendingCounter: winningCase,
          targetLedIndexGlobal: chosenLed,
          isLocked: true, 
        }));

        isLaunchedTarget.current = false;
      }
    );

      // Sauvegarde locale du PIN pour permettre les futures reconnexions automatiques
      await AsyncStorage.setItem(STORAGE_KEY_LAST_PIN, pinStr).catch((e) =>
        console.error("Échec de la sauvegarde locale du PIN", e)
      );

      setState((s) => ({
        ...s,
        status: "authenticated",
        device: currentDevice,
        statusText: "Authentifié avec succès",
        error: null,
        history: defaultHistory,
        isLocked: initialLockState,
        config: currentConfig,
      }));

      return true;
    } catch (e: any) {
      // PIN incorrect ou erreur de communication : on décrémente les tentatives restantes
      // et on coupe la connexion par sécurité (anti brute-force)
      console.error("Erreur d'authentification PIN capturée : ", e);
      const newTrials = stateRef.current.remainingTrials - 1;

      if (subscription.current) {
        subscription.current.remove();
        subscription.current = null;
      }

      try {
        await currentDevice.cancelConnection();
      } catch (cancelErr) {}

      await AsyncStorage.removeItem(STORAGE_KEY_LAST_PIN).catch(() => {});

      if (newTrials <= 0) {
        // Trop d'échecs : on bloque complètement et on force une reconnexion manuelle ultérieure
        setState((s) => ({
          ...s,
          status: "error",
          device: null,
          counter: null,
          remainingTrials: 0,
          statusText: "Sécurité activée : Appareil verrouillé",
          error: "Sécurité : 3 tentatives incorrectes. Connexion coupée.",
          history: [],
          isLocked: true,
          config: null,
        }));
      } else {
        setState((s) => ({
          ...s,
          status: "connected",
          remainingTrials: newTrials,
          error: `PIN incorrect (${newTrials} essais restants)`,
          statusText: "Veuillez réessayer.",
          isLocked: true,
        }));
      }
      return false;
    }
  };

  // Déconnexion manuelle initiée par l'utilisateur : on coupe tout proprement et on reset l'état
  // se deconnecter
  const disconnect = async () => {
    if (subscription.current) {
      subscription.current.remove();
      subscription.current = null;
    }
    safeStopScan();
    if (stateRef.current.device) {
      await stateRef.current.device.cancelConnection().catch(() => {});
    }

    setState((s) => ({
      ...s,
      status: "idle",
      device: null,
      counter: null,
      statusText: "Déconnecté manuellement",
      remainingTrials: 3,
      error: null,
      history: [],
      isLocked: true,
      isSpinning: false,
      pendingCounter: null,
      targetLedIndexGlobal: null,
      config: null,
    }));
  };

  // Supprime les infos de reconnexion automatique stockées localement
  // (utile pour forcer un nouveau scan + nouvelle saisie de PIN sur un autre appareil)
  const forgetDevice = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY_LAST_DEVICE).catch(() => {});
    await AsyncStorage.removeItem(STORAGE_KEY_LAST_PIN).catch(() => {});
  };

  // Envoie la commande de spin à l'ESP32. targetIndex permet de viser une case précise
  // (utilisé par BANKRUPT) ; sinon 0xff signale un tirage totalement aléatoire côté firmware
  //fais tourner la roue
  const spinWheel = async (targetIndex?: number): Promise<boolean> => {
    const currentDevice = stateRef.current.device;
    if (!currentDevice || stateRef.current.status !== "authenticated") {
      setState((s) => ({ ...s, error: "Action impossible : Authentification requise." }));
      return false;
    }

    // Mémorise si ce spin est "forcé" (BANKRUPT) pour orienter le choix de la LED
    // une fois le résultat reçu par notification
    isLaunchedTarget.current = targetIndex !== undefined;


    try {
      const byteValue = targetIndex !== undefined ? targetIndex : 0xff;
      const buf = Buffer.from([byteValue]);
      const payload = buf.toString("base64");

      await currentDevice.writeCharacteristicWithResponseForService(SERVICE_UUID, SPIN_CHAR_UUID, payload);
      return true;
    } catch (e: any) {
      console.error("Erreur lors de l'envoi de la commande SPIN :", e);
      setState((s) => ({ ...s, error: "Échec de l'envoi de l'ordre à la roue.", isSpinning: false }));
      return false;
    }
  };


  // Appelée une fois l'animation de rotation terminée côté UI :
  // ajoute le résultat à l'historique local et nettoie les valeurs temporaires de spin
  //arrete la rotation de la roue
  const endWheelAnimation = () => {
    setState((s) => {
      let newHistory = s.pendingCounter !== null ? [...s.history, s.pendingCounter] : s.history;
      // On garde un historique local limité aux 20 derniers tirages pour éviter qu'il ne grossisse indéfiniment
      if (newHistory.length > 20) {
        newHistory = newHistory.slice(-20);
      }
      return {
        ...s,
        isSpinning: false,
        counter: s.pendingCounter,
        history: newHistory,
        pendingCounter: null,
        targetLedIndexGlobal: null,
      };
    });
  };

//GESTION DES VERROUS

  // Relit l'état réel du verrou directement depuis l'ESP32 (utile pour resynchroniser
  // l'UI si on suspecte un décalage entre l'état local et l'état matériel réel)
  const refreshLock = async (): Promise<boolean> => {
    const currentDevice = stateRef.current.device;
    if (!currentDevice || stateRef.current.status !== "authenticated")
      return true;
    try {
      const c = await currentDevice.readCharacteristicForService(
        SERVICE_UUID,
        LOCK_CHAR_UUID
      );
      const isLocked = Buffer.from(c.value ?? "", "base64")[0] === 0;
      setState((s) => ({ ...s, isLocked }));
      return isLocked;
    } catch (e) {
      console.error("Erreur lors de la lecture du LOCK :", e);
      return stateRef.current.isLocked;
    }
  };
 
  // Déverrouille la roue physiquement (envoie 1 à l'ESP32) et met l'UI à jour immédiatement.
  // Le re-verrouillage automatique après quelques secondes est géré par le useEffect plus bas.
  //Déverrouille la roue
  const unlock = async () => {
    const currentDevice = stateRef.current.device;
    if (!currentDevice || stateRef.current.status !== "authenticated") return;

    try {
      await currentDevice.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        LOCK_CHAR_UUID,
        Buffer.from([1]).toString("base64")
      );
      setState((s) => ({ ...s, isLocked: false }));
    } catch (e) {
      console.error("Erreur lors du déverrouillage :", e);
    }
  };

  // Verrouille la roue physiquement (envoie 0 à l'ESP32). Utilisée à la fois 
  // manuellement et automatiquement par le useEffect ci-dessous.
  //s'occupe du lock de la roue
  const lock = async () => {
    const currentDevice = stateRef.current.device;
    if (!currentDevice || stateRef.current.status !== "authenticated") return;
    try {
      await currentDevice.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        LOCK_CHAR_UUID,
        Buffer.from([0]).toString("base64")
      );
      setState((s) => ({ ...s, isLocked: true }));
    } catch (e) {
      console.error("Erreur lors du lock :", e);
    }
  };

  // RELOCK AUTOMATIQUE
  // Dès que la roue passe en déverrouillé (isLocked === false), on programme
  // un re-verrouillage automatique après 5 secondes. Le cleanup (clearTimeout)
  // annule ce timer si l'état change avant l'échéance (ex: lock manuel, déconnexion,
  // ou un nouveau unlock qui redéclenche cet effet) — ça évite d'avoir plusieurs
  // timers actifs en même temps qui se marcheraient dessus.
  useEffect(() => {
    if (!state.isLocked) {
      const timer = setTimeout(() => {
        lock();
      }, 5000); // délai avant relock automatique — à ajuster selon le besoin métier

      return () => clearTimeout(timer);
    }
  }, [state.isLocked]);

  // Récupère l'historique complet des tirages stocké sur l'ESP32
  //récupère l'historique 
  const retrieveHistory = async (): Promise<number[]> => {
    const currentDevice = stateRef.current.device;
    if (!currentDevice || stateRef.current.status !== "authenticated") return [];
    try {
      const c = await currentDevice.readCharacteristicForService(SERVICE_UUID, HISTORY_CHAR_UUID);
      const bytes = Buffer.from(c.value ?? "", "base64");
      const count = bytes[0];
      const history = Array.from({ length: count }, (_, i) => bytes[1 + i]);

      setState((s) => ({ ...s, history }));
      return history;
    } catch (e) {
      console.error("Erreur historique:", e);
      return stateRef.current.history;
    }
  };

  // Fonction utilitaire générique pour lire n'importe quelle caractéristique BLE
  // (utilisée pour des lectures ponctuelles hors des helpers dédiés ci-dessus) 
  const readCharacteristic = async (characteristicUuid: string): Promise<string | null> => {
    const currentDevice = stateRef.current.device;
    if (!currentDevice || stateRef.current.status !== "authenticated") return null;
    try {
      const characteristic = await currentDevice.readCharacteristicForService(SERVICE_UUID, characteristicUuid);
      return characteristic.value;
    } catch (e) {
      console.error("Erreur lors de la lecture BLE :", e);
      return null;
    }
  };


  /**/

  // Indique si une case donnée contient au moins une LED perdante (utilisé pour le rendu visuel des cases)
  //Pour savoir si le quartier a des leds perdantes 
  const caseHasLosingLed = (caseIdx: number): boolean => {
    const activeConfig = stateRef.current.config;
    if (!activeConfig) return false;
    const start = caseIdx * activeConfig.ledsPerCase;
    const end = start + activeConfig.ledsPerCase;
    
    return activeConfig.losingLeds.some((led) => 
      (led >= start && led < end) || (activeConfig.losingLeds.every(idx => idx < activeConfig.numCases) && led === caseIdx)
    );
  };

  // Renvoie la liste complète des index de cases considérées comme "perdantes"
  // (utilisé par le bouton BANKRUPT pour choisir une cible aléatoire)
  const getLosingCases = (): number[] => {
    const activeConfig = stateRef.current.config;
    if (!activeConfig || !activeConfig.losingLeds || activeConfig.losingLeds.length === 0) {
      return [];
    }

    const losingCases: number[] = [];
    const numCases = activeConfig.numCases || 12;

    // Parcoure toutes les cases de la roue pour voir lesquelles contiennent une LED perdante
    for (let caseIdx = 0; caseIdx < numCases; caseIdx++) {
      const start = caseIdx * activeConfig.ledsPerCase;
      const end = start + activeConfig.ledsPerCase;

      const hasLosing = activeConfig.losingLeds.some((led) => 
        (led >= start && led < end) || 
        (activeConfig.losingLeds.every(idx => idx < numCases) && led === caseIdx)
      );

      if (hasLosing) {
        losingCases.push(caseIdx);
      }
    }

    return losingCases;
  };

  // Expose l'état et toutes les actions disponibles aux composants consommateurs du contexte
  return {
    state,
    scanAndConnect,
    disconnect,
    forgetDevice,
    sendPin,
    spinWheel,
    readCharacteristic,
    retrieveHistory,
    unlock,
    lock,
    refreshLock,
    endWheelAnimation,
    caseHasLosingLed,
    getLosingCases,
    STATS_CHAR_UUID,
    INFO_CHAR_UUID,
    CONFIG_CHAR_UUID,
  };
}