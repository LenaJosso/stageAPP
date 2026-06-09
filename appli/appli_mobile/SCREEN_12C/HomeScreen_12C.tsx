import React from "react";
import { View, Text, Pressable, Image } from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../TYPE/type_12C";
import { globalStyles } from "../globalStyles";
import { GradientText } from "../GradientText";

export default function HomeScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Home">): React.JSX.Element {
  const data = [
    { label: "1. Nouveaux lots", value: "AddLot" },
    { label: "2. Voir le stock", value: "ViewStock" },
    { label: "3. Commande", value: "Commande" },
    { label: "4. Statistics", value: "Statistics" },
  ];

  return (
    <View style={globalStyles.mainContainer}>
      {/* MENU SUR LE CÔTÉ (SIDEBAR NOIRE) */}
      <View style={globalStyles.customSidebar}>
        <Text style={globalStyles.sidebarTitle}>Navigation</Text>
        <Dropdown
          style={{
            backgroundColor: "#262626", // Fond du sélecteur sombre
            padding: 10,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: "#252525",
            width: "100%",
          }}
          containerStyle={{
            backgroundColor: "#262626", // Fond de la liste déroulante interne
            borderColor: "#475569",
          }}
          itemTextStyle={{
            color: "#e2e8f0", // Couleur des options en gris clair
          }}
          activeColor="#334155" // Couleur au survol d'une option
          placeholderStyle={{ fontSize: 13, color: "#94a3b8" }}
          selectedTextStyle={{
            fontSize: 13,
            color: "#ffffff",
            fontWeight: "600",
          }}
          placeholder="Choisir..."
          data={data}
          labelField="label"
          valueField="value"
          onChange={(item) => {
            navigation.navigate(item.value as any);
          }}
        />
      </View>

      {/* CONTENU PRINCIPAL (MILIEU) */}
      <View style={globalStyles.leftContainer}>
        <Image
          source={require("../assets/lemiaLogo.png")}
          style={{ width: 320, height: 100 }}
        />

        <GradientText
          style={globalStyles.textDegrade}
          text="Bienvenue sur la commande de votre roue"
        ></GradientText>

        <Pressable
          style={[globalStyles.button, { marginTop: 70 }]}
          onPress={() => navigation.navigate("ConnexionBluetooth")}
        >
          <Text style={globalStyles.buttonText}>Connexion Bluetooth</Text>
        </Pressable>
      </View>
    </View>
  );
}
