import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Animated,
  Easing,
} from "react-native";
import { useBleGlobal } from "../BLE_CONTEXT/CONTEXT_20cases_noir";
import { useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';
import { Roue } from "../Roue";
import Triangle from "../Triangle";
import { globalStyles } from "../globalStyles";
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
    { id: 0, label: "1", couleur: "#ed178a", valeur: 1 },
    { id: 1, label: "2", couleur: "#f7ec13", valeur: 1 },
    { id: 2, label: "3", couleur: "#ed1e24", valeur: 1 },
    { id: 3, label: "4", couleur: "#6abd45", valeur: 1 },
    { id: 4, label: "5", couleur: "#76bdd7", valeur: 1 },
    { id: 5, label: "6", couleur: "#ed178a", valeur: 1 },
    { id: 6, label: "7", couleur: "#f7ec13", valeur: 1 },
    { id: 7, label: "8", couleur: "#ed1e24", valeur: 1 },
    { id: 8, label: "9", couleur: "#6abd45", valeur: 1 },
    { id: 9, label: "10", couleur: "#76bdd7", valeur: 1 },
    { id: 10, label: "11", couleur: "#ed178a", valeur: 1 },
    { id: 11, label: "12", couleur: "#f7ec13", valeur: 1 },
    { id: 12, label: "13", couleur: "#ed1e24", valeur: 1 },
    { id: 13, label: "14", couleur: "#6abd45", valeur: 1 },
    { id: 14, label: "15", couleur: "#76bdd7", valeur: 1 },
    { id: 15, label: "16", couleur: "#ed178a", valeur: 1 },
    { id: 16, label: "17", couleur: "#f7ec13", valeur: 1 },
    { id: 17, label: "18", couleur: "#ed1e24", valeur: 1 },
    { id: 18, label: "19", couleur: "#6abd45", valeur: 1 },
    { id: 19, label: "20", couleur: "#76bdd7", valeur: 1 },
  ];


    const insets = useSafeAreaInsets();
    
  const WheelSize = responsive.number(280);
  const LedRadius = responsive.number(130);
  const nbQuarter = myQuarters.length;
  const anglePerQuarter = 360 / nbQuarter;

  const rotationAnim = useRef(new Animated.Value(0)).current;
  const lastIndexRef = useRef<number | null>(null);

  // Référence pour mémoriser la LED ciblée localement dès le clic
  const targetLedRef = useRef<number | null>(null);

  const [winningPrize, setWinningPrize] = useState<string | null>(null);
  const [isJackpot, setJackpot] = useState(false);
  const [isBankrupt, setIsBankrupt] = useState(false);

  const redLedList = [7, 22, 37, 52];
  const bankruptLedList = [6, 8, 21, 23, 36, 38, 51, 53];

  const manageClickTurn = (indexQuartier?: number) => {
    setWinningPrize(null);

    if (indexQuartier !== undefined) {
      // Clic sur un bouton de couleur
      const internalLed = Math.floor(Math.random() * 3);
      const globalLed = indexQuartier * 3 + internalLed;

      targetLedRef.current = globalLed; // <-- Sauvegarde locale

      if (state.targetLedIndexGlobal !== undefined) {
        state.targetLedIndexGlobal = globalLed;
      }
      spinWheel(indexQuartier);
    } else {
      // Clic sur SPIN (Aléatoire complet SAUF les 8 leds rouges des gros lots)
      const allLed = Array.from(
        { length: nbQuarter * 3 },
        (_, i) => i
      );
      const ledsAllowed = allLed.filter(
        (led) => !redLedList.includes(led)
      );

      const globalLedChosen =
        ledsAllowed[Math.floor(Math.random() * ledsAllowed.length)];
      const qIdx = Math.floor(globalLedChosen / 3);

      targetLedRef.current =globalLedChosen; // <-- Sauvegarde locale

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
    if (isDisasbled || state.isSpinning || isJackpot) return;
    setWinningPrize(null);
    setJackpot(true);

    const ledJackpot =
      redLedList[Math.floor(Math.random() * redLedList.length)];
    const qIdx = Math.floor(ledJackpot / 3);

    targetLedRef.current = ledJackpot; // <-- Sauvegarde locale forcée sur la LED ROUGE

    if (state.targetLedIndexGlobal !== undefined) {
      state.targetLedIndexGlobal = ledJackpot;
    }
    spinWheel(qIdx);
  };

  const manageBankrupt = () => {
    if (isDisasbled || state.isSpinning || isBankrupt) return;
    setWinningPrize(null);
    setIsBankrupt(true);

    const blackLedChosen =
      bankruptLedList[Math.floor(Math.random() * bankruptLedList.length)];
    const qIdx = Math.floor(blackLedChosen / 3);

    targetLedRef.current = blackLedChosen; // <-- Sauvegarde locale forcée sur la LED NOIRE

    if (state.targetLedIndexGlobal !== undefined) {
      state.targetLedIndexGlobal = blackLedChosen;
    }
    spinWheel(qIdx);
  };

  useEffect(() => {
    if (state.status === "authenticated") retrieveHistory();
  }, [state.status]);

  // GESTION DE L'ANIMATION PRINCIPALE
  useEffect(() => {
    if (
      state.isSpinning &&
      state.pendingCounter !== null &&
      state.pendingCounter >= 0 &&
      state.pendingCounter < nbQuarter
    ) {
      const currentTarget = state.pendingCounter;
      const bonusRound = 360 * 4;

      // On utilise la LED locale en priorité, sinon le state global
      const ledToAim =
        targetLedRef.current !== null
          ? targetLedRef.current
          : state.targetLedIndexGlobal;

      let targetLedAngle = 0;
      if (
        ledToAim !== null &&
        ledToAim !== undefined &&
        Math.floor(ledToAim / 3) === currentTarget
      ) {
        const ledIdx = ledToAim % 3;
        const spacingLed = anglePerQuarter / 4;
        targetLedAngle =
          currentTarget * anglePerQuarter + (ledIdx + 1) * spacingLed;
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
        // Détermination précise basée sur la LED finale visée
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
          finalLed !== undefined &&
          redLedList.includes(finalLed)
        ) {
          setWinningPrize("Gros Lot");
        } else if (myQuarters[currentTarget]) {
          setWinningPrize(myQuarters[currentTarget].label);
        }

        endWheelAnimation();
        setJackpot(false);
        setIsBankrupt(false);
        targetLedRef.current = null; // Reset pour le prochain tour
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
            return [0, 1, 2].map((ledIdx) => {
              const spacingLed = anglePerQuarter / 4;
              const angleLed = defaultAngleQuarter + (ledIdx + 1) *spacingLed;
              const globalIndex = qIdx * 3 + ledIdx;

              const isRedJackpot = redLedList.includes(globalIndex);
              const isBlackBankrupt = bankruptLedList.includes(globalIndex);

              let couleurLed = "#a3a3a3";
              if (isRedJackpot) couleurLed = "#AB1616";
              if (isBlackBankrupt) couleurLed = "#000000";

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
                        backgroundColor: couleurLed,
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

        {/* Boutons d'action */}
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
