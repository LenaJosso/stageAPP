import React from "react";
import { View, StatusBar, Text, Pressable } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { globalStyles } from "./globalStyles";

// IMPORT 12 CASES NOIRES
// A DECOMMENTER ET RECOMMENTER SELON LA ROUE VOULUE
/*import { StockProvider } from "./SCREEN_12CN/StockContext_12CN";
import { BleProvider } from "./BLE_CONTEXT/CONTEXT_12cases_noir";
import { RootStackParamList } from "./TYPE/type_12CN";

import HomeScreen from "./SCREEN_12CN/HomeScreen_12CN";
import AddLotScreen from "./SCREEN_12CN/AddLotScreen_12CN";
import ViewStockScreen from "./SCREEN_12CN/ViewStockScreen_12CN";
import ConnexionBluetoothScreen from "./SCREEN_12CN/ConnexionBluetoothScreen_12CN";
import CommandeScreen from "./COMMANDE ROUE/DouzesCases_Noir";
import StatisticsScreen from "./SCREEN_12CN/StatisticsScreen_12CN";*/

// IMPORT 12 CASES
// A DECOMMENTER ET RECOMMENTER SELON LA ROUE VOULUE
import { StockProvider } from "./SCREEN_12C/StockContext_12C";
import { BleProvider } from "./BLE_CONTEXT/CONTEXT_12cases";
import { RootStackParamList } from "./TYPE/type_12C";

import HomeScreen from "./SCREEN_12C/HomeScreen_12C";
import AddLotScreen from "./SCREEN_12C/AddLotScreen_12C";
import ViewStockScreen from "./SCREEN_12C/ViewStockScreen_12C";
import ConnexionBluetoothScreen from "./SCREEN_12C/ConnexionBluetoothScreen_12C";
import CommandeScreen from "./COMMANDE ROUE/DouzesCases";
import StatisticsScreen from "./SCREEN_12C/StatisticsScreen_12C";

// IMPORT 20 CASES NOIRES
// A DECOMMENTER ET RECOMMENTER SELON LA ROUE VOULUE
/*import { StockProvider } from "./SCREEN_12CN/StockContext_20CN";
import { BleProvider } from "./BLE_CONTEXT/CONTEXT_20cases_noir";
import { RootStackParamList } from "./TYPE/type_20CN";

import HomeScreen from "./SCREEN_20CN/HomeScreen_20CN";
import AddLotScreen from "./SCREEN_20CN/AddLotScreen_20CN";
import ViewStockScreen from "./SCREEN_20CN/ViewStockScreen_20CN";
import ConnexionBluetoothScreen from "./SCREEN_20CN/ConnexionBluetoothScreen_20CN";
import CommandeScreen from "./COMMANDE ROUE/VingtCases_Noir"; 
import StatisticsScreen from "./SCREEN_20CN/StatisticsScreen_20CN";*/

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App(): React.JSX.Element {
  return (
    <BleProvider>
      <StockProvider>
        <NavigationContainer>
          <View style={globalStyles.mainContainer}>
            <Stack.Navigator
              initialRouteName="Home"
              screenOptions={{
                headerStyle: {
                  backgroundColor: "#000000",
                },
                headerTintColor: "#fff",
                headerTitleStyle: {
                  fontWeight: "bold",
                },
              }}
            >
              <Stack.Screen
                name="Home"
                component={HomeScreen}
                options={{ title: "Accueil", headerTintColor: "#FF0000" }}
              />
              <Stack.Screen
                name="AddLot"
                component={AddLotScreen}
                options={{ title: "Ajouter un Lot" }}
              />
              <Stack.Screen
                name="ViewStock"
                component={ViewStockScreen}
                options={{ title: "Inventaire du Stock" }}
              />
              <Stack.Screen
                name="ConnexionBluetooth"
                component={ConnexionBluetoothScreen}
                options={{ title: "Appairage Bluetooth" }}
              />
              <Stack.Screen
                name="Commande"
                component={CommandeScreen}
                options={{ title: "Contrôle de la Roue" }}
              />
              <Stack.Screen
                name="Statistics"
                component={StatisticsScreen}
                options={{ title: "Statistiques ESP32" }}
              />
            </Stack.Navigator>
          </View>
        </NavigationContainer>
      </StockProvider>
    </BleProvider>
  );
}
