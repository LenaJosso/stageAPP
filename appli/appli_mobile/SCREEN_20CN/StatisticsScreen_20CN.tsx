import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { useBleGlobal } from "../BLE_CONTEXT/CONTEXT_20cases_noir";
import { RootStackParamList, Lot } from "../TYPE/type_20CN";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Buffer } from "buffer";
import { globalStyles } from "../globalStyles";
import { GradientText } from "../GradientText";
import { useResponsive } from "../responsive";

export default function StatisticsScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Statistics">): React.JSX.Element {
  const { state, readCharacteristic, STATS_CHAR_UUID, INFO_CHAR_UUID } =
    useBleGlobal();
  const [totalSpins, setTotalSpins] = useState<number>(0);
  const [hitsPerCase, setHitsPerCase] = useState<number[]>(
    new Array(12).fill(0)
  );

  const responsive = useResponsive();

  useEffect(() => {
    async function loadData() {
      if (state.status !== "authenticated") return;

      try {
        const base64Info = await readCharacteristic(INFO_CHAR_UUID);
        if (base64Info) {
          const bytesInfo = Buffer.from(base64Info, "base64");
          const total = bytesInfo.readUInt32LE(2);
          setTotalSpins(total);
        }

        const base64Stats = await readCharacteristic(STATS_CHAR_UUID);
        if (base64Stats) {
          const bytesStats = Buffer.from(base64Stats, "base64");
          const hits = Array.from({ length: 12 }, (_, i) =>
            bytesStats.readUInt16LE(i * 2)
          );
          setHitsPerCase(hits);
        }
      } catch (error) {
        console.error(
          "Erreur durant la récupération des statistiques :",
          error
        );
      }
    }

    loadData();
  }, [state.status]);

  return (
<View style={[globalStyles.mainContainer, { flex: 1, flexDirection: "column", justifyContent: "space-between" }]}>

    <View style={[globalStyles.screen, { padding: responsive.number(16) }]}>
      <GradientText style={[globalStyles.textDegrade, { fontSize: responsive.fontSize(globalStyles.textDegrade.fontSize ?? 16) }]}
       text="Statistiques"/>
      <Text
        style={{
          fontSize: responsive.fontSize(globalStyles.buttonText.fontSize ?? 22),
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
          fontSize: responsive.fontSize(globalStyles.buttonText.fontSize ?? 22),
          fontWeight: "600",
          marginBottom: 20,
          color: "#ffffff",
        }}
      >
        Statistiques par case :
      </Text>

      {hitsPerCase.map((hits, index) => (
        <Text
          key={index}
          style={{ fontSize: responsive.fontSize(globalStyles.buttonText.fontSize ?? 22), marginVertical: 4, color: "#ffffff" }}
        >
          Case {index + 1} : {hits} hits
        </Text>
      ))}
    </View>
    </View>
  );
}
 