import { useEffect, useRef, useState } from "react";
import { Platform, PermissionsAndroid } from "react-native";
import { BleManager, Device, Subscription } from "react-native-ble-plx";
import { Buffer } from "buffer";
import AsyncStorage from "@react-native-async-storage/async-storage";

// CONSTANTES & UUID CONFIG ESP32
const SERVICE_UUID = "2d3a0001-5a72-4f50-9d9a-8f8c5b6c7e1f";
const AUTH_CHAR_UUID = "2d3a0006-5a72-4f50-9d9a-8f8c5b6c7e1f";
const RESULT_CHAR_UUID = "2d3a0003-5a72-4f50-9d9a-8f8c5b6c7e1f";
const STATS_CHAR_UUID = "2d3a0004-5a72-4f50-9d9a-8f8c5b6c7e1f";
const SPIN_CHAR_UUID = "2d3a0002-5a72-4f50-9d9a-8f8c5b6c7e1f";
const INFO_CHAR_UUID = "2d3a0005-5a72-4f50-9d9a-8f8c5b6c7e1f";
const LOCK_CHAR_UUID = "2d3a0007-5a72-4f50-9d9a-8f8c5b6c7e1f";
const HISTORY_CHAR_UUID = "2d3a0008-5a72-4f50-9d9a-8f8c5b6c7e1f";

const STORAGE_KEY_LAST_DEVICE = "@esp32_last_device_id";
const STORAGE_KEY_LAST_PIN = "@esp32_last_pin"; // Nouvelle clé pour stocker le PIN de session

const manager = new BleManager();

// FONCTION REQUISITION PERMISSIONS
async function ensurePermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  const apiLevel = Platform.Version as number;
  if (apiLevel < 31) {
    const r = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    return r === PermissionsAndroid.RESULTS.GRANTED;
  }
  const res = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  ]);
  return Object.values(res).every(
    (v) => v === PermissionsAndroid.RESULTS.GRANTED
  );
}

// TYPES DE L'ETAT GLOBAL
export type Esp32State = {
  status:
    | "idle"
    | "scanning"
    | "connecting"
    | "connected"
    | "authenticated"
    | "error";
  device: Device | null;
  counter: number | null;
  statusText: string | null;
  error: string | null;
  essaisRestants: number;
  history: number[];
  isLocked: boolean;
  isSpinning: boolean;
  pendingCounter: number | null;
  targetLedIndexGlobal: number | null;
};

export function useEsp32() {
  // - STATE INITIAL DE L'APP
  const [state, setState] = useState<Esp32State>({
    status: "idle",
    device: null,
    counter: null,
    statusText: null,
    error: null,
    essaisRestants: 3,
    history: [],
    isLocked: true,
    isSpinning: false,
    pendingCounter: null,
    targetLedIndexGlobal: null,
  });

  // REFS POUR CONSERVER LES INSTANCES
  const subscription = useRef<Subscription | null>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // INDEX DES LEDS ROUGES
  const listeLedsRouges = [5, 6, 17, 18, 29, 30, 41, 42];

  // HOOK CYCLE DE VIE (CLEANUP)
  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      if (subscription.current) subscription.current.remove();
      if (state.device) {
        state.device.cancelConnection().catch(() => {});
      }
    };
  }, [state.device]);

  //     FONCTIONS CONNEXION ET DETECTION (BLE)

  // Configure le tel une fois connecté (MTU, Services, Disconnect handler)
  const setupConnectedDevice = async (connectedDevice: Device) => {
    if (Platform.OS === "android") {
      await connectedDevice.requestMTU(512).catch(() => {});
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
    await connectedDevice.discoverAllServicesAndCharacteristics();

    connectedDevice.onDisconnected(() => {
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
      }));
    });

    await AsyncStorage.setItem(
      STORAGE_KEY_LAST_DEVICE,
      connectedDevice.id
    ).catch((e) =>
      console.error("Impossible de repérer l'ID de l'appareil", e)
    );

    setState((s) => ({
      ...s,
      status: "connected",
      device: connectedDevice,
      statusText: "Connecté, vérification de l'authentification...",
    }));
  };

  // Lance le scan physique dans les airs pendant max 20 secondes
  const executeScanAndConnect = async () => {
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);

    scanTimeoutRef.current = setTimeout(() => {
      manager.stopDeviceScan();
      setState((s) => ({
        ...s,
        status: "error",
        error: "Appareil non trouvé (Timeout 20s).",
        statusText: "L'ESP32 ne répond pas ou n'émet plus.",
      }));
    }, 20000);

    manager.startDeviceScan(null, null, async (err, device) => {
      if (err) {
        if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
        setState((s) => ({ ...s, status: "error", error: err.message }));
        return;
      }

      if (device) console.log("Appareil détecté :", device.name, device.id);
      if (!device) return;
      if (device.name !== "ESP32-Roue") return;

      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      manager.stopDeviceScan();
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

  // Point d'entrée principal au clic sur "Connecter"
  const scanAndConnect = async () => {
    if (!(await ensurePermissions())) {
      setState((s) => ({
        ...s,
        status: "error",
        error: "Permissions refusées",
      }));
      return;
    }
    try {
      const savedDeviceId = await AsyncStorage.getItem(STORAGE_KEY_LAST_DEVICE);
      const savedPin = await AsyncStorage.getItem(STORAGE_KEY_LAST_PIN); // Récupère le PIN sauvé si existant

      // Si l'id existe, connexion directe sans passer par un scan global
      if (savedDeviceId) {
        setState((s) => ({
          ...s,
          status: "connecting",
          error: null,
          essaisRestants: 3,
          statusText: "Connexion directe à l'appareil connu...",
          history: [],
        }));
        try {
          const connected = await manager.connectToDevice(savedDeviceId);
          await setupConnectedDevice(connected);

          // AUTO-AUTH : Si le PIN est connu en local, on l'envoie direct en tâche de fond
          if (savedPin) {
            console.log(
              "[AUTO-AUTH] Clé PIN trouvée en mémoire locale, envoi..."
            );
            await sendPin(savedPin, connected);
          }
          return;
        } catch (directConnectError) {
          console.warn(
            "Échec direct connect, bascule sur recherche standard...",
            directConnectError
          );
        }
      }

      setState((s) => ({
        ...s,
        status: "scanning",
        error: null,
        essaisRestants: 3,
        statusText: "Recherche globale de l'appareil...",
        history: [],
      }));

      await executeScanAndConnect();
    } catch (e: any) {
      setState((s) => ({ ...s, status: "error", error: e.message }));
    }
  };

  // Envoi du code PIN et configuration des écoutes après auth validée
  const sendPin = async (
    pinStr: string,
    targetedDevice?: Device
  ): Promise<boolean> => {
    const currentDevice = targetedDevice || state.device;

    if (!currentDevice) {
      setState((s) => ({
        ...s,
        error: "Aucun appareil disponible pour l'envoi du PIN",
      }));
      return false;
    }

    try {
      const pinNumber = parseInt(pinStr, 10);
      const buf = Buffer.alloc(4);
      buf.writeUInt32LE(pinNumber, 0);
      const payload = buf.toString("base64");

      await currentDevice.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        AUTH_CHAR_UUID,
        payload
      );

      await new Promise((resolve) => setTimeout(resolve, 500));
      await currentDevice.readCharacteristicForService(
        SERVICE_UUID,
        STATS_CHAR_UUID
      );

      const c = await currentDevice.readCharacteristicForService(
        SERVICE_UUID,
        HISTORY_CHAR_UUID
      );
      const bytes = Buffer.from(c.value ?? "", "base64");
      const count = bytes[0];
      const historiqueInitial = Array.from(
        { length: count },
        (_, i) => bytes[1 + i]
      );

      const lockChar = await currentDevice.readCharacteristicForService(
        SERVICE_UUID,
        LOCK_CHAR_UUID
      );
      const initialLockState =
        Buffer.from(lockChar.value ?? "", "base64")[0] === 0;

      // BRANCHE L'ÉCOUTEUR DE RECEPTION (Bouton BOOT)
      subscription.current = currentDevice.monitorCharacteristicForService(
        SERVICE_UUID,
        RESULT_CHAR_UUID,
        (e, characteristic) => {
          if (e || !characteristic?.value) return;

          const bytesNotify = Buffer.from(characteristic.value, "base64");
          const counter = bytesNotify.readUInt8(0);

          const ledsDuQuartier = [0, 1, 2, 3].map((idx) => counter * 4 + idx);
          const ledsAutorisees = ledsDuQuartier.filter(
            (led) => !listeLedsRouges.includes(led)
          );
          const ledChoisie =
            ledsAutorisees[Math.floor(Math.random() * ledsAutorisees.length)];

          setState((s) => ({
            ...s,
            isSpinning: true,
            pendingCounter: counter,
            targetLedIndexGlobal: ledChoisie,
            isLocked: true,
          }));

          setTimeout(() => {
            refreshLock();
          }, 1000);
        }
      );

      // SAUVEGARDE : L'authentification a réussi, on enregistre le PIN pour les prochaines sessions
      await AsyncStorage.setItem(STORAGE_KEY_LAST_PIN, pinStr).catch((e) =>
        console.error("Échec de la sauvegarde locale du PIN", e)
      );

      setState((s) => ({
        ...s,
        status: "authenticated",
        device: currentDevice,
        statusText: "Authentifié avec succès",
        error: null,
        history: historiqueInitial,
        isLocked: initialLockState,
      }));

      return true;
    } catch (e: any) {
      console.error("Erreur d'authentification PIN capturée : ", e);
      const nouveauxEssais = state.essaisRestants - 1;

      if (subscription.current) {
        subscription.current.remove();
        subscription.current = null;
      }
      manager.stopDeviceScan();

      try {
        await currentDevice.cancelConnection();
      } catch (cancelErr) {}

      // NETTOYAGE : Si le PIN stocké échoue (ex: PIN modifié côté ESP32), on le supprime pour éviter de boucler sur l'erreur
      await AsyncStorage.removeItem(STORAGE_KEY_LAST_PIN).catch(() => {});

      if (nouveauxEssais <= 0) {
        setState((s) => ({
          ...s,
          status: "error",
          device: null,
          counter: null,
          essaisRestants: 0,
          statusText: "Sécurité activée : Appareil verrouillé",
          error: "Sécurité : 3 tentatives incorrectes. Connexion coupée.",
          history: [],
          isLocked: true,
        }));
      } else {
        setState((s) => ({
          ...s,
          status: "connected",
          essaisRestants: nouveauxEssais,
          error: `PIN incorrect (${nouveauxEssais} essais restants)`,
          statusText: "Veuillez réessayer.",
          isLocked: true,
        }));
      }
      return false;
    }
  };

  // Coupe la connexion manuellement et reset le state local
  const disconnect = async () => {
    if (subscription.current) {
      subscription.current.remove();
      subscription.current = null;
    }
    if (state.device) {
      await state.device.cancelConnection().catch(() => {});
    }

    setState((s) => ({
      ...s,
      status: "idle",
      device: null,
      counter: null,
      statusText: "Déconnecté manuellement",
      essaisRestants: 3,
      error: null,
      history: [],
      isLocked: true,
      isSpinning: false,
      pendingCounter: null,
      targetLedIndexGlobal: null,
    }));
  };

  // Oublie l'ID de l'appareil et supprime également le PIN stocké
  const forgetDevice = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY_LAST_DEVICE).catch(() => {});
    await AsyncStorage.removeItem(STORAGE_KEY_LAST_PIN).catch(() => {});
  };

  // ==========================================
  //     FONCTIONS D'ACTION SUR LA ROUE
  // ==========================================

  const tournerRoue = async (targetIndex?: number): Promise<boolean> => {
    if (!state.device || state.status !== "authenticated") {
      setState((s) => ({
        ...s,
        error: "Action impossible : Authentification requise.",
      }));
      return false;
    }

    try {
      const byteValue = targetIndex !== undefined ? targetIndex : 0xff;
      const buf = Buffer.from([byteValue]);
      const payload = buf.toString("base64");

      await state.device.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        SPIN_CHAR_UUID,
        payload
      );
      return true;
    } catch (e: any) {
      console.error("Erreur lors de l'envoi de la commande SPIN :", e);
      setState((s) => ({
        ...s,
        error: "Échec de l'envoi de l'ordre à la roue.",
      }));
      return false;
    }
  };

  const finAnimationRoue = () => {
    setState((s) => {
      let nouvelHistorique =
        s.pendingCounter !== null
          ? [...s.history, s.pendingCounter]
          : s.history;
      if (nouvelHistorique.length > 20) {
        nouvelHistorique = nouvelHistorique.slice(-20);
      }
      return {
        ...s,
        isSpinning: false,
        counter: s.pendingCounter,
        history: nouvelHistorique,
        pendingCounter: null,
        targetLedIndexGlobal: null,
      };
    });
  };

  // ==========================================
  //        FONCTIONS GESTION DES VERROUS
  // ==========================================

  const refreshLock = async (): Promise<boolean> => {
    if (!state.device || state.status !== "authenticated") return true;
    try {
      const c = await state.device.readCharacteristicForService(
        SERVICE_UUID,
        LOCK_CHAR_UUID
      );
      const isLocked = Buffer.from(c.value ?? "", "base64")[0] === 0;
      setState((s) => ({ ...s, isLocked }));
      return isLocked;
    } catch (e) {
      console.error("Erreur lors de la lecture du LOCK :", e);
      return state.isLocked;
    }
  };

  const unlock = async () => {
    if (!state.device || state.status !== "authenticated") return;
    try {
      await state.device.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        LOCK_CHAR_UUID,
        Buffer.from([1]).toString("base64")
      );
      setState((s) => ({ ...s, isLocked: false }));
    } catch (e) {
      console.error("Erreur lors du unlock :", e);
    }
  };

  const lock = async () => {
    if (!state.device || state.status !== "authenticated") return;
    try {
      await state.device.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        LOCK_CHAR_UUID,
        Buffer.from([0]).toString("base64")
      );
      setState((s) => ({ ...s, isLocked: true }));
    } catch (e) {
      console.error("Erreur lors du lock :", e);
    }
  };

  const recupererHistorique = async (): Promise<number[]> => {
    if (!state.device || state.status !== "authenticated") return [];
    try {
      const c = await state.device.readCharacteristicForService(
        SERVICE_UUID,
        HISTORY_CHAR_UUID
      );
      const bytes = Buffer.from(c.value ?? "", "base64");
      const count = bytes[0];
      const history = Array.from({ length: count }, (_, i) => bytes[1 + i]);

      setState((s) => ({ ...s, history }));
      return history;
    } catch (e) {
      console.error("Erreur historique:", e);
      return state.history;
    }
  };

  const lireCaracteristique = async (
    characteristicUuid: string
  ): Promise<string | null> => {
    if (!state.device || state.status !== "authenticated") return null;
    try {
      const characteristic = await state.device.readCharacteristicForService(
        SERVICE_UUID,
        characteristicUuid
      );
      return characteristic.value;
    } catch (e) {
      console.error("Erreur lors de la lecture BLE :", e);
      return null;
    }
  };

  return {
    state,
    scanAndConnect,
    disconnect,
    forgetDevice,
    sendPin,
    tournerRoue,
    lireCaracteristique,
    recupererHistorique,
    unlock,
    lock,
    refreshLock,
    finAnimationRoue,
    STATS_CHAR_UUID,
    INFO_CHAR_UUID,
  };
}
