import React from "react";
import { useEffect, useState} from "react";
import { View, Text, Pressable, Image } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../type";
import { globalStyles } from "../globalStyles";
import { GradientText } from "../GradientText";
import { useResponsive } from "../responsive";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBleGlobal } from "../BLE_CONTEXT/CONTEXT_12cases";


export default function HomeScreen({
  navigation,
  
}: NativeStackScreenProps<RootStackParamList, "Home">): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const responsive = useResponsive();
  const { state } = useBleGlobal();

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
        
{/*Le bouton de connection s'enleve ou apparait selon si on est connecté a l'esp32 ou pas*/}
       {state.status !== "authenticated" && (
          <Pressable
            style={[globalStyles.button, { marginTop: responsive.number(60), paddingVertical: responsive.number(12), paddingHorizontal: responsive.number(24) }]}
            onPress={() => navigation.navigate("ConnexionBluetooth")}
          >
            <Text style={[globalStyles.buttonText, { fontSize: responsive.fontSize(globalStyles.buttonText.fontSize ?? 16) }]}>
              Connexion Bluetooth
            </Text>
          </Pressable>
        )}
        {state.status == "authenticated" &&(
          <Text style={[globalStyles.buttonText, {marginTop : 20, fontSize: 14}]} >
            - Vous êtes connecté -
            </Text>
        )}

      </View>

      {/* TABBAR HORIZONTALE EN BAS */}
      <View style={[
        globalStyles.customSidebar,
        { flex: 0.05, flexDirection: "row", paddingBottom: insets.bottom, minHeight: responsive.number(60) }
      ]}>

        <Pressable
          style={[globalStyles.buttonSidebar, { flex: 1, alignItems: "center", justifyContent: "center" }]}
          onPress={() => navigation.navigate("AddLot")}
        >
          <Image
          source={require("../assets/plus-icon.png")}
          style={{
            width: responsive.number(98),
            height: responsive.number(30.6),
            resizeMode: "contain",
            marginBottom: responsive.number(0),
          }}
        />
        </Pressable>

        <Pressable
          style={[globalStyles.buttonSidebar, { flex: 1, alignItems: "center", justifyContent: "center" }]}
          onPress={() => navigation.navigate("ViewStock")}
        >
          <Image
          source={require("../assets/stock-icon.png")}
          style={{
            width: responsive.number(98),
            height: responsive.number(30.6),
            resizeMode: "contain",
            marginBottom: responsive.number(0),
          }}
        />
        </Pressable>

        <Pressable
          style={[globalStyles.buttonSidebar, { flex: 1, alignItems: "center", justifyContent: "center" }]}
          onPress={() => navigation.navigate("Commande")}
        >
          {/*<Text style={[globalStyles.textSibebar, { fontSize: responsive.fontSize(globalStyles.textSibebar.fontSize ?? 11) }]}>
            Télécommande
          </Text>*/}
          <Image
          source={require("../assets/remote-icon.png")}
          style={{
            width: responsive.number(98),
            height: responsive.number(30.6),
            resizeMode: "contain",
            marginBottom: responsive.number(0),
          }}
        />
        </Pressable>

        <Pressable
          style={[globalStyles.buttonSidebar, { flex: 1, alignItems: "center", justifyContent: "center" }]}
          onPress={() => navigation.navigate("Statistics")}
        >
          <Image
          source={require("../assets/stats-icon.png")}
          style={{
            width: responsive.number(98),
            height: responsive.number(30.6),
            resizeMode: "contain",
            marginBottom: responsive.number(0),
          }}
        />
        </Pressable>
      </View>

    </View>
  );
}