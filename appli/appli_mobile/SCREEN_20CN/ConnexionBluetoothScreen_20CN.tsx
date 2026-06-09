import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Modal } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../TYPE/type_20CN";
import { useBleGlobal } from "../BLE_CONTEXT/CONTEXT_20cases_noir";
import { globalStyles } from "../globalStyles";

export default function ConnexionBluetoothScreen({
  navigation,
}: NativeStackScreenProps<
  RootStackParamList,
  "ConnexionBluetooth"
>): React.JSX.Element {
  const { state, scanAndConnect, disconnect, sendPin } = useBleGlobal();
  const [pinInput, setPinInput] = useState("");
  const [enCoursDenvoi, setEnCoursDenvoi] = useState(false);

  const handleValiderPin = async () => {
    if (pinInput.length !== 4 && pinInput.length !== 6) {
      alert("Le code PIN doit comporter 4 ou 6 chiffres.");
      return;
    }
    setEnCoursDenvoi(true);
    const success = await sendPin(pinInput);
    setEnCoursDenvoi(false);

    if (success) {
      setPinInput("");
      navigation.navigate("Home");
    }
  };

  const handleAnnuler = () => {
    setPinInput("");
    disconnect();
  };

  const isModalVisible = state.status === "connected";
  /* (state.status === "scanning" && state.essaisRestants < 3)*/ const isInterfaceBloquee =
    state.status === "scanning" || enCoursDenvoi;

  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.title}>ESP32 ↔ React Native</Text>
      <Text style={globalStyles.status}>État : {state.status}</Text>
      {state.statusText && (
        <Text style={globalStyles.info}>ℹ️ {state.statusText}</Text>
      )}

      {state.error && !isModalVisible && (
        <Text style={globalStyles.error}>❌ {state.error}</Text>
      )}

      {/* Bouton de scan visible si déconnecté ou erreur */}
      {(state.status === "idle" || state.status === "error") && (
        <Pressable style={globalStyles.btn} onPress={scanAndConnect}>
          <Text style={globalStyles.btnText}>
            {state.essaisRestants < 3
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
          style={[globalStyles.btn, globalStyles.btnGray, { marginTop: 20 }]}
          onPress={handleAnnuler}
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
                onPress={handleAnnuler}
                disabled={enCoursDenvoi}
              >
                <Text style={globalStyles.modalBtnTextCancel}>Annuler</Text>
              </Pressable>

              <Pressable
                style={[
                  globalStyles.modalBtn,
                  globalStyles.modalBtnConfirm,
                  isInterfaceBloquee && { opacity: 0.5 },
                ]}
                onPress={handleValiderPin}
                disabled={isInterfaceBloquee}
              >
                <Text style={globalStyles.btnText}>
                  {enCoursDenvoi ? "Vérification..." : "Valider"}
                </Text>
              </Pressable>
            </View>

            <Text style={globalStyles.essaisText}>
              Tentatives restantes : {state.essaisRestants}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}
