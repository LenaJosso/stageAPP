import React, { useState } from "react";
import { View, Text, FlatList, Pressable, TextInput, Modal } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useStock } from "./StockContext_20CN";
import { globalStyles } from "../globalStyles";
import { RootStackParamList, Lot } from "../TYPE/type_20CN";
import { GradientText } from "../GradientText";
import { useResponsive } from "../responsive";

export default function ViewStockScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "ViewStock">): React.JSX.Element {
 const { stocks, removeLotQuantity } = useStock();
   const responsive = useResponsive();
 
   const [selectedLot, setSelectedLot] = useState<Lot | null>(null);
   const [quantityToRemove, setquantityToRemove] = useState("1");
 
   const openModal = (lot: Lot) => {
     setSelectedLot(lot);
     setquantityToRemove("1"); // reset à 1 à chaque ouverture
   };
 
   const closeModal = () => {
     setSelectedLot(null);
     setquantityToRemove("1");
   };
 
   const handleConfirmation = () => {
     if (!selectedLot) return;
 
     const quantity = parseInt(quantityToRemove, 10);
 
     if (isNaN(quantity) || quantity <= 0) return; // valeur invalide
     if (quantity > selectedLot.quantity) return;   // on ne peut pas retirer plus que le stock
 
     removeLotQuantity(selectedLot.id, quantity);
     closeModal();
   };
 
   const quantityEntry = parseInt(quantityToRemove, 10);
   const invalidEntry =
     isNaN(quantityEntry) ||
     quantityEntry <= 0 ||
     (selectedLot !== null && quantityEntry > selectedLot.quantity);
 
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
                     {item.name} (x{item.quantity})
                   </Text>
                   {item.description ? (
                     <Text style={globalStyles.itemDesc}>{item.description}</Text>
                   ) : null}
                 </View>
 
                 <Pressable
                   style={globalStyles.deleteButton}
                   onPress={() => openModal(item)} // ✅ ouvre le modal
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
         onRequestClose={closeModal}
       >
         <View style={globalStyles.modalOverlay}>
           <View style={globalStyles.modalContainer}>
 
             <Text style={globalStyles.modalTitle}>Retirer du stock</Text>
 
             <Text style={{ textAlign: "center", marginBottom: 12, color: "white" }}>
               {selectedLot?.name} — stock actuel :{" "}
               <Text style={{ fontWeight: "bold", color: "white" }}>{selectedLot?.quantity}</Text>
             </Text>
 
             <Text style={{ marginBottom: 6, color: "white" }}>Combien voulez-vous retirer ?</Text>
 
             {/* Sélecteur +/- */}
             <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
               <Pressable
                 onPress={() =>
                   setquantityToRemove((v) =>
                     String(Math.max(1, (parseInt(v, 10) || 1) - 1))
                   )
                 }
                 style={{ padding: 8, borderWidth: 1, borderRadius: 6, borderColor: "white" }}
               >
                 <Text style={{ fontSize: 18, color: "white" }}>−</Text>
               </Pressable>
 
               <TextInput
                 value={quantityToRemove}
                 onChangeText={setquantityToRemove}
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
                   setquantityToRemove((v) => {
                     const next = (parseInt(v, 10) || 0) + 1;
                     return String(
                       selectedLot ? Math.min(next, selectedLot.quantity) : next
                     );
                   })
                 }
                 style={{ padding: 8, borderWidth: 1, borderRadius: 6, borderColor: "white" }}
               >
                 <Text style={{ fontSize: 18, color: "white" }}>+</Text>
               </Pressable>
             </View>
 
             {/* Message d'erreur inline */}
             {invalidEntry && (
               <Text style={{ color: "red", fontSize: 12, marginBottom: 8 }}>
                 Quantite invalide (max : {selectedLot?.quantity})
               </Text>
             )}
 
             {/* Boutons */}
             <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
               <Pressable
                 onPress={closeModal}
                 style={[globalStyles.deleteButton, { flex: 1 }]}
               >
                 <Text style={globalStyles.deleteButtonText}>Annuler</Text>
               </Pressable>
 
               <Pressable
                 onPress={handleConfirmation}
                 disabled={invalidEntry}
                 style={[
                   globalStyles.deleteButton,
                   { flex: 1, opacity:invalidEntry ? 0.4 : 1 },
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
