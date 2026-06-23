import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Animated,
  Easing,
} from "react-native";
import { useBleGlobal } from "../BLE_CONTEXT/CONTEXT_12cases";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
    { id: 0, label: "Lot 1", couleur: "#02b801", valeur: 1 },
    { id: 1, label: "Gros Lot", couleur: "#ff0000", valeur: 1 },
    { id: 2, label: "Lot 3", couleur: "#e6b6ff", valeur: 1 },
    { id: 3, label: "Lot 4", couleur: "#a137d1", valeur: 1 },
    { id: 4, label: "Gros Lot", couleur: "#ff0000", valeur: 1 },
    { id: 5, label: "Lot 6", couleur: "#ebff00", valeur: 1 },
    { id: 6, label: "Lot 7", couleur: "#ffcc00", valeur: 1 },
    { id: 7, label: "Gros Lot", couleur: "#ff0000", valeur: 1 },
    { id: 8, label: "Lot 9", couleur: "#1a99ea", valeur: 1 },
    { id: 9, label: "Lot 10", couleur: "#27e9ff", valeur: 1 },
    { id: 10, label: "Gros Lot", couleur: "#ff0000", valeur: 1 },
    { id: 11, label: "Lot 12", couleur: "#87ea71", valeur: 1 },
  ];

  const nbQuarters = myQuarters.length;
  const anglePerQuarter = 360 / nbQuarters;
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const lastIndexRef = useRef<number | null>(null);
  const [winningPrize, setWinningPrize] = useState<string | null>(null);

  const insets = useSafeAreaInsets();

  const WheelSize = responsive.number(320);

  const manageClickTurn = (index?: number) => {
    setWinningPrize(null);
    spinWheel(index);
  };

  const manageClickLock = async () => {
    if (state.isLocked) {
      await unlock();
    } else {
      await lock();
    }
  };

  useEffect(() => {
    if (state.status === "authenticated") {
      retrieveHistory();
    }
  }, [state.status]);

  useEffect(() => {
    if (
      state.isSpinning &&
      state.pendingCounter !== null &&
      state.pendingCounter >= 0 &&
      state.pendingCounter < nbQuarters
    ) {
      const currentTarget = state.pendingCounter;
      const bonusRound = 360 * 4;
      const centerGap = anglePerQuarter / 2;
      const targetAngle =
        bonusRound - currentTarget * anglePerQuarter - centerGap;

      if (lastIndexRef.current !== null) {
        const anglePrecedentStatique =
          -(lastIndexRef.current * anglePerQuarter) - centerGap;
        rotationAnim.setValue(anglePrecedentStatique);
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
        if (myQuarters[currentTarget]) {
          setWinningPrize(myQuarters[currentTarget].label);
        }
        endWheelAnimation();
      });
    }
  }, [state.isSpinning, state.pendingCounter]);

  const rotationInterpolee = rotationAnim.interpolate({
    inputRange: [-360, 2000],
    outputRange: ["-360deg", "2000deg"],
  });

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
          <Text style={{ fontSize: responsive.fontSize(20), fontWeight: "bold" }}>
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
            transform: [{ rotate: rotationInterpolee }],
          }}
        >
          <Roue donnees={myQuarters} taille={WheelSize} />
        </Animated.View>

        {/* Grille de boutons numérotés - flexWrap pour passer à la ligne si manque de place */}
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