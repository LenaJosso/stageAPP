import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList, Lot } from "../type";
import { useStock } from "./StockContext";
import { GradientText } from "../GradientText";
import { globalStyles } from "../globalStyles";
import { useResponsive } from "../responsive";


export default function AddLotScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "AddLot">): React.JSX.Element {
  const { addLot } = useStock();
  const [name, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantite] = useState("");

  const responsive = useResponsive();

  const handleValidation = () => {
    if (!name || !quantity) {
      alert("Veuillez remplir au moins le nom et la quantité.");
      return;
    }
    const newLot: Lot = {
      id: Date.now().toString(),
      name,
      description,
      quantity: parseInt(quantity, 10),
    };
    addLot(newLot);
    navigation.goBack();
  };

  return (
    <View style={[globalStyles.mainContainer, { flex: 1, flexDirection: "column", justifyContent: "space-between" }]}>

      {/* CONTENU PRINCIPAL (MILIEU) */}
      <View style={[globalStyles.screen, { padding: responsive.number(16) }]}>
        <GradientText
          style={[globalStyles.textDegrade, { fontSize: responsive.fontSize(globalStyles.textDegrade.fontSize ?? 16) }]}
          text="Ajouter un lot "
        />

        <TextInput
          style={[
            globalStyles.input,
            {
              marginTop: responsive.number(35),
              fontSize: responsive.fontSize(globalStyles.input.fontSize ?? 16),
              paddingVertical: responsive.number(12),
              paddingHorizontal: responsive.number(12),
            },
          ]}
          placeholder="Nom du produit"
          placeholderTextColor="#ffffff"
          value={name}
          onChangeText={setNom}
        />
        <TextInput
          style={[
            globalStyles.input,
            {
              fontSize: responsive.fontSize(globalStyles.input.fontSize ?? 16),
              paddingVertical: responsive.number(12),
              paddingHorizontal: responsive.number(12),
            },
          ]}
          placeholder="Description"
          placeholderTextColor="#ffffff"
          value={description}
          onChangeText={setDescription}
        />
        <TextInput
          style={[
            globalStyles.input,
            {
              fontSize: responsive.fontSize(globalStyles.input.fontSize ?? 16),
              paddingVertical: responsive.number(12),
              paddingHorizontal: responsive.number(12),
            },
          ]}
          placeholder="Quantite"
          placeholderTextColor="#ffffff"
          value={quantity}
          onChangeText={(text) => setQuantite(text.replace(/[^0-9]/g, ""))}
          keyboardType="numeric"
        />

        <Pressable
          style={[
            globalStyles.button,
            {
              marginTop: responsive.number(20),
              paddingVertical: responsive.number(12),
              paddingHorizontal: responsive.number(24),
            },
          ]}
          onPress={handleValidation}
        >
          <Text style={[globalStyles.buttonText, { fontSize: responsive.fontSize(globalStyles.buttonText.fontSize ?? 16) }]}>
            Ajouter le lot
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
