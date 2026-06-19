import React, { useState } from "react";
import { View, Text, FlatList, Pressable, Modal, TextInput } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useStock } from "./StockContext_12C";
import { globalStyles } from "../globalStyles";
import { RootStackParamList, Lot } from "../TYPE/type_12C";
import { GradientText } from "../GradientText";
import { useResponsive } from "../responsive";

export default function ViewStockScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "ViewStock">): React.JSX.Element {
  const { stocks, removeLotQuantity } = useStock();
  const responsive = useResponsive();

  const [selectedLot, setSelectedLot] = useState<Lot | null>(null);
  const [quantiteARetirer, setQuantiteARetirer] = useState("1");

  const ouvrirModal = (lot: Lot) => {
    setSelectedLot(lot);
    setQuantiteARetirer("1"); // reset à 1 à chaque ouverture
  };

  const fermerModal = () => {
    setSelectedLot(null);
    setQuantiteARetirer("1");
  };

  const handleConfirmer = () => {
    if (!selectedLot) return;

    const quantite = parseInt(quantiteARetirer, 10);

    if (isNaN(quantite) || quantite <= 0) return; // valeur invalide
    if (quantite > selectedLot.quantite) return;   // on ne peut pas retirer plus que le stock

    removeLotQuantity(selectedLot.id, quantite);
    fermerModal();
  };

  const quantiteSaisie = parseInt(quantiteARetirer, 10);
  const saisieInvalide =
    isNaN(quantiteSaisie) ||
    quantiteSaisie <= 0 ||
    (selectedLot !== null && quantiteSaisie > selectedLot.quantite);

  return (
    <View style={[globalStyles.mainContainer, { flex: 1, flexDirection: "column", justifyContent: "space-between" }]}>
      <View style={[globalStyles.screen, { padding: responsive.number(16) }]}>
        <GradientText
          style={[globalStyles.textDegrade, { fontSize: responsive.fontSize(globalStyles.textDegrade.fontSize ?? 16) }]}
          text="Liste du Stock"
        />

        {stocks.length === 0 ? (
          <Text style={globalStyles.emptyText}>Aucun produit en stock pour le moment.</Text>
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
                  onPress={() => ouvrirModal(item)} // ✅ ouvre le modal
                >
                  <Text style={globalStyles.deleteButtonText}>X</Text>
                </Pressable>
              </View>
            )}
          />
        )}
      </View>

      {/* ✅ Modal dans le JSX, contrôlé par l'état */}
      <Modal
        visible={selectedLot !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={fermerModal}
      >
        <View style={globalStyles.modalOverlay}>
          <View style={globalStyles.modalContainer}>

            <Text style={globalStyles.modalTitle}>Retirer du stock</Text>

            <Text style={{ textAlign: "center", marginBottom: 12, color: "white" }}>
              {selectedLot?.nom} — stock actuel :{" "}
              <Text style={{ fontWeight: "bold", color: "white" }}>{selectedLot?.quantite}</Text>
            </Text>

            <Text style={{ marginBottom: 6, color: "white" }}>Combien voulez-vous retirer ?</Text>

            {/* Sélecteur +/- */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <Pressable
                onPress={() =>
                  setQuantiteARetirer((v) =>
                    String(Math.max(1, (parseInt(v, 10) || 1) - 1))
                  )
                }
                style={{ padding: 8, borderWidth: 1, borderRadius: 6, borderColor: "white" }}
              >
                <Text style={{ fontSize: 18, color: "white" }}>−</Text>
              </Pressable>

              <TextInput
                value={quantiteARetirer}
                onChangeText={setQuantiteARetirer}
                keyboardType="numeric"
                style={{
                  borderWidth: 1,
                  borderRadius: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  minWidth: 60,
                  textAlign: "center",
                  fontSize: 18,
                  color: "white",
                  borderColor : "white"
                }}
              />

              <Pressable
                onPress={() =>
                  setQuantiteARetirer((v) => {
                    const next = (parseInt(v, 10) || 0) + 1;
                    return String(
                      selectedLot ? Math.min(next, selectedLot.quantite) : next
                    );
                  })
                }
                style={{ padding: 8, borderWidth: 1, borderRadius: 6, borderColor: "white" }}
              >
                <Text style={{ fontSize: 18, color: "white" }}>+</Text>
              </Pressable>
            </View>

            {/* Message d'erreur inline */}
            {saisieInvalide && (
              <Text style={{ color: "red", fontSize: 12, marginBottom: 8 }}>
                Quantite invalide (max : {selectedLot?.quantite})
              </Text>
            )}

            {/* Boutons */}
            <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
              <Pressable
                onPress={fermerModal}
                style={[globalStyles.deleteButton, { flex: 1 }]}
              >
                <Text style={globalStyles.deleteButtonText}>Annuler</Text>
              </Pressable>

              <Pressable
                onPress={handleConfirmer}
                disabled={saisieInvalide}
                style={[
                  globalStyles.deleteButton,
                  { flex: 1, opacity: saisieInvalide ? 0.4 : 1 },
                ]}
              >
                <Text style={globalStyles.deleteButtonText}>Confirmer</Text>
              </Pressable>
            </View>

          </View>
        </View>
      </Modal>
    </View>
  );
}