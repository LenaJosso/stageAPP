import { StyleSheet } from "react-native";

export const globalStyles = StyleSheet.create({
  // --- STYLES GENERAUX / ECRANS ---
  screen: {
    flex: 1,
    alignItems: "center",
    padding: 20,
    backgroundColor: "#000000", // Fond noir
  },
  textDegrade: {
    
    fontSize: 32,             // Réduit légèrement (40 pouvait forcer le texte à déborder)
    fontWeight: "bold",
    textAlign: "center",      // TRÈS IMPORTANT pour centrer le texte dans son propre bloc
    width: "100%",            // Force le texte à aller à la ligne si c'est trop long
  },
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 80,
    alignItems: "center",
    backgroundColor: "#000000", // Changé en noir (anciennement #f5f5f5)
  },
  mainContainer: {
    flex: 1,
    flexDirection: "column",
    backgroundColor: "#000000", 
  },
  
  rightContainer: {
    flex: 0.9,          // S'aligne aussi sur toute la hauteur
    justifyContent: 'center', // Centre le contenu (logo, texte) verticalement
    alignItems: 'center',    // Centre le contenu horizontalement 
  },
  
  
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 30,
    color: "#ee7f3e", // Orange d'origine (très visible sur noir)
  },
  status: {
    fontSize: 16,
    marginBottom: 10,
    color: "#e2e8f0", // Changé en gris clair (anciennement #374151)
    fontWeight: "bold",
  },
  info: {
    fontSize: 14,
    marginBottom: 10,
    color: "#94a3b8", // Changé en gris (anciennement #475569)
  },
  error: {
    color: "#f87171", // Rouge plus clair adapté au fond noir
    marginBottom: 10,
    fontWeight: "500",
  },

  // --- BOUTONS ---
  button: {
    backgroundColor: "#e33625",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    width: "75%",
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 19,
    fontWeight: "bold",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonValid: {
    backgroundColor: "#16a34a",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  btn: {
    backgroundColor: "#e33625",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  btnGray: {
    backgroundColor: "#4b5563", // Gris un peu plus clair pour le contraste
  },
  
  btnText: {
    color: "white",
    fontWeight: "bold",
  },

  // --- FORMULAIRES ---
  input: {
    width: "90%",
    backgroundColor: "#303030", 
    padding:15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#404040", // Bordure grise
    marginBottom: 35,
    fontSize: 16,
    color: "white", // Texte écrit en blanc
  },

  // --- LISTE DE STOCK ---
  emptyText: {
    color: "#64748b",
    fontSize: 16,
    fontStyle: "italic",
    marginTop : 20,
  },
  stockItem: {
    backgroundColor: "#303030", 
    padding: 15,
    borderRadius: 8,
    marginTop: 35,
    borderWidth: 1,
    borderColor: "#404040",
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  deleteButton: {
    backgroundColor: "#ef4444",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  deleteButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  itemNom: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#f1f5f9", // Changé en blanc/gris très clair (anciennement #334155)
  },
  itemDesc: {
    fontSize: 14,
    color: "#94a3b8", // Changé en gris clair (anciennement #64748b)
    marginTop: 4,
  },

  // --- MODAL / PIN ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)", // Superposition plus sombre
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "85%",
    backgroundColor: "#1e293b", // Fond du modal sombre (anciennement white)
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#f8fafc", // Texte blanc/gris clair (anciennement #0f172a)
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#94a3b8", // Gris clair (anciennement #475569)
    textAlign: "center",
    marginBottom: 20,
  },
  pinInput: {
    width: "100%",
    letterSpacing: 8,
    textAlign: "center",
    backgroundColor: "#0f172a", // Fond input PIN sombre (anciennement #f8fafc)
    borderWidth: 2,
    borderColor: "#475569",
    borderRadius: 8,
    paddingVertical: 12,
    fontSize: 22,
    fontWeight: "bold",
    color: "#f1f5f9", // Texte blanc (anciennement #1e293b)
    marginBottom: 15,
  },
  modalRowButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 10,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnCancel: {
    backgroundColor: "#334155", // Bouton annuler sombre (anciennement #f1f5f9)
    borderWidth: 1,
    borderColor: "#475569",
  },
  modalBtnConfirm: {
    backgroundColor: "#16a34a",
  },
  modalBtnTextCancel: {
    color: "#cbd5e1", // Texte gris clair (anciennement #475569)
    fontWeight: "bold",
  },
  essaisText: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 15,
    fontStyle: "italic",
  },

  // COMMANDE ROUE & HISTORIQUE
  rowButtons: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 15,
  },
  btnCommande: {
    justifyContent: "center",
    alignItems: "center",
    width: 40,
    height: 40,
    borderRadius: 27.5,
  },
  rowActionGrid: {
    flexDirection: "row",
    gap: 20,
    marginTop: 25,
  },
  btnSpin: {
    justifyContent: "center",
    alignItems: "center",
    width: 110,
    height: 70,
    borderRadius: 15,
    backgroundColor: "#30303D",
  },
  sidebar: {
    height: "10%", // Prend environ 10% de la hauteur de l'écran
    width: "100%", // Prend toute la largeur désormais
    backgroundColor: "#171717",
    borderTopWidth: 1, // Bordure sur le dessus plutôt qu'à droite
    borderTopColor: "#242424",
    paddingTop: 8, // Réduit pour s'adapter à un petit espace de 10%
    paddingHorizontal: 12,
    flexDirection: "row", // Optionnel : pour aligner le titre et la liste côte à côte si tu veux gagner de la place
    alignItems: "center",
  },

  textSibebar:{
    flexDirection: "row",
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    textAlignVertical :"top",
  textAlign: "center"

  },
 
  customSidebar: {
    flexDirection: "row",          // Aligne les boutons horizontalement
          justifyContent: "space-around",
          alignItems: "center",         
          width: "100%",                 
          height: "10%",           
          backgroundColor: "#000000",    
  },
  buttonSidebar: {
    width: "100%",
    height : "100%",
    backgroundColor: "#303030", 
    borderWidth: 1,
    borderRightWidth:1,
    borderColor: "#404040",
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
      
  },

  sidebarTitle: {
    fontSize: 14,
    marginRight: 10, // Un peu d'espace si aligné en ligne
    color: "#f1f5f9",
    fontWeight: "bold",
  },
  ledContainer: {
    position: "absolute",
    width: 10,
    height: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  led: {
    width: 12,
    height: 12,
    borderRadius: 10,
    backgroundColor: "#a3a3a3",
    borderWidth: 1,
    borderColor: "#737373",
  },
  sidebarScroll: {
    flexDirection: "row", // Permet à l'historique de défiler horizontalement de gauche à droite !
    gap: 15, // Espace entre chaque élément de l'historique
    alignItems: "center",
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#242424", // Un petit fond pour détacher les items s'ils défilent horizontalement
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  historyIndex: {
    fontWeight: "bold",
    marginRight: 5,
    color: "#64748b",
  },
  historyText: {
    color: "#f1f5f9", // Texte blanc (anciennement #333)
    fontWeight: "600",
  },
  emptyHistory: {
    textAlign: "center",
    color: "#64748b",
    fontStyle: "italic",
    marginTop: 20,
  },
});
