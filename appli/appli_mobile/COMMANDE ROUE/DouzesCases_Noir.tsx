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

  const TAILLE_ROUE = 320;
  const RAYON_LEDS = 150;
  const nbQuartiers = mesQuartiers.length;
  const angleParQuartier = 360 / nbQuartiers;

  const rotationAnim = useRef(new Animated.Value(0)).current;
  const dernierIndexRef = useRef<number | null>(null);

  // AJOUT : Référence pour mémoriser la LED ciblée localement dès le clic
  const ledCibleLocaleRef = useRef<number | null>(null);

  const [lotGagnant, setLotGagnant] = useState<string | null>(null);
  const [isGrosLot, setGrosLot] = useState(false);
  const [isBankrupt, setIsBankrupt] = useState(false);

  // Les 8 leds des gros lots (Leds 1 et 2 internes des quartiers rouges)
  const listeLedsRouges = [5, 6, 17, 18, 29, 30, 41, 42];

  // Les 8 leds des Bankrupts (Leds 0 et 3 internes des quartiers rouges)
  const listeLedsBankrupt = [4, 7, 16, 19, 28, 31, 40, 43];

  const gererClicTourner = (indexQuartier?: number) => {
    setLotGagnant(null);

    if (indexQuartier !== undefined) {
      // Clic sur un bouton de couleur
      const ledInterne = Math.floor(Math.random() * 4);
      const ledGlobale = indexQuartier * 4 + ledInterne;

      ledCibleLocaleRef.current = ledGlobale; // <-- Sauvegarde locale

      if (state.targetLedIndexGlobal !== undefined) {
        state.targetLedIndexGlobal = ledGlobale;
      }
      tournerRoue(indexQuartier);
    } else {
      // Clic sur SPIN (Aléatoire complet SAUF les 8 leds rouges des gros lots)
      const toutesLesLeds = Array.from(
        { length: nbQuartiers * 4 },
        (_, i) => i
      );
      const ledsAutorisees = toutesLesLeds.filter(
        (led) => !listeLedsRouges.includes(led)
      );

      const ledGlobaleChoisie =
        ledsAutorisees[Math.floor(Math.random() * ledsAutorisees.length)];
      const qIdx = Math.floor(ledGlobaleChoisie / 4);

      ledCibleLocaleRef.current = ledGlobaleChoisie; // <-- Sauvegarde locale

      if (state.targetLedIndexGlobal !== undefined) {
        state.targetLedIndexGlobal = ledGlobaleChoisie;
      }
      tournerRoue(qIdx);
    }
  };

  const gererClicLock = async () => {
    if (state.isLocked) await unlock();
    else await lock();
  };

  const gererGrosLot = () => {
    if (estDesactive || state.isSpinning || isGrosLot || isBankrupt) return;
    setLotGagnant(null);
    setGrosLot(true);

    const ledGrosLot =
      listeLedsRouges[Math.floor(Math.random() * listeLedsRouges.length)];
    const qIdx = Math.floor(ledGrosLot / 4);

    ledCibleLocaleRef.current = ledGrosLot; // <-- Sauvegarde locale forcée sur la LED ROUGE

    if (state.targetLedIndexGlobal !== undefined) {
      state.targetLedIndexGlobal = ledGrosLot;
    }
    tournerRoue(qIdx);
  };

  const gererBankrupt = () => {
    if (estDesactive || state.isSpinning || isGrosLot || isBankrupt) return;
    setLotGagnant(null);
    setIsBankrupt(true);

    const ledNoireChoisie =
      listeLedsBankrupt[Math.floor(Math.random() * listeLedsBankrupt.length)];
    const qIdx = Math.floor(ledNoireChoisie / 4);

    ledCibleLocaleRef.current = ledNoireChoisie; // <-- Sauvegarde locale forcée sur la LED NOIRE

    if (state.targetLedIndexGlobal !== undefined) {
      state.targetLedIndexGlobal = ledNoireChoisie;
    }
    tournerRoue(qIdx);
  };

  useEffect(() => {
    if (state.status === "authenticated") recupererHistorique();
  }, [state.status]);

  // GESTION DE L'ANIMATION PRINCIPALE
  useEffect(() => {
    if (
      state.isSpinning &&
      state.pendingCounter !== null &&
      state.pendingCounter >= 0 &&
      state.pendingCounter < nbQuartiers
    ) {
      const cibleActuelle = state.pendingCounter;
      const toursBonus = 360 * 4;

      // On utilise la LED locale en priorité, sinon le state global
      const ledAViser =
        ledCibleLocaleRef.current !== null
          ? ledCibleLocaleRef.current
          : state.targetLedIndexGlobal;

      let angleLedCible = 0;
      if (
        ledAViser !== null &&
        ledAViser !== undefined &&
        Math.floor(ledAViser / 4) === cibleActuelle
      ) {
        const ledIdx = ledAViser % 4;
        const espacementLed = angleParQuartier / 5;
        angleLedCible =
          cibleActuelle * angleParQuartier + (ledIdx + 1) * espacementLed;
      } else {
        // Fallback par défaut (milieu du quartier)
        angleLedCible = cibleActuelle * angleParQuartier + angleParQuartier / 2;
      }

      const angleCible = toursBonus - angleLedCible;

      if (dernierIndexRef.current !== null) {
        const valeurActuelle =
          (rotationAnim as any)._value !== undefined
            ? (rotationAnim as any)._value
            : 0;

        const anglePrecedentStatique = valeurActuelle % 360;
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
        // Détermination précise basée sur la LED finale visée
        const ledFinale =
          ledCibleLocaleRef.current !== null
            ? ledCibleLocaleRef.current
            : state.targetLedIndexGlobal;

        if (
          ledFinale !== null &&
          ledFinale !== undefined &&
          listeLedsBankrupt.includes(ledFinale)
        ) {
          setLotGagnant("BANKRUPT");
        } else if (
          ledFinale !== null &&
          ledFinale !== undefined &&
          listeLedsRouges.includes(ledFinale)
        ) {
          setLotGagnant("Gros Lot");
        } else if (mesQuartiers[cibleActuelle]) {
          setLotGagnant(mesQuartiers[cibleActuelle].label);
        }

        finAnimationRoue();
        setGrosLot(false);
        setIsBankrupt(false);
        ledCibleLocaleRef.current = null; // Reset pour le prochain tour
      });
    }
  }, [state.isSpinning, state.pendingCounter, state.targetLedIndexGlobal]);

  const rotationInterpolee = rotationAnim.interpolate({
    inputRange: [-360, 10000],
    outputRange: ["-360deg", "10000deg"],
  });

  const afficherEnRouge =
    lotGagnant === "Gros Lot" || lotGagnant === "BANKRUPT";

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
          <Text
            style={{
              fontSize: 20,
              fontWeight: "bold",
              color: afficherEnRouge ? "#dc2626" : "#000",
            }}
          >
            {lotGagnant ? `Résultat : ${lotGagnant}` : "Résultat : "}
          </Text>
        </View>

        <View style={{ marginBottom: 5 }}>
          <Triangle />
        </View>

        <Animated.View
          style={{
            marginBottom: 30,
            opacity: estDesactive ? 0.5 : 1,
            transform: [{ rotate: rotationInterpolee }],
            width: TAILLE_ROUE,
            height: TAILLE_ROUE,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Roue donnees={mesQuartiers} taille={TAILLE_ROUE} />

          {mesQuartiers.map((quartier, qIdx) => {
            const angleBaseQuartier = qIdx * angleParQuartier;
            return [0, 1, 2, 3].map((ledIdx) => {
              const espacementLed = angleParQuartier / 5;
              const angleLed = angleBaseQuartier + (ledIdx + 1) * espacementLed;
              const indexGlobal = qIdx * 4 + ledIdx;

              const estRougeGrosLot = listeLedsRouges.includes(indexGlobal);
              const estNoireBankrupt = listeLedsBankrupt.includes(indexGlobal);

              let couleurLed = "#a3a3a3";
              if (estRougeGrosLot) couleurLed = "#AB1616";
              if (estNoireBankrupt) couleurLed = "#000000";

              return (
                <View
                  key={`${qIdx}-${ledIdx}`}
                  style={[
                    globalStyles.ledContainer,
                    {
                      transform: [
                        { rotate: `${angleLed}deg` },
                        { translateY: -RAYON_LEDS },
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

        {/* Grilles de boutons par quartier */}
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

        {/* Boutons d'action */}
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
          {/* BOUTON BANKRUPT */}S
          <Pressable
            disabled={
              estDesactive || state.isSpinning || isGrosLot || isBankrupt
            }
            style={[
              globalStyles.btnSpin,
              {
                backgroundColor: "#1a1a1a",
                borderWidth: 2,
                borderColor: "#000000",
                opacity:
                  estDesactive || state.isSpinning || isGrosLot || isBankrupt
                    ? 0.4
                    : 1,
              },
            ]}
            onPress={gererBankrupt}
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
              estDesactive || state.isSpinning || isGrosLot || isBankrupt
            }
            style={[
              globalStyles.btnSpin,
              {
                backgroundColor: "#1a1a1a",
                borderWidth: 2,
                borderColor: "#dc2626",
                opacity:
                  estDesactive || state.isSpinning || isGrosLot || isBankrupt
                    ? 0.4
                    : 1,
              },
            ]}
            onPress={gererGrosLot}
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
