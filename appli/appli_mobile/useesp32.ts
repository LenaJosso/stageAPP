import { useEffect, useRef, useState } from "react";
import { Platform, PermissionsAndroid } from "react-native";
import { BleManager, Device, Subscription } from "react-native-ble-plx";
import { Buffer } from "buffer";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─────────────────────────────────────────────
//  CONSTANTES & UUID CONFIG ESP32
// ─────────────────────────────────────────────
const SERVICE_UUID     = "2d3a0001-5a72-4f50-9d9a-8f8c5b6c7e1f";
const AUTH_CHAR_UUID   = "2d3a0006-5a72-4f50-9d9a-8f8c5b6c7e1f";
const RESULT_CHAR_UUID = "2d3a0003-5a72-4f50-9d9a-8f8c5b6c7e1f";
const STATS_CHAR_UUID  = "2d3a0004-5a72-4f50-9d9a-8f8c5b6c7e1f";
const SPIN_CHAR_UUID   = "2d3a0002-5a72-4f50-9d9a-8f8c5b6c7e1f";
const INFO_CHAR_UUID   = "2d3a0005-5a72-4f50-9d9a-8f8c5b6c7e1f";
const LOCK_CHAR_UUID   = "2d3a0007-5a72-4f50-9d9a-8f8c5b6c7e1f";
const HISTORY_CHAR_UUID = "2d3a0008-5a72-4f50-9d9a-8f8c5b6c7e1f";

const STORAGE_KEY_LAST_DEVICE = "@esp32_last_device_id";
const STORAGE_KEY_LAST_PIN    = "@esp32_last_pin";

// ─────────────────────────────────────────────
//  CONFIGURATION DES ROUES
// ─────────────────────────────────────────────

/**
 * Décrit la configuration d'une roue :
 *
 * @param totalCases    Nombre de quartiers/cases sur la roue (12 ou 20)
 * @param ledsPerCase   Nombre de LEDs par quartier. 0 = pas de LEDs (roue simple)
 * @param redLEDList    Indices des LEDs rouges à éviter (vide si pas de LEDs)
 * @param redCaseList   Indices des quartiers rouges à éviter (utilisé uniquement
 *                      si ledsPerCase === 0, c.-à-d. roue sans LEDs)
 * @param randomAllowed Si false, les lancers aléatoires ne peuvent pas tomber
 *                      sur un quartier rouge (roue sans LEDs uniquement)
 */
export type WheelConfig = {
  totalCases: number;
  ledsPerCase: number;
  redLEDList: number[];
  redCaseList: number[];
  randomAllowed: boolean;
};

/**
 * Roue 1 — 12 cases simples, aucune LED.
 * Les lancers aléatoires ne peuvent pas tomber sur un quartier rouge.
 * Les lancers ciblés (bouton 1-12) ignorent cette contrainte.
 */
export const WHEEL_12_SIMPLE: WheelConfig = {
  totalCases: 12,
  ledsPerCase: 0,
  redLEDList: [],
  redCaseList: [1, 4, 7, 10],
  randomAllowed: false,
};

/**
 * Roue 2 — 12 cases avec 4 LEDs par case (48 LEDs total).
 * Les LEDs rouges sont évitées lors du choix de l'affichage final.
 */
export const WHEEL_12_LEDS: WheelConfig = {
  totalCases: 12,
  ledsPerCase: 4,
  redLEDList: [5, 6, 17, 18, 29, 30, 41, 42],
  redCaseList: [],
  randomAllowed: true, 
};

/**
 * Roue 3 — 20 cases avec 3 LEDs par case (60 LEDs total).
 * Les LEDs rouges sont évitées lors du choix de l'affichage final.
 */
export const WHEEL_20_LEDS: WheelConfig = {
  totalCases: 20,
  ledsPerCase: 3,
  redLEDList: [7, 22, 37, 52],
  redCaseList: [],
  randomAllowed: true,
};


// ─────────────────────────────────────────────
//  SINGLETON BLEMANAGER
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
//  PERMISSIONS ANDROID
// ─────────────────────────────────────────────
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
  return Object.values(res).every((v) => v === PermissionsAndroid.RESULTS.GRANTED);
}

// ─────────────────────────────────────────────
//  TYPES D'ÉTAT
// ─────────────────────────────────────────────
export type Esp32Status =
  | "idle"
  | "scanning"
  | "connecting"
  | "connected"
  | "authenticated"
  | "error";

export type Esp32State = {
  status: Esp32Status;
  device: Device | null;
  /** Quartier gagnant validé (après fin d'animation) */
  counter: number | null;
  statusText: string | null;
  error: string | null;
  remainingTrials: number;
  /** Historique des 20 derniers quartiers gagnants */
  history: number[];
  isLocked: boolean;
  isSpinning: boolean;
  /** Quartier en attente de validation (pendant l'animation) */
  pendingCounter: number | null;
  /**
   * Index LED global à allumer à la fin de l'animation.
   * null pour les roues sans LEDs (ledsPerCase === 0).
   */
  targetLedIndexGlobal: number | null;
};

// ─────────────────────────────────────────────
//  HOOK PRINCIPAL
// ─────────────────────────────────────────────

/**
 * useEsp32 — hook générique pour piloter n'importe quelle roue ESP32-Roue.
 *
 * @param wheelConfig  Configuration de la roue active (WHEEL_12_SIMPLE,
 *                     WHEEL_12_LEDS ou WHEEL_20_LEDS)
 *
 * @example
 *   const { state, scanAndConnect, spinWheel } = useEsp32(WHEEL_20_LEDS);
 */
export function useEsp32(wheelConfig: WheelConfig) {
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
  });

  const subscription   = useRef<Subscription | null>(null);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef       = useRef(state);

  // Ref spécifique roue sans LEDs : distingue spin ciblé vs aléatoire
  const isLaunchedTarget = useRef<boolean>(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ── Cleanup au démontage ──────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────
  //  LOGIQUE LED / CASE (dépend de wheelConfig)
  // ─────────────────────────────────────────────

  /**
   * Calcule l'index LED global à allumer pour un quartier donné.
   * Exclut les LEDs rouges et en choisit une aléatoirement parmi les LEDs valides.
   * Retourne null si la roue n'a pas de LEDs.
   */
  function pickLedForQuarter(
    quarter: number,
    existingTarget: number | null
  ): number | null {
    const { ledsPerCase, redLEDList } = wheelConfig;

    // Roue sans LEDs : pas de calcul
    if (ledsPerCase === 0) return null;

    // Si une LED cible a déjà été définie pour ce quartier, on la conserve
    if (
      existingTarget !== null &&
      Math.floor(existingTarget / ledsPerCase) === quarter
    ) {
      return existingTarget;
    }

    // Calcule les LEDs du quartier et filtre les rouges
    const ledsInQuarter = Array.from(
      { length: ledsPerCase },
      (_, i) => quarter * ledsPerCase + i
    );
    const ledsAllowed = ledsInQuarter.filter((led) => !redLEDList.includes(led));

    // Sécurité : si toutes filtrées, on prend la première quand même
    const pool = ledsAllowed.length > 0 ? ledsAllowed : ledsInQuarter;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /**
   * Applique le décalage anti-rouge pour les roues sans LEDs (WHEEL_12_SIMPLE).
   * Si le lancer est aléatoire et tombe sur une case rouge, on avance jusqu'à
   * une case non rouge.
   */
  function resolveQuarterForSimpleWheel(raw: number, isTargeted: boolean): number {
    const { totalCases, redCaseList } = wheelConfig;
    if (isTargeted || redCaseList.length === 0) return raw;

    let quarter = raw;
    while (redCaseList.includes(quarter)) {
      quarter = (quarter + 1) % totalCases;
    }
    return quarter;
  }

  // ─────────────────────────────────────────────
  //  CONNEXION BLE
  // ─────────────────────────────────────────────

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
      }));
    });

    await AsyncStorage.setItem(STORAGE_KEY_LAST_DEVICE, connectedDevice.id).catch(
      (e) => console.error("Impossible de repérer l'ID de l'appareil", e)
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

      if (!device || device.name !== "ESP32-Roue") return;

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
      const savedPin      = await AsyncStorage.getItem(STORAGE_KEY_LAST_PIN);

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
          console.warn(
            "Échec direct connect, bascule sur recherche standard...",
            directConnectError
          );
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

  // ─────────────────────────────────────────────
  //  AUTHENTIFICATION PIN
  // ─────────────────────────────────────────────

  const sendPin = async (
    pinStr: string,
    targetedDevice?: Device
  ): Promise<boolean> => {
    const currentDevice = targetedDevice || stateRef.current.device;

    if (!currentDevice) {
      setState((s) => ({
        ...s,
        error: "Aucun appareil disponible pour l'envoi du PIN",
      }));
      return false;
    }

    try {
      const buf = Buffer.alloc(4);
      buf.writeUInt32LE(parseInt(pinStr, 10), 0);
      await currentDevice.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        AUTH_CHAR_UUID,
        buf.toString("base64")
      );

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Lecture stats (nécessaire pour valider l'auth côté ESP32)
      await currentDevice.readCharacteristicForService(SERVICE_UUID, STATS_CHAR_UUID);

      // Lecture historique initial
      const hChar = await currentDevice.readCharacteristicForService(
        SERVICE_UUID,
        HISTORY_CHAR_UUID
      );
      const hBytes = Buffer.from(hChar.value ?? "", "base64");
      const hCount = hBytes[0];
      const defaultHistory = Array.from({ length: hCount }, (_, i) => hBytes[1 + i]);

      // Lecture état verrou initial
      const lockChar = await currentDevice.readCharacteristicForService(
        SERVICE_UUID,
        LOCK_CHAR_UUID
      );
      const initialLockState = Buffer.from(lockChar.value ?? "", "base64")[0] === 0;

      // ── Abonnement aux notifications de résultat ────────────────────────
      subscription.current = currentDevice.monitorCharacteristicForService(
        SERVICE_UUID,
        RESULT_CHAR_UUID,
        (e, characteristic) => {
          if (e || !characteristic?.value) return;

          const bytes = Buffer.from(characteristic.value, "base64");

          // Normalise le quartier reçu selon le nombre total de cases
          const rawQuarter = bytes.readUInt8(0);
          const { totalCases, ledsPerCase } = wheelConfig;
          const quarter =
            totalCases > 0 ? rawQuarter % totalCases : rawQuarter;

          if (ledsPerCase === 0) {
            // ── Roue sans LEDs (WHEEL_12_SIMPLE) ────────────────────────
            // Applique le décalage anti-rouge si lancer aléatoire
            const finalQuarter = resolveQuarterForSimpleWheel(
              quarter,
              isLaunchedTarget.current
            );

            if (finalQuarter !== quarter) {
              console.log(
                `[RÈGLE ROUGE] Quartier ${quarter + 1} → décalage vers ${
                  finalQuarter + 1
                }`
              );
            }

            // Réinitialise le flag pour le prochain lancer
            isLaunchedTarget.current = false;

            setState((s) => ({
              ...s,
              isSpinning: true,
              pendingCounter: finalQuarter,
              targetLedIndexGlobal: null,
              isLocked: true,
            }));
          } else {
            // ── Roue avec LEDs (WHEEL_12_LEDS / WHEEL_20_LEDS) ──────────
            setState((s) => {
              const chosenLed = pickLedForQuarter(quarter, s.targetLedIndexGlobal);
              return {
                ...s,
                isSpinning: true,
                pendingCounter: quarter,
                targetLedIndexGlobal: chosenLed,
                isLocked: true,
              };
            });
          }

          setTimeout(() => {
            refreshLock();
          }, 1000);
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
      } catch (_) {}

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

  // ─────────────────────────────────────────────
  //  CONNEXION / DÉCONNEXION
  // ─────────────────────────────────────────────

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
    }));
  };

  const forgetDevice = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY_LAST_DEVICE).catch(() => {});
    await AsyncStorage.removeItem(STORAGE_KEY_LAST_PIN).catch(() => {});
  };

  // ─────────────────────────────────────────────
  //  ACTIONS SUR LA ROUE
  // ─────────────────────────────────────────────

  /**
   * Envoie un ordre de spin à l'ESP32.
   *
   * @param targetIndex  Quartier cible (0-based). Absent = spin aléatoire (0xFF).
   *
   * Pour les roues sans LEDs, un spin ciblé désactive la règle anti-rouge.
   * Pour les roues avec LEDs, vous pouvez pré-définir une LED cible en
   * passant `ledTarget` avant d'appeler spinWheel via `setTargetLed`.
   */
  const spinWheel = async (targetIndex?: number): Promise<boolean> => {
    const currentDevice = stateRef.current.device;
    if (!currentDevice || stateRef.current.status !== "authenticated") {
      setState((s) => ({
        ...s,
        error: "Action impossible : Authentification requise.",
      }));
      return false;
    }

    // Marque si le spin est ciblé (désactive la règle anti-rouge pour WHEEL_12_SIMPLE)
    isLaunchedTarget.current = targetIndex !== undefined;

    try {
      const byteValue = targetIndex !== undefined ? targetIndex : 0xff;
      await currentDevice.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        SPIN_CHAR_UUID,
        Buffer.from([byteValue]).toString("base64")
      );
      return true;
    } catch (e: any) {
      console.error("Erreur lors de l'envoi de la commande SPIN :", e);
      setState((s) => ({ ...s, error: "Échec de l'envoi de l'ordre à la roue." }));
      return false;
    }
  };

  /**
   * Pré-définit la LED cible pour le prochain spin (roues avec LEDs uniquement).
   * À appeler avant spinWheel() si vous souhaitez forcer une LED précise.
   *
   * @param ledIndex  Index global de la LED (0-based)
   */
  const setTargetLed = (ledIndex: number | null) => {
    setState((s) => ({ ...s, targetLedIndexGlobal: ledIndex }));
  };

  /**
   * Doit être appelée par le composant d'animation une fois l'animation terminée.
   * Valide le résultat et met à jour l'historique.
   */
  const endWheelAnimation = () => {
    setState((s) => {
      let newHistory =
        s.pendingCounter !== null
          ? [...s.history, s.pendingCounter]
          : s.history;
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

  // ─────────────────────────────────────────────
  //  GESTION DES VERROUS
  // ─────────────────────────────────────────────

  const refreshLock = async (): Promise<boolean> => {
    const currentDevice = stateRef.current.device;
    if (!currentDevice || stateRef.current.status !== "authenticated") return true;
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
      await currentDevice.writeCharacteristicWithResponseForService(
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

  // ─────────────────────────────────────────────
  //  LECTURE BLE GÉNÉRIQUE
  // ─────────────────────────────────────────────

  const retrieveHistory = async (): Promise<number[]> => {
    const currentDevice = stateRef.current.device;
    if (!currentDevice || stateRef.current.status !== "authenticated") return [];
    try {
      const c = await currentDevice.readCharacteristicForService(
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
      return stateRef.current.history;
    }
  };

  const readCharacteristic = async (
    characteristicUuid: string
  ): Promise<string | null> => {
    const currentDevice = stateRef.current.device;
    if (!currentDevice || stateRef.current.status !== "authenticated") return null;
    try {
      const characteristic = await currentDevice.readCharacteristicForService(
        SERVICE_UUID,
        characteristicUuid
      );
      return characteristic.value;
    } catch (e) {
      console.error("Erreur lors de la lecture BLE :", e);
      return null;
    }
  };

  // ─────────────────────────────────────────────
  //  API PUBLIQUE
  // ─────────────────────────────────────────────
  return {
    state,
    wheelConfig,
    scanAndConnect,
    disconnect,
    forgetDevice,
    sendPin,
    spinWheel,
    setTargetLed,
    readCharacteristic,
    retrieveHistory,
    unlock,
    lock,
    refreshLock,
    endWheelAnimation,
    STATS_CHAR_UUID,
    INFO_CHAR_UUID,
  };
}