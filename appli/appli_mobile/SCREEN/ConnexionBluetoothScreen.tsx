import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Modal } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../type";
import { useBleGlobal } from "../BLE_CONTEXT";
import { GradientText } from "../../DESIGN/GradientText";
import { globalStyles } from "../../DESIGN/globalStyles";

import { useResponsive } from "../../DESIGN/responsive";

export default function ConnexionBluetoothScreen({
  navigation,
}: NativeStackScreenProps<
  RootStackParamList,
  "ConnexionBluetooth"
>): React.JSX.Element {
  const { state, scanAndConnect, disconnect, sendPin } = useBleGlobal();
  const [pinInput, setPinInput] = useState("");
  const [beingSent, setBeingSent] = useState(false);

  const responsive = useResponsive();

  //valide ou non le code pin
  const handlePinValidation = async () => {
    if (pinInput.length !== 4 && pinInput.length !== 6) {
      alert("Le code PIN doit comporter 4 ou 6 chiffres.");
      return;
    }
    setBeingSent(true);
    const success = await sendPin(pinInput);
    setBeingSent(false);

    if (success) {
      setPinInput("");
      navigation.navigate("Home");
    }
  };

  const handleCancel = () => {
    setPinInput("");
    disconnect();
  };

  const isModalVisible = state.status === "connected";

  const isInterfaceBloquee =
    state.status === "scanning" || beingSent;

  return (
      <View style={[globalStyles.mainContainer, { flex: 1, flexDirection: "column", justifyContent: "space-between" }]}>


    <View style={[globalStyles.container, { padding: responsive.number(16) }]}>
      <GradientText
            style={[globalStyles.textDegrade, { fontSize: responsive.fontSize(globalStyles.textDegrade.fontSize ?? 16) }]}
            text="Connexion à la roue"
            />
      <Text style={globalStyles.status}>État : {state.status}</Text>
      {state.statusText && (
        <Text style={globalStyles.info}>ℹ️ {state.statusText}</Text>
      )}

      {state.error && !isModalVisible && (
        <Text style={globalStyles.error}>❌ {state.error}</Text>
      )}

      {/* Bouton de scan visible si déconnecté ou erreur */}
      {(state.status === "idle" || state.status === "error") && (
        <Pressable style={[globalStyles.btn, { marginTop: responsive.number(60), paddingVertical: responsive.number(12), paddingHorizontal: responsive.number(24) }]} onPress={scanAndConnect}>
          <Text style={globalStyles.btnText}>
            {state.remainingTrials < 3
              ? "Recommencer (Retenter le PIN)"
              : "Scanner et connecter"}
          </Text>
        </Pressable>
      )}

      {state.status === "scanning" && (
        <Text style={globalStyles.info}>Recherche de l'ESP32-Roue...</Text>
      )}

      {state.status === "connecting" && (
        <Text style={globalStyles.info}>
          Établissement de la liaison Bluetooth...
        </Text>
      )}

      {state.status === "authenticated" && (
        <Pressable
         style={[globalStyles.btn, { marginTop: responsive.number(60), paddingVertical: responsive.number(12), paddingHorizontal: responsive.number(24) }]}
          onPress={handleCancel}
        >
          <Text style={globalStyles.btnText}>Déconnecter</Text>
        </Pressable>
      )}

      {/* POPUP AUTHENTIFICATION */}
      <Modal visible={isModalVisible} transparent={true} animationType="fade">
        <View style={globalStyles.modalOverlay}>
          <View style={globalStyles.modalContainer}>
            <Text style={globalStyles.modalTitle}>
              Authentification Requise
            </Text>
            <Text style={globalStyles.modalSubtitle}>
              Veuillez saisir le code PIN de sécurité.
            </Text>

            <TextInput
              style={[
                globalStyles.pinInput,
                isInterfaceBloquee && { opacity: 0.5 },
              ]}
              placeholder="Code PIN"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry={true}
              value={pinInput}
              onChangeText={setPinInput}
              editable={!isInterfaceBloquee}
            />

            <View style={globalStyles.modalRowButtons}>
              <Pressable
                style={[globalStyles.modalBtn, globalStyles.modalBtnCancel]}
                onPress={handleCancel}
                disabled={beingSent}
              >
                <Text style={globalStyles.modalBtnTextCancel}>Annuler</Text>
              </Pressable>

              <Pressable
                style={[
                  globalStyles.modalBtn,
                  globalStyles.modalBtnConfirm,
                  isInterfaceBloquee && { opacity: 0.5 },
                ]}
                onPress={handlePinValidation}
                disabled={isInterfaceBloquee}
              >
                <Text style={globalStyles.btnText}>
                  {beingSent ? "Vérification..." : "Valider"}
                </Text>
              </Pressable>
            </View>

            <Text style={globalStyles.essaisText}>
              Tentatives restantes : {state.remainingTrials}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
    </View>
  );
}