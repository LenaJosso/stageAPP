import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Animated,
  Easing,
} from "react-native";
import { useBleGlobal } from "../BLE_CONTEXT/CONTEXT_12cases_noir";
import { Roue } from "../Roue";
import Triangle from "../Triangle";
import { globalStyles } from "../globalStyles";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from "../responsive";

export default function CommandeScreen(): React.JSX.Element {
  const {
    state,
    spinWheel,
    unlock,
    lock,
    endWheelAnimation,
    retrieveHistory,
  } = useBleGlobal();

  const isDisasbled = state.status !== "authenticated";

  const responsive = useResponsive();

  const myQuarters = [
    { id: 0, label: "Lot 1", couleur: "#02b801", valeur: 1 },
    { id: 1, label: "Lot 2", couleur: "#ff0000", valeur: 1 },
    { id: 2, label: "Lot 3", couleur: "#e6b6ff", valeur: 1 },
    { id: 3, label: "Lot 4", couleur: "#a137d1", valeur: 1 },
    { id: 4, label: "Lot 5", couleur: "#ff0000", valeur: 1 },
    { id: 5, label: "Lot 6", couleur: "#ebff00", valeur: 1 },
    { id: 6, label: "Lot 7", couleur: "#ffcc00", valeur: 1 },
    { id: 7, label: "Lot 8", couleur: "#ff0000", valeur: 1 },
    { id: 8, label: "Lot 9", couleur: "#1a99ea", valeur: 1 },
    { id: 9, label: "Lot 10", couleur: "#27e9ff", valeur: 1 },
    { id: 10, label: "Lot 11", couleur: "#ff0000", valeur: 1 },
    { id: 11, label: "Lot 12", couleur: "#87ea71", valeur: 1 },
  ];

  const insets = useSafeAreaInsets();

  const WheelSize = responsive.number(320);
  const LedRadius = responsive.number(150);
  const nbQuarter = myQuarters.length;
  const anglePerQuarter = 360 / nbQuarter;

  const rotationAnim = useRef(new Animated.Value(0)).current;
  const lastIndexRef = useRef<number | null>(null);

  const targetLedRef = useRef<number | null>(null);

  const [winningPrize, setWinningPrize] = useState<string | null>(null);
  const [isJackpot, setJackpot] = useState(false);
  const [isBankrupt, setIsBankrupt] = useState(false);

  const redLedList = [5, 6, 17, 18, 29, 30, 41, 42];
  const bankruptLedList = [4, 7, 16, 19, 28, 31, 40, 43];

  const manageClickTurn = (indexQuartier?: number) => {
    setWinningPrize(null);

    if (indexQuartier !== undefined) {
      const internalLed = Math.floor(Math.random() * 4);
      const globalLed = indexQuartier * 4 + internalLed;

      targetLedRef.current = globalLed;

      if (state.targetLedIndexGlobal !== undefined) {
        state.targetLedIndexGlobal = globalLed;
      }
      spinWheel(indexQuartier);
    } else {
      const allLed = Array.from(
        { length: nbQuarter * 4 },
        (_, i) => i
      );
      const ledsAllowed = allLed.filter(
        (led) => !redLedList.includes(led)
      );

      const globalLedChosen =
        ledsAllowed[Math.floor(Math.random() * ledsAllowed.length)];
      const qIdx = Math.floor(globalLedChosen / 4);

      targetLedRef.current = globalLedChosen;

      if (state.targetLedIndexGlobal !== undefined) {
        state.targetLedIndexGlobal = globalLedChosen;
      }
      spinWheel(qIdx);
    }
  };

  const manageClickLock = async () => {
    if (state.isLocked) await unlock();
    else await lock();
  };

  const manageJackpot = () => {
    if (isDisasbled || state.isSpinning || isJackpot || isBankrupt) return;
    setWinningPrize(null);
    setJackpot(true);

    const ledJackpot =
      redLedList[Math.floor(Math.random() * redLedList.length)];
    const qIdx = Math.floor(ledJackpot / 4);

    targetLedRef.current = ledJackpot;

    if (state.targetLedIndexGlobal !== undefined) {
      state.targetLedIndexGlobal = ledJackpot;
    }
    spinWheel(qIdx);
  };

  const manageBankrupt = () => {
    if (isDisasbled || state.isSpinning || isJackpot || isBankrupt) return;
    setWinningPrize(null);
    setIsBankrupt(true);

    const blackLedChosen =
      bankruptLedList[Math.floor(Math.random() * bankruptLedList.length)];
    const qIdx = Math.floor(blackLedChosen / 4);

    targetLedRef.current = blackLedChosen;

    if (state.targetLedIndexGlobal !== undefined) {
      state.targetLedIndexGlobal = blackLedChosen;
    }
    spinWheel(qIdx);
  };

  useEffect(() => {
    if (state.status === "authenticated") retrieveHistory();
  }, [state.status]);

  useEffect(() => {
    if (
      state.isSpinning &&
      state.pendingCounter !== null &&
      state.pendingCounter >= 0 &&
      state.pendingCounter < nbQuarter
    ) {
      const currentTarget = state.pendingCounter;
      const bonusRound = 360 * 4;

      const ledToAim =
        targetLedRef.current !== null
          ? targetLedRef.current
          : state.targetLedIndexGlobal;

      let targetLedAngle = 0;
      if (
        ledToAim !== null &&
        ledToAim !== undefined &&
        Math.floor(ledToAim / 4) === currentTarget
      ) {
        const ledIdx = ledToAim % 4;
        const spacingLed = anglePerQuarter / 5;
        targetLedAngle =
          currentTarget* anglePerQuarter + (ledIdx + 1) * spacingLed;
      } else {
        targetLedAngle = currentTarget * anglePerQuarter + anglePerQuarter / 2;
      }

      const targetAngle = bonusRound - targetLedAngle;

      if (lastIndexRef.current !== null) {
        const currentValue =
          (rotationAnim as any)._value !== undefined
            ? (rotationAnim as any)._value
            : 0;

        const previousStaticAngle = currentValue % 360;
        rotationAnim.setValue(previousStaticAngle);
      } else {
        rotationAnim.setValue(0);
      }

      lastIndexRef.current = currentTarget;

      Animated.timing(rotationAnim, {
        toValue: targetAngle,
        duration: 3500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        const finalLed =
          targetLedRef.current !== null
            ? targetLedRef.current
            : state.targetLedIndexGlobal;

        if (
          finalLed !== null &&
          finalLed !== undefined &&
          bankruptLedList.includes(finalLed)
        ) {
          setWinningPrize("BANKRUPT");
        } else if (
          finalLed !== null &&
          finalLed!== undefined &&
          redLedList.includes(finalLed)
        ) {
          setWinningPrize("Gros Lot");
        } else if (myQuarters[currentTarget]) {
          setWinningPrize(myQuarters[currentTarget].label);
        }

        endWheelAnimation();
        setJackpot(false);
        setIsBankrupt(false);
        targetLedRef.current = null;
      });
    }
  }, [state.isSpinning, state.pendingCounter, state.targetLedIndexGlobal]);

  const interpoledRotation = rotationAnim.interpolate({
    inputRange: [-360, 10000],
    outputRange: ["-360deg", "10000deg"],
  });

  const displayInRed =
    winningPrize === "Gros Lot" || winningPrize === "BANKRUPT";

  return (
    <View style={[globalStyles.mainContainer, { flex: 1, flexDirection: "column", justifyContent: "space-between" }]}>
      <View style={[globalStyles.rightContainer, { padding: responsive.number(16) }]}>
        {isDisasbled && (
          <Text
            style={[
              globalStyles.error,
              { marginBottom: 15, textAlign: "center" },
            ]}
          >
            Connectez-vous et authentifiez-vous en Bluetooth pour piloter la
            roue.
          </Text>
        )}

        <View style={{ marginBottom: 5 }}>
          <Text
            style={{
              fontSize: responsive.fontSize(20),
              fontWeight: "bold",
              color: displayInRed ? "#dc2626" : "#000",
            }}
          >
            {winningPrize ? `Résultat : ${winningPrize}` : "Résultat : "}
          </Text>
        </View>

        <View style={{ marginBottom: 5 }}>
          <Triangle />
        </View>

        <Animated.View
          style={{
            marginBottom: responsive.number(30),
            opacity: isDisasbled ? 0.5 : 1,
            transform: [{ rotate: interpoledRotation }],
            width: WheelSize,
            height: WheelSize,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Roue donnees={myQuarters} taille={WheelSize} />

          {myQuarters.map((quartier, qIdx) => {
            const defaultAngleQuarter = qIdx * anglePerQuarter;
            return [0, 1, 2, 3].map((ledIdx) => {
              const spacingLed = anglePerQuarter / 5;
              const angleLed = defaultAngleQuarter + (ledIdx + 1) * spacingLed;
              const globalIndex = qIdx * 4 + ledIdx;

              const isRedJackpot = redLedList.includes(globalIndex);
              const isBlackBankrupt = bankruptLedList.includes(globalIndex);

              let ledColor = "#a3a3a3";
              if (isRedJackpot) ledColor = "#AB1616";
              if (isBlackBankrupt) ledColor = "#000000";

              return (
                <View
                  key={`${qIdx}-${ledIdx}`}
                  style={[
                    globalStyles.ledContainer,
                    {
                      transform: [
                        { rotate: `${angleLed}deg` },
                        { translateY: -LedRadius },
                      ],
                    },
                  ]}
                >
                  <View
                    style={[
                      globalStyles.led,
                      {
                        backgroundColor: ledColor,
                      },
                    ]}
                  />
                </View>
              );
            });
          })}
        </Animated.View>

        {/* Grilles de boutons par quartier - flexWrap pour passer à la ligne si manque de place */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            opacity: isDisasbled ? 0.5 : 1,
            gap: responsive.number(8),
            marginBottom: responsive.number(10),
          }}
        >
          {myQuarters.map((quartier, idx) => (
            <Pressable
              key={idx}
              disabled={isDisasbled}
              style={[
                globalStyles.btnCommande,
                { backgroundColor: quartier.couleur },
              ]}
              onPress={() => manageClickTurn(idx)}
            >
              <Text style={globalStyles.btnText}>{idx + 1}</Text>
            </Pressable>
          ))}
        </View>

        {/* Boutons d'action - flexWrap pour passer à la ligne si manque de place */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            opacity: isDisasbled ? 0.5 : 1,
            gap: responsive.number(8),
          }}
        >
          <Pressable
            disabled={isDisasbled}
            style={globalStyles.btnSpin}
            onPress={() => manageClickTurn()}
          >
            <Text style={globalStyles.btnText}>SPIN</Text>
          </Pressable>
          <Pressable
            disabled={isDisasbled}
            style={[
              globalStyles.btnSpin,
              !state.isLocked && { backgroundColor: "#16a34a" },
            ]}
            onPress={manageClickLock}
          >
            <Text style={[globalStyles.btnText, { textAlign: "center" }]}>
              {state.isLocked ? "Déverrouiller" : "Verrouiller"}
            </Text>
          </Pressable>

          {/* BOUTON BANKRUPT */}
          <Pressable
            disabled={
              isDisasbled || state.isSpinning || isJackpot || isBankrupt
            }
            style={[
              globalStyles.btnSpin,
              {
                backgroundColor: "#1a1a1a",
                borderWidth: 2,
                borderColor: "#000000",
                opacity:
                  isDisasbled || state.isSpinning || isJackpot || isBankrupt
                    ? 0.4
                    : 1,
              },
            ]}
            onPress={manageBankrupt}
          >
            <Text
              style={[
                globalStyles.btnText,
                { color: "#ffffff", textAlign: "center", fontWeight: "bold" },
              ]}
            >
              BANKRUPT
            </Text>
          </Pressable>

          {/* BOUTON GROS LOT */}
          <Pressable
            disabled={
             isDisasbled || state.isSpinning || isJackpot || isBankrupt
            }
            style={[
              globalStyles.btnSpin,
              {
                backgroundColor: "#1a1a1a",
                borderWidth: 2,
                borderColor: "#dc2626",
                opacity:
                  isDisasbled || state.isSpinning || isJackpot || isBankrupt
                    ? 0.4
                    : 1,
              },
            ]}
            onPress={manageJackpot}
          >
            <Text
              style={[
                globalStyles.btnText,
                { color: "#dc2626", textAlign: "center", fontWeight: "bold" },
              ]}
            >
              Gros Lot
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Barre d'historique latérale */}
      <View style={[
        globalStyles.customSidebar,
        { flex: 0.1, paddingBottom: insets.bottom }
      ]}>
        <Text style={globalStyles.sidebarTitle}>Historique (ESP32)</Text>
        <ScrollView horizontal={true} contentContainerStyle={globalStyles.sidebarScroll}>
          {state.history.map((idLot, index) => {
            const quarter = myQuarters.find((q) => q.id === idLot);
            return (
              <View key={index} style={globalStyles.historyItem}>
                <Text style={globalStyles.historyIndex}>{index + 1}.</Text>
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: quarter?.couleur || "#ccc",
                    marginRight: 8,
                    alignSelf: "center",
                  }}
                />
                <Text style={globalStyles.historyText}>
                  {quarter ? quarter.label : `Lot Inconnu (${idLot})`}
                </Text>
              </View>
            );
          })}

          {state.history.length === 0 && (
            <Text style={globalStyles.emptyHistory}>
              Aucun tirage dans l'historique
            </Text>
          )}
        </ScrollView>
      </View>
    </View>
  );
}