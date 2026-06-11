import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList, Lot } from "../TYPE/type_20CN";
import { useStock } from "./StockContext_20CN";
import { globalStyles } from "../globalStyles";
import { GradientText } from "../GradientText";

export default function AddLotScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "AddLot">): React.JSX.Element {
  const { addLot } = useStock();
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [quantite, setQuantite] = useState("");

  const handleValidation = () => {
    if (!nom || !quantite) {
      alert("Veuillez remplir au moins le nom et la quantité.");
      return;
    }
    const newLot: Lot = {
      id: Date.now().toString(),
      nom,
      description,
      quantite: parseInt(quantite, 10),
    };
    addLot(newLot);
    navigation.goBack();
  };

  return (
      <View style={globalStyles.mainContainer}>
      
            {/* CONTENU PRINCIPAL (MILIEU) */}
            <View style={globalStyles.screen}>
         <GradientText
                  style={globalStyles.textDegrade}
                  text="Ajouter un lot "
                />
        <TextInput
          style={[globalStyles.input, {marginTop:35}]}
          placeholder="Nom du produit"
          value={nom}
          onChangeText={setNom}
        />
        <TextInput
          style={globalStyles.input}
          placeholder="Description"
          value={description}
          onChangeText={setDescription}
        />
        <TextInput
          style={globalStyles.input}
          placeholder="Quantité"
          value={quantite}
          onChangeText={(text) => setQuantite(text.replace(/[^0-9]/g, ""))}
        />
        <Pressable style={globalStyles.button} onPress={handleValidation}>
          <Text style={globalStyles.buttonText}>Ajouter le lot</Text>
        </Pressable>
      </View>
          </View>
    );
  }
