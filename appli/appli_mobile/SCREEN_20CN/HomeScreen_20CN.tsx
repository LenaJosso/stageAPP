import React from "react";
import { View, Text, Pressable, Image } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../TYPE/type_12CN";
import { globalStyles } from "../globalStyles";
import { GradientText } from "../GradientText";
import { useResponsive } from "../responsive";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Home">): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const responsive = useResponsive();

  return (
    <View style={[globalStyles.mainContainer, { flex: 1, flexDirection: "column", justifyContent: "space-between" }]}>

      {/* CONTENU PRINCIPAL (HAUT / MILIEU) */}
      <View style={[globalStyles.rightContainer, { padding: responsive.number(16) }]}>
        <Image
          source={require("../assets/lemiaLogo.png")}
          style={{
            width: responsive.number(320),
            height: responsive.number(100),
            resizeMode: "contain",
            marginBottom: responsive.number(60),
          }}
        />

        <GradientText
          style={[globalStyles.textDegrade, { fontSize: responsive.fontSize(globalStyles.textDegrade.fontSize ?? 16) }]}
          text="Bienvenue sur la télécommande de votre roue"
        />
        

        <Pressable
          style={[globalStyles.button, { marginTop: responsive.number(60), paddingVertical: responsive.number(12), paddingHorizontal: responsive.number(24) }]}
          onPress={() => navigation.navigate("ConnexionBluetooth")}
        >
          <Text style={[globalStyles.buttonText, { fontSize: responsive.fontSize(globalStyles.buttonText.fontSize ?? 16) }]}>
            Connexion Bluetooth
          </Text>
        </Pressable>
      </View>

      {/* TABBAR HORIZONTALE EN BAS */}
      <View style={[
        globalStyles.customSidebar,
        { flex: 0.1, flexDirection: "row", paddingBottom: insets.bottom, minHeight: responsive.number(60) }
      ]}>

        <Pressable
          style={[globalStyles.buttonSidebar, { flex: 1, alignItems: "center", justifyContent: "center" }]}
          onPress={() => navigation.navigate("AddLot")}
        >
          <Text style={[globalStyles.textSibebar, { fontSize: responsive.fontSize(globalStyles.textSibebar.fontSize ?? 11) }]}>
            Ajouter lot
          </Text>
        </Pressable>

        <Pressable
          style={[globalStyles.buttonSidebar, { flex: 1, alignItems: "center", justifyContent: "center" }]}
          onPress={() => navigation.navigate("ViewStock")}
        >
          <Text style={[globalStyles.textSibebar, { fontSize: responsive.fontSize(globalStyles.textSibebar.fontSize ?? 11) }]}>
            Voir stock
          </Text>
        </Pressable>

        <Pressable
          style={[globalStyles.buttonSidebar, { flex: 1, alignItems: "center", justifyContent: "center" }]}
          onPress={() => navigation.navigate("Commande")}
        >
          <Text style={[globalStyles.textSibebar, { fontSize: responsive.fontSize(globalStyles.textSibebar.fontSize ?? 11) }]}>
            Télécommande
          </Text>
        </Pressable>

        <Pressable
          style={[globalStyles.buttonSidebar, { flex: 1, alignItems: "center", justifyContent: "center" }]}
          onPress={() => navigation.navigate("Statistics")}
        >
          <Text style={[globalStyles.textSibebar, { fontSize: responsive.fontSize(globalStyles.textSibebar.fontSize ?? 11) }]}>
            Stats
          </Text>
        </Pressable>
      </View>

    </View>
  );
} 