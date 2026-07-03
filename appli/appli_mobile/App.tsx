import React from "react";
import { useEffect, useState} from "react";
import { View, StatusBar, Text, Pressable } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { globalStyles } from "./DESIGN/globalStyles";
import { lockAsync, OrientationLock } from "expo-screen-orientation";


import { StockProvider } from "./SCREEN/StockContext";
import { BleProvider } from "./BLE_CONTEXT";
import { RootStackParamList } from "./type";

import HomeScreen from "./SCREEN/HomeScreen";
import AddLotScreen from "./SCREEN/AddLotScreen";
import ViewStockScreen from "./SCREEN/ViewStockScreen";
import ConnexionBluetoothScreen from "./SCREEN/ConnexionBluetoothScreen";
import StatisticsScreen from "./SCREEN/StatisticsScreen";
import CommandeScreen from "./SCREEN/CommandeScreen";


const Stack = createNativeStackNavigator<RootStackParamList>();


export default function App(): React.JSX.Element {

  useEffect(() => {
    lockAsync(OrientationLock.PORTRAIT_UP);
  }, []);

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
                headerTitleStyle: {
                  fontWeight: "bold",
                  
                },
              }}
            >
              <Stack.Screen
                name="Home"
                component={HomeScreen}
                options={{ title: "Accueil", headerTintColor: "#e33625", headerTitleAlign: "center" }}
              />
              <Stack.Screen
                name="AddLot"
                component={AddLotScreen}
                options={{ title: "Ajouter un Lot", headerTintColor: "#e33625", headerTitleAlign: "left"  }}
              />
              <Stack.Screen
                name="ViewStock"
                component={ViewStockScreen}
                options={{ title: "Inventaire du Stock", headerTintColor: "#e33625", headerTitleAlign: "left"  }}
              />
              <Stack.Screen
                name="ConnexionBluetooth"
                component={ConnexionBluetoothScreen}
                options={{ title: "Appairage Bluetooth", headerTintColor: "#e33625", headerTitleAlign: "left"  }}
              />
              <Stack.Screen
                name="Commande"
                component={CommandeScreen}
                options={{ title: "Contrôle de la Roue", headerTintColor: "#e33625", headerTitleAlign: "left"  }}
              />
              <Stack.Screen
                name="Statistics"
                component={StatisticsScreen}
                options={{ title: "Statistiques ESP32", headerTintColor: "#e33625", headerTitleAlign: "left"  }}
              />
            </Stack.Navigator>
          </View>
        </NavigationContainer>
      </StockProvider>
    </BleProvider>
  );
}
