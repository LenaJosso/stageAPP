import React from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useStock } from "./StockContext_20CN";
import { globalStyles } from "../globalStyles";
import { RootStackParamList, Lot } from "../TYPE/type_20CN";
import { GradientText } from "../GradientText";

export default function ViewStockScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "ViewStock">): React.JSX.Element {
  const { stocks, deleteLot } = useStock();

  return (
<View style={globalStyles.mainContainer}>
    
          {/* CONTENU PRINCIPAL (MILIEU) */}
          <View style={globalStyles.screen}>
          <GradientText style={globalStyles.textDegrade} text="Liste du Stock"/>

      {stocks.length === 0 ? (
        <Text style={globalStyles.emptyText}>
          Aucun produit en stock pour le moment.
        </Text>
      ) : (
        <FlatList
          data={stocks}
          keyExtractor={(item) => item.id}
          style={{ width: "100%" }}
          renderItem={({ item }) => (
            <View style={globalStyles.stockItem}>
              <View style={{ flex: 1 }}>
                <Text style={globalStyles.itemNom}>
                  {item.nom} (x{item.quantite})
                </Text>
                {item.description ? (
                  <Text style={globalStyles.itemDesc}>{item.description}</Text>
                ) : null}
              </View>
              <Pressable
                style={globalStyles.deleteButton}
                onPress={() => deleteLot(item.id)}
              >
                <Text style={globalStyles.deleteButtonText}>X</Text>
                </Pressable>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}

