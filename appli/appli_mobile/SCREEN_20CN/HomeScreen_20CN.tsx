import React from "react";
import { View, Text, Pressable, Image } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../TYPE/type_20CN";
import { globalStyles } from "../globalStyles";
import { GradientText } from "../GradientText";
import { useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';

export default function HomeScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Home">): React.JSX.Element {
const insets = useSafeAreaInsets();
  return (
    <View style={[globalStyles.mainContainer, { flex: 1, flexDirection: "column", justifyContent: "space-between" }]}>
      
      {/* CONTENU PRINCIPAL (HAUT / MILIEU) */}
      <View style={[globalStyles.rightContainer, { flex: 1, justifyContent: "center", alignItems: "center" }]}>
        <Image
          source={require("../assets/lemiaLogo.png")}
          style={{ width: 320, height: 100, resizeMode: "contain", marginBottom: 60 }}
        />

        <GradientText
          style={[globalStyles.textDegrade, {fontFamily : "Quicksand-Regular"}]}
          text="Bienvenue sur la commande "
        />
        <GradientText
          style={globalStyles.textDegrade}
          text="de votre roue"
        />

        <Pressable
          style={[globalStyles.button, { marginTop: 60 }]}
          onPress={() => navigation.navigate("ConnexionBluetooth")}
        >
          <Text style={globalStyles.buttonText}>Connexion Bluetooth</Text>
        </Pressable>
      </View>

      {/* VERITABLE TABBAR HORIZONTALE EN BAS */}
      <SafeAreaProvider style={[
        globalStyles.customSidebar, // Tu peux garder ton style de base (pour la couleur du fond par exemple)
        {flex: 0.1, paddingBottom: insets.bottom}
      ]}>
        
        <Pressable
          style={[globalStyles.buttonSidebar, { flex: 1, alignItems: "center", justifyContent: "center" }]}
          onPress={() => navigation.navigate("AddLot")}
        >
          <Text style={[globalStyles.textSibebar, ]}>Ajouter lot</Text>
        </Pressable>
        
        <Pressable 
          style={[globalStyles.buttonSidebar, { flex: 1, alignItems: "center", justifyContent: "center" }]}
          onPress={() => navigation.navigate("ViewStock")}
        >
          <Text style={[globalStyles.textSibebar]}>Voir stock</Text>
        </Pressable>
        
        <Pressable
          style={[globalStyles.buttonSidebar, { flex: 1, alignItems: "center", justifyContent: "center" }]}
          onPress={() => navigation.navigate("Commande")}
        >
          <Text style={[globalStyles.textSibebar]}>Commande</Text>
        </Pressable>
        
        <Pressable
          style={[globalStyles.buttonSidebar, { flex: 1, alignItems: "center", justifyContent: "center" }]}
          onPress={() => navigation.navigate("Statistics")}
        >
          <Text style={[globalStyles.textSibebar]}>Stats</Text>
        </Pressable>
      </SafeAreaProvider>

    </View>
  );
}
