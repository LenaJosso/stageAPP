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
    tournerRoue,
    unlock,
    lock,
    finAnimationRoue,
    recupererHistorique,
  } = useBleGlobal();

  const estDesactive = state.status !== "authenticated";

  const responsive = useResponsive();


  const mesQuartiers = [
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
    
  const TAILLE_ROUE = responsive.number(280);
  const RAYON_LEDS = responsive.number(130);
  const nbQuartiers = mesQuartiers.length;
  const angleParQuartier = 360 / nbQuartiers;

  const rotationAnim = useRef(new Animated.Value(0)).current;
  const dernierIndexRef = useRef<number | null>(null);

  // Référence pour mémoriser la LED ciblée localement dès le clic
  const ledCibleLocaleRef = useRef<number | null>(null);

  const [lotGagnant, setLotGagnant] = useState<string | null>(null);
  const [isGrosLot, setGrosLot] = useState(false);
  const [isBankrupt, setIsBankrupt] = useState(false);

  const listeLedsRouges = [7, 22, 37, 52];
  const listeLedsBankrupt = [6, 8, 21, 23, 36, 38, 51, 53];

  const gererClicTourner = (indexQuartier?: number) => {
    setLotGagnant(null);

    if (indexQuartier !== undefined) {
      // Clic sur un bouton de couleur
      const ledInterne = Math.floor(Math.random() * 3);
      const ledGlobale = indexQuartier * 3 + ledInterne;

      ledCibleLocaleRef.current = ledGlobale; // <-- Sauvegarde locale

      if (state.targetLedIndexGlobal !== undefined) {
        state.targetLedIndexGlobal = ledGlobale;
      }
      tournerRoue(indexQuartier);
    } else {
      // Clic sur SPIN (Aléatoire complet SAUF les 8 leds rouges des gros lots)
      const toutesLesLeds = Array.from(
        { length: nbQuartiers * 3 },
        (_, i) => i
      );
      const ledsAutorisees = toutesLesLeds.filter(
        (led) => !listeLedsRouges.includes(led)
      );

      const ledGlobaleChoisie =
        ledsAutorisees[Math.floor(Math.random() * ledsAutorisees.length)];
      const qIdx = Math.floor(ledGlobaleChoisie / 3);

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
    if (estDesactive || state.isSpinning || isGrosLot) return;
    setLotGagnant(null);
    setGrosLot(true);

    const ledGrosLot =
      listeLedsRouges[Math.floor(Math.random() * listeLedsRouges.length)];
    const qIdx = Math.floor(ledGrosLot / 3);

    ledCibleLocaleRef.current = ledGrosLot; // <-- Sauvegarde locale forcée sur la LED ROUGE

    if (state.targetLedIndexGlobal !== undefined) {
      state.targetLedIndexGlobal = ledGrosLot;
    }
    tournerRoue(qIdx);
  };

  const gererBankrupt = () => {
    if (estDesactive || state.isSpinning || isBankrupt) return;
    setLotGagnant(null);
    setIsBankrupt(true);

    const ledNoireChoisie =
      listeLedsBankrupt[Math.floor(Math.random() * listeLedsBankrupt.length)];
    const qIdx = Math.floor(ledNoireChoisie / 3);

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
        Math.floor(ledAViser / 3) === cibleActuelle
      ) {
        const ledIdx = ledAViser % 3;
        const espacementLed = angleParQuartier / 4;
        angleLedCible =
          cibleActuelle * angleParQuartier + (ledIdx + 1) * espacementLed;
      } else {
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
    <View style={[globalStyles.mainContainer, { flex: 1, flexDirection: "column", justifyContent: "space-between" }]}>
          <View style={[globalStyles.rightContainer, { padding: responsive.number(16) }]}>
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
              fontSize: responsive.fontSize(20),
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
            marginBottom: responsive.number(30),
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
            return [0, 1, 2].map((ledIdx) => {
              const espacementLed = angleParQuartier / 4;
              const angleLed = angleBaseQuartier + (ledIdx + 1) * espacementLed;
              const indexGlobal = qIdx * 3 + ledIdx;

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

        {/* Grilles de boutons par quartier - flexWrap pour passer à la ligne si manque de place */}
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    opacity: estDesactive ? 0.5 : 1,
                    gap: responsive.number(8),
                    marginBottom: responsive.number(10),
                  }}
                >
                  {mesQuartiers.map((quartier, idx) => (
                    <Pressable
                      key={idx}
                      disabled={estDesactive}
                      style={[
                        globalStyles.btnCommande,
                        { backgroundColor: quartier.couleur },
                      ]}
                      onPress={() => gererClicTourner(idx)}
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
                    opacity: estDesactive ? 0.5 : 1,
                    gap: responsive.number(8),
                  }}
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
        
                  {/* BOUTON BANKRUPT */}
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
              <View style={[
                globalStyles.customSidebar,
                { flex: 0.1, paddingBottom: insets.bottom }
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
              </View>
            </View>
          );
        }
