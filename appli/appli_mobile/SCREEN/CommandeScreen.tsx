import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Animated,
  Easing,
  useWindowDimensions,
} from "react-native";
import { useBleGlobal } from "../BLE_CONTEXT";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Roue } from "../Roue";
import Triangle from "../Triangle";
import { globalStyles } from "../globalStyles";
import { useResponsive } from "../responsive";

export type QuarterDef = {
  id: number;
  label: string;
  couleur: string;
  valeur?: number;
};

type CommandeScreenProps = {
  quarters?: QuarterDef[];
  wheelSizeBase?: number;
  ledRadiusBase?: number;
};

// Génère les quartiers par défaut si l'utilisateur n'en fournit pas via les props
// (utilisé notamment si l'ESP32 n'a pas encore renvoyé sa config, ou pour des tests)
//peut-être rajouter un if 20 ou 12 cases et mettre les couleurs en fonction ? Puisque c'est la seule réelle différence entre les deux ?
// Couleurs utilisées quand la roue a 12 cases
const Couleurs12Cases = [
  "#02b801", "#ff0000", "#e6b6ff", "#a137d1", "#ff0000", "#ebff00",
  "#ffcc00", "#ff0000", "#2979ff", "#00e5ff", "#ff0000", "#abf793"
];

// Couleurs utilisées quand la roue a 20 cases
const Couleurs20Cases = [
  "#ff49b3", "#ebff00", "#ff0000", "#02b801", "#22d3ee", "#ff49b3",
  "#ebff00", "#ff0000", "#02b801", "#00e5ff", "#ff49b3", "#ebff00",
  "#ff0000", "#02b801", "#22d3ee", "#ff49b3", "#ebff00", "#ff0000",
  "#02b801", "#22d3ee"
];

function generateDefaultQuarters(count: number): QuarterDef[] {
  // On choisit le bon jeu de couleurs selon le nombre de cases renvoyé par l'ESP32
  const palette = count === 20 ? Couleurs20Cases : Couleurs12Cases;

  return Array.from({ length: count }, (_, i) => ({
    id: i,
    label: `Case ${i + 1}`,
    couleur: palette[i % palette.length],
  }));
}

export default function CommandeScreen({
  quarters: customQuarters,
  wheelSizeBase = 300, 
  ledRadiusBase = 140,
}: CommandeScreenProps): React.JSX.Element {
  
  // On récupère tout l'état et les actions BLE depuis le contexte global
  // (state.isLocked, unlock/lock, etc. sont gérés là-bas, pas ici)
  const { state, spinWheel, unlock, lock, endWheelAnimation, 
    retrieveHistory, caseHasLosingLed, refreshLock, getLosingCases } =
    useBleGlobal();

  const insets = useSafeAreaInsets();
  const responsive = useResponsive();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();

  // Désactive toute interaction avec la roue tant qu'on n'est pas authentifié en BLE
  //pour rendre "invisible" la roue quand on n'est pas connecté
  const isDisabled = state.status !== "authenticated";

  // Récupération de la config envoyée par l'ESP32 (nombre de cases, leds, etc.)
  // avec des valeurs de secours si la config n'est pas encore chargée
  const config = state.config;
  const nbQuarter = config?.numCases ?? (customQuarters ? customQuarters.length : 12);
  const ledsPerCase = config?.ledsPerCase ?? 1;
  const losingLeds  = config?.losingLeds  ?? [];

  // On utilise les quartiers personnalisés seulement si leur nombre correspond à la config réelle
  const quarters = customQuarters && customQuarters.length === nbQuarter
    ? customQuarters 
    : generateDefaultQuarters(nbQuarter);

  // Calculs responsive pour adapter la taille de la roue selon l'orientation et la taille d'écran
  const isLandscape = windowWidth > windowHeight;
  const maxAvailableSize = isLandscape ? windowHeight * 0.40 : windowHeight * 0.32;
  const idealWheelSize = responsive.number(wheelSizeBase);
  const WheelSize = Math.min(idealWheelSize, maxAvailableSize);
  
  const ratio = WheelSize / idealWheelSize;
  const LedRadius = responsive.number(ledRadiusBase) * ratio;
  const anglePerQuarter = 360 / nbQuarter;

  // Valeur animée pilotant la rotation de la roue (en degrés)
  const rotationAnim = useRef(new Animated.Value(0)).current;
  // Garde en mémoire le dernier index ciblé pour gérer la continuité de la rotation entre 2 spins
  const lastIndexRef = useRef<number | null>(null);

  const [winningPrize, setWinningPrize] = useState<string | null>(null);
  // État local indiquant qu'une animation de spin est en cours côté UI
  // (distinct de state.isSpinning qui vient du BLE/ESP32)
  const [localSpinning, setLocalSpinning] = useState(false);

  // Déclenche un spin ciblé sur une case précise (appui sur un numéro de case)
  //gestion d'un bouton pour tourner
  const manageClickTurn = async (indexQuartier?: number) => {
    if (isDisabled || localSpinning || state.isSpinning) return;
    setWinningPrize(null);
    setLocalSpinning(true);

    const success = await spinWheel(indexQuartier);
    if (!success) setLocalSpinning(false);
  };

  // Déclenche un spin forcé sur une case perdante (bouton BANKRUPT)
  // gestion du bouton bankrupt
  const manageClickBankrupt = async ()=> {
    if (isAnySpinning) return;

    const losingCases = getLosingCases();
    if (losingCases.length === 0) {
      // Sécurité au cas où l'ESP32 n'a configuré aucune LED perdante
      alert("Aucune case perdante n'a été configuré");
      return;
    }
    // Choisir une case perdante au hasard parmi la liste
    const randomLosingCase = losingCases[Math.floor(Math.random() * losingCases.length)];

    // Déclencher l'état visuel de rotation local
    setLocalSpinning(true);
    setWinningPrize("");

    // Envoyer l'index ciblé à l'ESP32 (ex: si la case 1 est perdante, on envoie 1 au lieu de 0xff)
    const success = await spinWheel(randomLosingCase);
    if (!success) {
      setLocalSpinning(false);
    }
  };

  // Dès qu'on devient authentifié, on va chercher l'historique des tirages stocké sur l'ESP32
  useEffect(() => {
    if (state.status === "authenticated") retrieveHistory();
  }, [state.status]);

  // Effet principal qui pilote l'animation de rotation de la roue
  // Se déclenche quand le BLE (state.isSpinning) ou l'UI locale (localSpinning) indique qu'un spin est en cours
  useEffect(() => {
    const isSpinningActive = state.isSpinning || localSpinning;
    if (!isSpinningActive) return;

    let currentTarget = state.pendingCounter;

    // Sécurité d'échappement : si la valeur reçue est invalide, on ne fige pas l'UI
    if (currentTarget === null || currentTarget < 0 || currentTarget >= nbQuarter) {
      // Si l'état dit qu'on tourne mais qu'aucune case n'est valide, on reset
      if (state.isSpinning) {
        endWheelAnimation();
        setLocalSpinning(false);
      }
      return;
    } 

    // Nombre de tours complets avant de s'arrêter, purement esthétique (effet "roue de la fortune")
    const bonusRound = 360 * 4;
    const ledToAim = state.targetLedIndexGlobal;
    // Vérifie si la LED ciblée appartient bien au quartier gagnant déterminé par l'ESP32
    const ledBelongsToCase = ledToAim !== null && ledsPerCase > 1 && Math.floor(ledToAim / ledsPerCase) === currentTarget;

    let targetLedAngle: number;
    if (ledBelongsToCase && ledToAim !== null) {
      // On vise précisément la LED gagnante/perdante à l'intérieur du quartier
      const ledIdx    = ledToAim % ledsPerCase;
      const spacing   = anglePerQuarter / (ledsPerCase + 1);
      targetLedAngle  = currentTarget * anglePerQuarter + (ledIdx + 1) * spacing;
    } else {
      // Sinon on vise simplement le centre du quartier
      targetLedAngle  = currentTarget * anglePerQuarter + anglePerQuarter / 2;
    }

    const targetAngle = bonusRound - targetLedAngle;

    // Permet d'enchaîner les spins sans repartir de 0 à chaque fois,
    // en conservant la position angulaire actuelle (modulo 360)
    if (lastIndexRef.current !== null) {
      const currentValue = (rotationAnim as any)._value ?? 0;
      rotationAnim.setValue(currentValue % 360);
    } else {
      rotationAnim.setValue(0);
    }
    lastIndexRef.current = currentTarget;

    //Permet l'animation
    Animated.timing(rotationAnim, {
      toValue: targetAngle,
      duration: 3500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      // On récupère la LED précise qui a été ciblée par ce tirage
      const finalLedTarget = state.targetLedIndexGlobal;
      
      // On vérifie si cette LED précise est dans la liste des perdantes fournies par l'ESP32
      const isLosingLed = finalLedTarget !== null && state.config?.losingLeds.includes(finalLedTarget);

      if (isLosingLed) {
        // Le tirage est tombé pile sur une des 2 LEDs de BANKRUPT
        setWinningPrize("BANKRUPT");  
      } else {
        // Le tirage est tombé sur une LED normale du quartier rouge (ou d'un autre quartier)
        setWinningPrize(quarters[currentTarget!]?.label ?? `Case ${currentTarget! + 1}`);
      }

      // Une fois l'animation terminée, on notifie le contexte BLE (reset isSpinning, ajout à l'historique)
      endWheelAnimation();
      setLocalSpinning(false);
    });
  }, [state.isSpinning, localSpinning, state.pendingCounter, state.targetLedIndexGlobal, nbQuarter]);

  // Interpolation de la valeur animée brute (en degrés numériques) vers une chaîne CSS de rotation
  const rotationInterpolee = rotationAnim.interpolate({
    inputRange: [-360, 2000],
    outputRange: ["-360deg", "2000deg"],
  });

  // Vrai si la roue ne doit accepter aucune interaction (déco, ou spin déjà en cours)
  const isAnySpinning = isDisabled || state.isSpinning || localSpinning; 

  return (
    <View style={[globalStyles.mainContainer, { flex: 1, paddingTop: insets.top }]}>
      <View style={[globalStyles.rightContainer, { flex: 1, padding: responsive.number(10), justifyContent: "space-between" }]}>
        
        {/* SECTION SUPERIEURE */}{/*s'affiche que si on n'est pas connecter, c'est un message */}
        <View style={{ flex: 1.2, width: "100%", alignItems: "center", justifyContent: "flex-start" }}>
          {isDisabled && (
            <Text style={[globalStyles.error, { marginBottom: responsive.number(5), textAlign: "center", fontSize: responsive.fontSize(12) }]}>
              Connectez-vous et authentifiez-vous en Bluetooth pour piloter la roue.
            </Text>
          )}

          <View style={{ marginBottom: responsive.number(8) }}>
            <Text style={{ fontSize: responsive.fontSize(18), fontWeight: "bold", color: "#ffffff" }}>
              {winningPrize ? `Résultat : ${winningPrize}` : "Résultat : "}
            </Text>
          </View> 

          <View style={{ alignItems: "center", justifyContent: "center" }}>
            <View style={{ marginBottom: responsive.number(-5), zIndex: 10 }}> 
              <Triangle />
            </View>
            {/*Permet l'animation de tout ce qui est à l'intérieur du Animated.View */}
            <Animated.View style={{
              opacity: isDisabled ? 0.5 : 1,
              transform: [{ rotate: rotationInterpolee}],
              width: WheelSize,
              height: WheelSize,
              justifyContent: "center",
              alignItems: "center",
            }}>
              <Roue donnees={quarters} taille={WheelSize} />{/*Affiche la roue en fonction des données de l'esp32 + des calculs du ficher Roue.tsx*/}

              {/*Calcul pour les leds et les angles pour les rotations et les placement */}
              {ledsPerCase > 1 && quarters.map((_, qIdx) => {
                const baseAngle = qIdx * anglePerQuarter;
                return Array.from({ length: ledsPerCase }, (__, ledIdx) => {
                  const spacing     = anglePerQuarter / (ledsPerCase + 1);
                  const angleLed    = baseAngle + (ledIdx + 1) * spacing;
                  const globalIndex = qIdx * ledsPerCase + ledIdx;
                  
                  // Les LEDs perdantes sont affichées en noir, les autres en gris clair
                  const isLosingLed = losingLeds.includes(globalIndex);
                  const ledColor = isLosingLed ? "#000000" : "#a3a3a3";

                  return (
                    <View
                      key={`${qIdx}-${ledIdx}`}
                      style={[globalStyles.ledContainer, {
                        transform: [
                          { rotate: `${angleLed}deg` },
                          { translateY: -LedRadius },
                        ],
                      }]}
                    >
                      <View style={[globalStyles.led, { backgroundColor: ledColor, width: responsive.number(6) * ratio, height: responsive.number(6) * ratio }]} />
                    </View>
                  );
                });
              })}
            </Animated.View>
          </View>
        </View>

        {/* SECTION INFERIEURE */}
        <View style={{ width: "100%", flex: 1, justifyContent: "flex-end", marginTop: responsive.number(10) }}>
          <Text style={{ fontSize: responsive.fontSize(12), color: "#666", textAlign: "center", marginBottom: responsive.number(4) }}>
            Sélectionner une case cible :
          </Text>

          <ScrollView 
            contentContainerStyle={{
              flexDirection: "row", flexWrap: "wrap", justifyContent: "center",
              gap: responsive.number(8), paddingBottom: responsive.number(5)
            }} 
            style={{ maxHeight: windowHeight * 0.22}} 
            showsVerticalScrollIndicator={true}
          >
            {/*Bouton pour chaque quartier */}
            {quarters.map((quartier, idx) => {
              //const isCaseRed = caseHasLosingLed(idx);
              return (
                <Pressable
                  key={idx}
                  disabled={isDisabled}
                  style={[globalStyles.btnCommande, { 
                    backgroundColor: quartier.couleur, 
                    paddingVertical: responsive.number(10), 
                    paddingHorizontal: responsive.number(14),
                    minWidth: responsive.number(46),
                    borderRadius: responsive.number(6)
                  }]}
                  onPress={() => manageClickTurn(idx)}
                >
                  <Text style={[globalStyles.btnText, { fontSize: responsive.fontSize(14), fontWeight: "bold", color: "#fff" }]}>
                    {idx + 1}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Actions Globales */}
          <View style={{
            flexDirection: "row", flexWrap: "wrap", justifyContent: "center",
            opacity: isDisabled ? 0.5 : 1, gap: responsive.number(6),
            marginTop: responsive.number(5)
          }}>
                        
            <Pressable 
              disabled={isAnySpinning} 
              style={[
                globalStyles.btnSpin, 
                { padding: responsive.number(10), minWidth: responsive.number(100) } // Rouge Banqueroute
              ]} 
              onPress={manageClickBankrupt} //Bouton bankrupt
            >
              <Text style={[globalStyles.btnText, { fontSize: responsive.fontSize(13), color: "#ffffff" }]}>BANKRUPT</Text>
            </Pressable> 

            {/*
              Bouton de (dé)verrouillage de la roue.
              On appelle TOUJOURS unlock() ici : le relock automatique (après un délai)
              est entièrement géré côté BLE_CONTEXT via un useEffect sur state.isLocked.
              Ce bouton n'a donc pas besoin de connaître la logique de relock,
              il se contente d'afficher l'état courant et de déclencher le déverrouillage.
            */}
            <Pressable
              disabled={isDisabled} 
              style={[
                globalStyles.btnSpin, 
                { padding: responsive.number(10), minWidth: responsive.number(110) }, 
                state.isLocked ? { backgroundColor: "#ea580c" } : { backgroundColor: "#16a34a" }
              ]}
              onPress={unlock} // On appelle directement le unlock pour déverrouiller la roue
            >
              <Text style={[globalStyles.btnText, { textAlign: "center", fontSize: responsive.fontSize(13) }]}>
                {state.isLocked ? "Déverrouiller" : "Roue Prête"}
              </Text>
            </Pressable>
          </View>
        </View>

      </View>

      {/* Historique */}
      <View style={[globalStyles.customSidebar, { height: windowHeight * 0.10, paddingBottom: insets.bottom + responsive.number(2) }]}>
        <Text style={[globalStyles.sidebarTitle, { fontSize: responsive.fontSize(13), marginVertical: responsive.number(2), textAlign: "center" }]}>
          Historique (ESP32)
        </Text>
        <ScrollView horizontal contentContainerStyle={globalStyles.sidebarScroll} showsHorizontalScrollIndicator={false}>
          {/*On va chercher l'historique et il se refresh à chaque tirage de roue */}
          {state.history.map((idLot, index) => {
            const quarter = quarters.find((q) => q.id === idLot);
            return (
              <View key={index} style={[globalStyles.historyItem, { paddingHorizontal: responsive.number(6), height: responsive.number(26) }]}>
                <Text style={[globalStyles.historyIndex, { fontSize: responsive.fontSize(11) }]}>{index + 1}.</Text>
                <View style={{
                  width: responsive.number(8), height: responsive.number(8), borderRadius: responsive.number(4),
                  backgroundColor: quarter?.couleur ?? "#ccc",
                  marginRight: responsive.number(6), alignSelf: "center",
                }} />
                <Text style={[globalStyles.historyText, { fontSize: responsive.fontSize(11) }]}>
                  {quarter ? quarter.label : `Lot ${idLot}`}
                </Text>
              </View>
            );
          })}
          {state.history.length === 0 && (
            <Text style={[globalStyles.emptyHistory, { fontSize: responsive.fontSize(11), textAlign: "center", width: windowWidth }]}>Aucun tirage</Text>
          )}
        </ScrollView>
      </View>
    </View>
  );
}