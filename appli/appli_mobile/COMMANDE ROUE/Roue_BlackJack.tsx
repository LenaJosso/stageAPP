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
    { id: "B", label: "Bonus", couleur: "#e5e510", valeur: 1 }, // Index 0
    { id: 32, label: "32", couleur: "#ba171c", valeur: 1 },
    { id: 15, label: "15", couleur: "#010102", valeur: 1 },
    { id: 28, label: "28", couleur: "#ba171c", valeur: 1 },
    { id: 4, label: "4", couleur: "#010102", valeur: 1 },
    { id: 21, label: "21", couleur: "#ba171c", valeur: 1 },
    { id: 9, label: "9", couleur: "#010102", valeur: 1 },
    { id: 25, label: "25", couleur: "#ba171c", valeur: 1 },
    { id: 17, label: "17", couleur: "#010102", valeur: 1 },
    { id: 27, label: "27", couleur: "#ba171c", valeur: 1 },
    { id: 13, label: "13", couleur: "#010102", valeur: 1 },
    { id: 30, label: "30", couleur: "#ba171c", valeur: 1 },
    { id: 8, label: "8", couleur: "#010102", valeur: 1 },
    { id: 23, label: "23", couleur: "#ba171c", valeur: 1 },
    { id: 10, label: "10", couleur: "#010102", valeur: 1 },
    { id: 5, label: "5", couleur: "#ba171c", valeur: 1 },
    { id: 24, label: "24", couleur: "#010102", valeur: 1 },
    { id: 0, label: "0", couleur: "#6abd45", valeur: 1 },
    { id: 16, label: "16", couleur: "#ba171c", valeur: 1 },
    { id: 11, label: "11", couleur: "#010102", valeur: 1 },
    { id: 1, label: "1", couleur: "#ba171c", valeur: 1 },
    { id: 20, label: "20", couleur: "#010102", valeur: 1 },
    { id: 14, label: "14", couleur: "#ba171c", valeur: 1 },
    { id: 31, label: "31", couleur: "#010102", valeur: 1 },
    { id: 2, label: "2", couleur: "#ba171c", valeur: 1 },
    { id: 22, label: "22", couleur: "#010102", valeur: 1 },
    { id: 18, label: "18", couleur: "#ba171c", valeur: 1 },
    { id: 29, label: "29", couleur: "#010102", valeur: 1 },
    { id: 7, label: "7", couleur: "#ba171c", valeur: 1 },
    { id: 19, label: "19", couleur: "#010102", valeur: 1 },
    { id: 12, label: "12", couleur: "#ba171c", valeur: 1 },
    { id: 6, label: "6", couleur: "#010102", valeur: 1 },
    { id: 3, label: "3", couleur: "#ba171c", valeur: 1 },
    { id: 26, label: "26", couleur: "#010102", valeur: 1 },
  ];

  const nbQuartiers = mesQuartiers.length;
  const angleParQuartier = 360 / nbQuartiers;
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const dernierIndexRef = useRef<number | null>(null);
  const [lotGagnant, setLotGagnant] = useState<string | null>(null);

  // Fonction spécifique pour le bouton Bonus (cible uniquement l'index 0)
  const gererClicBonus = () => {
    setLotGagnant(null);
    tournerRoue(0);
  };

  // Modifié pour exclure le Bonus (index 0) lors d'un SPIN aléatoire
  const gererClicTourner = (index?: number) => {
    setLotGagnant(null);

    if (index !== undefined) {
      tournerRoue(index);
    } else {
      // Génère un index aléatoire entre 1 et (nbQuartiers - 1) pour exclure le bonus
      const indexAleatoireSansBonus =
        Math.floor(Math.random() * (nbQuartiers - 1)) + 1;
      tournerRoue(indexAleatoireSansBonus);
    }
  };

  const gererClicLock = async () => {
    if (state.isLocked) {
      await unlock();
    } else {
      await lock();
    }
  };

  useEffect(() => {
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
      <View style={globalStyles.leftContainer}>
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
          ["B", 32, 15, 28, 4, 21],
          [9, 25, 17, 27, 13, 30],
          [8, 23, 10, 5, 24, 0],
          [16, 11, 1, 20, 14, 31],
          [2, 22, 18, 29, 7, 19],
          [12, 6, 3, 26],
        ].map((row, rIdx) => (
          <View
            key={rIdx}
            style={[
              globalStyles.rowButtons,
              { opacity: estDesactive ? 0.5 : 1 },
            ]}
          >
            {row.map((idDuQuartier) => {
              const quartier = mesQuartiers.find((q) => q.id === idDuQuartier);

              return (
                <Pressable
                  key={idDuQuartier}
                  disabled={estDesactive}
                  style={[
                    globalStyles.btnCommande,
                    { backgroundColor: quartier?.couleur || "#ccc" },
                  ]}
                  // S'il s'agit du bouton Bonus "B", on appelle gererClicBonus, sinon comportement normal
                  onPress={() =>
                    idDuQuartier === "B"
                      ? gererClicBonus()
                      : gererClicTourner(mesQuartiers.indexOf(quartier!))
                  }
                >
                  <Text style={globalStyles.btnText}>{idDuQuartier}</Text>
                </Pressable>
              );
            })}
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
            onPress={() => gererClicTourner()} // Appelle l'aléatoire sans le bonus
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
      <View style={globalStyles.sidebar}>
        <Text style={globalStyles.sidebarTitle}>Historique (ESP32)</Text>
        <ScrollView contentContainerStyle={globalStyles.sidebarScroll}>
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
      </View>
    </View>
  );
}
