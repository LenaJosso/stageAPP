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
import { useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';
import { Roue } from "../Roue";
import Triangle from "../Triangle";
import { globalStyles } from "../globalStyles";

export default function CommandeScreen(): React.JSX.Element {
  const {
    state,
    tournerRoue,
    unlock,
    lock,
    finAnimationRoue,
    recupererHistorique,
  } = useBleGlobal();

  const estDesactive = state.status !== "authenticated";

  const mesQuartiers = [
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

  const nbQuartiers = mesQuartiers.length;
  const angleParQuartier = 360 / nbQuartiers;
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const dernierIndexRef = useRef<number | null>(null);
  const [lotGagnant, setLotGagnant] = useState<string | null>(null);

  const insets = useSafeAreaInsets();

  const gererClicTourner = (index?: number) => {
    setLotGagnant(null);
    tournerRoue(index);
  };

  const gererClicLock = async () => {
    if (state.isLocked) {
      await unlock();
    } else {
      await lock();
    }
  };

  useEffect(() => {
    //
    if (state.status === "authenticated") {
      recupererHistorique();
    }
  }, [state.status]);

  useEffect(() => {
    if (
      state.isSpinning &&
      state.pendingCounter !== null &&
      state.pendingCounter >= 0 &&
      state.pendingCounter < nbQuartiers
    ) {
      const cibleActuelle = state.pendingCounter;
      const toursBonus = 360 * 4;
      const decalageCentre = angleParQuartier / 2;
      const angleCible =
        toursBonus - cibleActuelle * angleParQuartier - decalageCentre;

      if (dernierIndexRef.current !== null) {
        const anglePrecedentStatique =
          -(dernierIndexRef.current * angleParQuartier) - decalageCentre;
        rotationAnim.setValue(anglePrecedentStatique);
      } else {
        rotationAnim.setValue(0);
      }

      dernierIndexRef.current = cibleActuelle;

      Animated.timing(rotationAnim, {
        toValue: angleCible,
        duration: 3500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        if (mesQuartiers[cibleActuelle]) {
          setLotGagnant(mesQuartiers[cibleActuelle].label);
        }
        finAnimationRoue();
      });
    }
  }, [state.isSpinning, state.pendingCounter]);

  const rotationInterpolee = rotationAnim.interpolate({
    inputRange: [-360, 2000],
    outputRange: ["-360deg", "2000deg"],
  });

  return (
    <View style={globalStyles.mainContainer}>
      <View style={globalStyles.rightContainer}>
        {estDesactive && (
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
          <Text style={{ fontSize: 20, fontWeight: "bold" }}>
            {lotGagnant ? `Résultat : ${lotGagnant}` : "Résultat : "}
          </Text>
        </View>

        <View style={{ marginBottom: 5 }}>
          <Triangle />
        </View>

        <Animated.View
          style={{
            marginBottom: 20,
            opacity: estDesactive ? 0.5 : 1,
            transform: [{ rotate: rotationInterpolee }],
          }}
        >
          <Roue donnees={mesQuartiers} taille={320} />
        </Animated.View>

        {/* Grilles de boutons */}
        {[
          [0, 1, 2, 3],
          [4, 5, 6, 7],
          [8, 9, 10, 11],
        ].map((row, rIdx) => (
          <View
            key={rIdx}
            style={[
              globalStyles.rowButtons,
              { opacity: estDesactive ? 0.5 : 1 },
            ]}
          >
            {row.map((idx) => (
              <Pressable
                key={idx}
                disabled={estDesactive}
                style={[
                  globalStyles.btnCommande,
                  { backgroundColor: mesQuartiers[idx].couleur },
                ]}
                onPress={() => gererClicTourner(idx)}
              >
                <Text style={globalStyles.btnText}>{idx + 1}</Text>
              </Pressable>
            ))}
          </View>
        ))}

        <View
          style={[
            globalStyles.rowActionGrid,
            { opacity: estDesactive ? 0.5 : 1 },
          ]}
        >
          <Pressable
            disabled={estDesactive}
            style={globalStyles.btnSpin}
            onPress={() => gererClicTourner()}
          >
            <Text style={globalStyles.btnText}>SPIN</Text>
          </Pressable>

          <Pressable
            disabled={estDesactive}
            style={[
              globalStyles.btnSpin,
              !state.isLocked && { backgroundColor: "#16a34a" },
            ]}
            onPress={gererClicLock}
          >
            <Text style={[globalStyles.btnText, { textAlign: "center" }]}>
              {state.isLocked ? "Déverrouiller" : "Verrouiller"}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Barre d'historique latérale */}
      <SafeAreaProvider style={[
              globalStyles.customSidebar, // Tu peux garder ton style de base (pour la couleur du fond par exemple)
              {flex: 0.1, paddingBottom: insets.bottom}
            ]}>
        <Text style={globalStyles.sidebarTitle}>Historique (ESP32)</Text>
        <ScrollView horizontal={true} contentContainerStyle={globalStyles.sidebarScroll}>
          {state.history.map((idLot, index) => {
            const quartier = mesQuartiers.find((q) => q.id === idLot);
            return (
              <View key={index} style={globalStyles.historyItem}>
                <Text style={globalStyles.historyIndex}>{index + 1}.</Text>
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: quartier?.couleur || "#ccc",
                    marginRight: 8,
                    alignSelf: "center",
                  }}
                />
                <Text style={globalStyles.historyText}>
                  {quartier ? quartier.label : `Lot Inconnu (${idLot})`}
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
      </SafeAreaProvider>
    </View>
  );
}
