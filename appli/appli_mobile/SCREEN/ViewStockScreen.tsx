 import React, { useState } from "react";
import { View, Text, FlatList, Pressable, Modal, TextInput } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useStock } from "./StockContext";
import { globalStyles } from "../DESIGN/globalStyles";
import { RootStackParamList, Lot } from "../type";
import { GradientText } from "../DESIGN/GradientText";
import { useResponsive } from "../DESIGN/responsive";

export default function ViewStockScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "ViewStock">): React.JSX.Element {
  // On récupère la liste des lots et l'action de retrait depuis le contexte global du stock
  const { stocks, removeLotQuantity } = useStock();
  const responsive = useResponsive();

  // Lot actuellement sélectionné pour un retrait (null = aucune modal ouverte)
  const [selectedLot, setSelectedLot] = useState<Lot | null>(null);
  // Quantité à retirer, stockée en string car liée directement au TextInput
  const [quantityToRemove, setquantityToRemove] = useState("1");

  // Ouvre la modal de retrait pour un lot donné et réinitialise la quantité à 1
  const openModal = (lot: Lot) => {
    setSelectedLot(lot);
    setquantityToRemove("1"); 
  };

  // Ferme la modal et réinitialise les états liés au retrait
  const closeModal = () => {
    setSelectedLot(null);
    setquantityToRemove("1");
  };

  // Valide et applique le retrait de quantité sur le lot sélectionné
  const handleConfirmation = () => {
    if (!selectedLot) return;

    const quantity = parseInt(quantityToRemove, 10);

    // Protections de sécurité poussées
    // On bloque si la valeur n'est pas un nombre valide, négative/nulle,
    // ou si elle dépasse la quantité réellement disponible dans le lot
    if (isNaN(quantity) || quantity <= 0) return; 
    if (quantity > selectedLot.quantity) return;   

    // SÉCURISATION : On passe explicitement l'identifiant brut et le nombre casté
    removeLotQuantity(selectedLot.id, quantity);
    
    closeModal();
  };

  // Calcul dérivé (recalculé à chaque render) pour savoir si la quantité saisie est invalide,
  // utilisé à la fois pour désactiver le bouton "Confirmer" et afficher le message d'erreur
  const quantityEntry = parseInt(quantityToRemove, 10);
  const invalidEntry =
    isNaN(quantityEntry) ||
    quantityEntry <= 0 ||
    (selectedLot !== null && quantityEntry > selectedLot.quantity);

  return (
    <View style={[globalStyles.mainContainer, { flex: 1, flexDirection: "column", justifyContent: "space-between" }]}>
      <View style={[globalStyles.screen, { padding: responsive.number(16), flex: 1 }]}>
        <GradientText
          style={[globalStyles.textDegrade, { fontSize: responsive.fontSize(globalStyles.textDegrade.fontSize ?? 16) }]}
          text="Liste du Stock"
        />

        {/* Affiche un message si le stock est vide, sinon la liste des lots */}
        {stocks.length === 0 ? (
          <Text style={[globalStyles.emptyText, { fontSize: responsive.fontSize(14), marginTop: responsive.number(20) }]}>
            Aucun produit en stock pour le moment.
          </Text>
        ) : (
          <FlatList
            data={stocks}
            keyExtractor={(item) => String(item.id)} // Sécurise la clé en String
            style={{ width: "100%", marginTop: responsive.number(10) }}
            renderItem={({ item }) => (
              <View style={[globalStyles.stockItem, { padding: responsive.number(12), marginBottom: responsive.number(8) }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[globalStyles.itemNom, { fontSize: responsive.fontSize(16) }]}>
                    {item.name} (x{item.quantity})
                  </Text>
                  {item.description ? (
                    <Text style={[globalStyles.itemDesc, { fontSize: responsive.fontSize(13), marginTop: responsive.number(4) }]}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>

                {/* Le bouton "X" ouvre la modal de retrait plutôt que de supprimer directement le lot */}
                <Pressable
                  style={[globalStyles.deleteButton, { padding: responsive.number(8) }]}
                  onPress={() => openModal(item)}
                >
                  <Text style={[globalStyles.deleteButtonText, { fontSize: responsive.fontSize(14) }]}>X</Text>
                </Pressable>
              </View>
            )}
          />
        )}
      </View>

      {/* Modal Responsive et Sécurisé */}
      {/* La modal est visible dès qu'un lot est sélectionné (selectedLot !== null) */}
      <Modal
        visible={selectedLot !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={globalStyles.modalOverlay}>
          <View style={[globalStyles.modalContainer, { padding: responsive.number(20), width: "85%", maxWidth: responsive.number(340) }]}>

            <Text style={[globalStyles.modalTitle, { fontSize: responsive.fontSize(18), marginBottom: responsive.number(10) }]}>
              Retirer du stock
            </Text>

            <Text style={{ textAlign: "center", marginBottom: responsive.number(12), color: "white", fontSize: responsive.fontSize(14) }}>
              {selectedLot?.name} — stock actuel :{" "}
              <Text style={{ fontWeight: "bold", color: "white" }}>{selectedLot?.quantity}</Text>
            </Text>

            <Text style={{ marginBottom: responsive.number(8), color: "white", fontSize: responsive.fontSize(13) }}>
              Combien voulez-vous retirer ?
            </Text>

            {/* Sélecteur +/- Responsive */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: responsive.number(12), marginBottom: responsive.number(8) }}>
              {/* Bouton "-" : ne descend jamais en dessous de 1 */}
              <Pressable
                onPress={() =>
                  setquantityToRemove((v) =>
                    String(Math.max(1, (parseInt(v, 10) || 1) - 1))
                  )
                }
                style={{ padding: responsive.number(10), borderWidth: 1, borderRadius: responsive.number(6), borderColor: "white" }}
              >
                <Text style={{ fontSize: responsive.fontSize(18), color: "white", fontWeight: "bold" }}>−</Text>
              </Pressable>

              {/* Saisie manuelle de la quantité, filtrée pour n'accepter que des chiffres */}
              <TextInput
                value={quantityToRemove}
                onChangeText={(text) => setquantityToRemove(text.replace(/[^0-09]/g, ''))} // Filtre pour ne garder que les chiffres requis
                keyboardType="numeric"
                style={{
                  borderWidth: 1,
                  borderRadius: responsive.number(6),
                  paddingHorizontal: responsive.number(12),
                  paddingVertical: responsive.number(6),
                  minWidth: responsive.number(70),
                  textAlign: "center",
                  fontSize: responsive.fontSize(16),
                  color: "white",
                  borderColor: "white"
                }}
              />

              {/* Bouton "+" : plafonné à la quantité disponible dans le lot sélectionné */}
              <Pressable
                onPress={() =>
                  setquantityToRemove((v) => {
                    const next = (parseInt(v, 10) || 0) + 1;
                    return String(
                      selectedLot ? Math.min(next, selectedLot.quantity) : next
                    );
                  })
                }
                style={{ padding: responsive.number(10), borderWidth: 1, borderRadius: responsive.number(6), borderColor: "white" }}
              >
                <Text style={{ fontSize: responsive.fontSize(18), color: "white", fontWeight: "bold" }}>+</Text>
              </Pressable>
            </View>

            {/* Message d'erreur inline, affiché seulement si la saisie est invalide */}
            {invalidEntry && (
              <Text style={{ color: "#ff4d4d", fontSize: responsive.fontSize(12), marginBottom: responsive.number(8), textAlign: "center" }}>
                Quantité invalide (max : {selectedLot?.quantity})
              </Text>
            )}

            {/* Zone de Validation */}
            <View style={{ flexDirection: "row", gap: responsive.number(12), marginTop: responsive.number(10), width: "100%" }}>
              <Pressable
                onPress={closeModal}
                style={[globalStyles.deleteButton, { flex: 1, paddingVertical: responsive.number(10) }]}
              >
                <Text style={[globalStyles.deleteButtonText, { fontSize: responsive.fontSize(14) }]}>Annuler</Text>
              </Pressable>

              {/* Bouton désactivé tant que la quantité saisie n'est pas valide */}
              <Pressable
                onPress={handleConfirmation}
                disabled={invalidEntry}
                style={[
                  globalStyles.deleteButton,
                  { flex: 1, paddingVertical: responsive.number(10), opacity: invalidEntry ? 0.4 : 1 },
                ]}
              >
                <Text style={[globalStyles.deleteButtonText, { fontSize: responsive.fontSize(14) }]}>Confirmer</Text>
              </Pressable>
            </View>

          </View>
        </View>
      </Modal>
    </View>
  );
}