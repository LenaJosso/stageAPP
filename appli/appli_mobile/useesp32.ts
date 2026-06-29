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
const CONFIG_CHAR_UUID = "2d3a000a-5a72-4f50-9d9a-8f8c5b6c7e1f";

const STORAGE_KEY_LAST_DEVICE = "@esp32_last_device_id";
const STORAGE_KEY_LAST_PIN = "@esp32_last_pin";

let manager: BleManager | null = null;

function getManager(): BleManager {
  if (!manager) manager = new BleManager();
  return manager;
}

let isScanActive = false;

function safeStopScan() {
  if (isScanActive) {
    getManager().stopDeviceScan();
    isScanActive = false;
  }
}

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

export type WheelConfig = {
  loaded: boolean;
  numCases: number;
  ledsPerCase: number;
  totalLeds: number;
  losingLeds: number[]; 
};

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

  const subscription = useRef<Subscription | null>(null);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLaunchedTarget = useRef<boolean>(false);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

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

  const fetchWheelConfig = async (connectedDevice: Device): Promise<WheelConfig> => {
    const c = await connectedDevice.readCharacteristicForService(SERVICE_UUID, CONFIG_CHAR_UUID);
    const buf = Buffer.from(c.value ?? "", "base64");

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

  const setupConnectedDevice = async (connectedDevice: Device) => {
    if (Platform.OS === "android") {
      await connectedDevice.requestMTU(512).catch(() => {});
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
    await connectedDevice.discoverAllServicesAndCharacteristics();

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

  const scanAndConnect = async () => {
    if (!(await ensurePermissions())) {
      setState((s) => ({ ...s, status: "error", error: "Permissions refusées" }));
      return;
    }

    try {
      const savedDeviceId = await AsyncStorage.getItem(STORAGE_KEY_LAST_DEVICE);
      const savedPin = await AsyncStorage.getItem(STORAGE_KEY_LAST_PIN);

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

  const sendPin = async (pinStr: string, targetedDevice?: Device): Promise<boolean> => {
    const currentDevice = targetedDevice || stateRef.current.device;

    if (!currentDevice) {
      setState((s) => ({ ...s, error: "Aucun appareil disponible pour l'envoi du PIN" }));
      return false;
    }

    try {
      const pinNumber = parseInt(pinStr, 10);
      const buf = Buffer.alloc(4);
      buf.writeUInt32LE(pinNumber, 0);
      const payload = buf.toString("base64");

      await currentDevice.writeCharacteristicWithResponseForService(SERVICE_UUID, AUTH_CHAR_UUID, payload);

      await new Promise((resolve) => setTimeout(resolve, 500));
      
      let currentConfig = await fetchWheelConfig(currentDevice);
      
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

      const c = await currentDevice.readCharacteristicForService(SERVICE_UUID, HISTORY_CHAR_UUID);
      const bytes = Buffer.from(c.value ?? "", "base64");
      const count = bytes[0];
      const defaultHistory = Array.from({ length: count }, (_, i) => bytes[1 + i]);

      const lockChar = await currentDevice.readCharacteristicForService(SERVICE_UUID, LOCK_CHAR_UUID);
      const initialLockState = Buffer.from(lockChar.value ?? "", "base64")[0] === 0;

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

  const forgetDevice = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY_LAST_DEVICE).catch(() => {});
    await AsyncStorage.removeItem(STORAGE_KEY_LAST_PIN).catch(() => {});
  };

  const spinWheel = async (targetIndex?: number): Promise<boolean> => {
    const currentDevice = stateRef.current.device;
    if (!currentDevice || stateRef.current.status !== "authenticated") {
      setState((s) => ({ ...s, error: "Action impossible : Authentification requise." }));
      return false;
    }

    isLaunchedTarget.current = targetIndex !== undefined;

    // AJOUT ADDENDUM : On force isLocked localement à true dès l'envoi de la commande depuis l'App
    

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

  const endWheelAnimation = () => {
    setState((s) => {
      let newHistory = s.pendingCounter !== null ? [...s.history, s.pendingCounter] : s.history;
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
 

  const unlock = async () => {
    const currentDevice = stateRef.current.device;
  if (!currentDevice || stateRef.current.status !== "authenticated") return;
  
  try {
    // On envoie la valeur 1 en Base64 pour dire "Déverrouille-toi"
    await currentDevice.writeCharacteristicWithResponseForService(
      SERVICE_UUID,
      LOCK_CHAR_UUID,
      Buffer.from([1]).toString("base64")
    );
    
    // On passe temporairement l'état à false dans l'app
    setState((s) => ({ ...s, isLocked: false }));
  } catch (e) {
    console.error("Erreur lors du déverrouillage :", e);
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

  const caseHasLosingLed = (caseIdx: number): boolean => {
    const activeConfig = stateRef.current.config;
    if (!activeConfig) return false;
    const start = caseIdx * activeConfig.ledsPerCase;
    const end = start + activeConfig.ledsPerCase;
    
    return activeConfig.losingLeds.some((led) => 
      (led >= start && led < end) || (activeConfig.losingLeds.every(idx => idx < activeConfig.numCases) && led === caseIdx)
    );
  };

  const getLosingCases = (): number[] => {
  const activeConfig = stateRef.current.config;
  if (!activeConfig || !activeConfig.losingLeds || activeConfig.losingLeds.length === 0) {
    return [];
  }

  const losingCases: number[] = [];
  const numCases = activeConfig.numCases || 12;

  // Parcourir toutes les cases de la roue pour voir lesquelles contiennent une LED perdante
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