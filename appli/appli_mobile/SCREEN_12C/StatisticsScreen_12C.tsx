import React, { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useBleGlobal } from "../BLE_CONTEXT/CONTEXT_12cases";
import { RootStackParamList, Lot } from "../TYPE/type_12C";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Buffer } from "buffer";
import { globalStyles } from "../globalStyles";
import { GradientText } from "../GradientText";

export default function StatisticsScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Statistics">): React.JSX.Element {
  const { state, lireCaracteristique, STATS_CHAR_UUID, INFO_CHAR_UUID } =
    useBleGlobal();
  const [totalSpins, setTotalSpins] = useState<number>(0);
  const [hitsParCase, setHitsParCase] = useState<number[]>(
    new Array(12).fill(0)
  );

  useEffect(() => {
    async function chargerDonnees() {
      if (state.status !== "authenticated") return;

      try {
        const base64Info = await lireCaracteristique(INFO_CHAR_UUID);
        if (base64Info) {
          const bytesInfo = Buffer.from(base64Info, "base64");
          const total = bytesInfo.readUInt32LE(2);
          setTotalSpins(total);
        }

        const base64Stats = await lireCaracteristique(STATS_CHAR_UUID);
        if (base64Stats) {
          const bytesStats = Buffer.from(base64Stats, "base64");
          const hits = Array.from({ length: 12 }, (_, i) =>
            bytesStats.readUInt16LE(i * 2)
          );
          setHitsParCase(hits);
        }
      } catch (error) {
        console.error(
          "Erreur durant la récupération des statistiques :",
          error
        );
      }
    }

    chargerDonnees();
  }, [state.status]);

  return (
<View style={globalStyles.mainContainer}>

    <View style={globalStyles.screen}>
      <GradientText style={globalStyles.textDegrade} text="Statistiques"/>
      <Text
        style={{
          fontSize: 22,
          fontWeight: "bold",
          marginBottom: 20,
          marginTop:25,
          color: "#ffffff",
        }}
      >
        Total spins : {totalSpins}
      </Text>

      <Text
        style={{
          fontSize: 22,
          fontWeight: "600",
          marginBottom: 20,
          color: "#ffffff",
        }}
      >
        Statistiques par case :
      </Text>

      {hitsParCase.map((hits, index) => (
        <Text
          key={index}
          style={{ fontSize: 20, marginVertical: 4, color: "#ffffff" }}
        >
          Case {index + 1} : {hits} hits
        </Text>
      ))}
    </View>
    </View>
  );
}
