import { StyleSheet } from "react-native";

export const globalStyles = StyleSheet.create({
  // --- STYLES GENERAUX / ECRANS ---
  screen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#000000", // Fond noir
  },
  textDegrade: {
    fontSize: 40,
    fontWeight: "bold",
    justifyContent: "center",
    alignContent: "center",
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
    flexDirection: "row",
    backgroundColor: "#000000", // Changé en noir (anciennement #fff)
  },
  leftContainer: {
    flex: 3,
    alignItems: "center",
    alignContent: "center",
    padding: 10,
    backgroundColor: "#000000", // Assure le fond noir au centre
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
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: "100%",
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
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  btnGray: {
    backgroundColor: "#4b5563", // Gris un peu plus clair pour le contraste
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  btnText: {
    color: "white",
    fontWeight: "bold",
  },
  texteEnHaut: {
    color: "ff0000",
  },

  // --- FORMULAIRES ---
  input: {
    width: "100%",
    backgroundColor: "#1e293b", // Fond d'input sombre (anciennement white)
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#475569", // Bordure grise
    marginBottom: 15,
    fontSize: 16,
    color: "white", // Texte écrit en blanc
  },

  // --- LISTE DE STOCK ---
  emptyText: {
    color: "#64748b",
    fontSize: 16,
    fontStyle: "italic",
  },
  stockItem: {
    backgroundColor: "#1e293b", // Fond d'item sombre (anciennement white)
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#334155",
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
    width: 55,
    height: 55,
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
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: "#334155",
    backgroundColor: "#0f172a",
    paddingTop: 40,
    paddingHorizontal: 10,
  },
  // Style mis à jour pour ton menu déroulant sur le côté gauche
  customSidebar: {
    width: 210,
    backgroundColor: "#171717", // Fond noir/bleuté très sombre pour distinguer le menu
    borderRightWidth: 1,
    borderRightColor: "#242424",
    paddingTop: 50,
    paddingHorizontal: 12,
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#f1f5f9", // Texte blanc (anciennement #333)
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
    paddingBottom: 20,
  },
  historyItem: {
    flexDirection: "row",
    backgroundColor: "#1e293b", // Fond d'historique sombre (anciennement #fff)
    padding: 8,
    borderRadius: 5,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#334155",
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
