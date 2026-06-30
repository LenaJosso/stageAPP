import React, { createContext, useContext, useState } from "react";
import { Lot, StockContextType } from "../type";

// Contexte React permettant de partager l'état du stock (liste des lots)
// et ses actions (ajout/suppression/retrait de quantité) à toute l'application
const StockContext = createContext<StockContextType | undefined>(undefined);

export const StockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Liste des lots en stock, chacun identifié par un id unique
  const [stocks, setStocks] = useState<Lot[]>([]);

  // Ajoute un nouveau lot au stock.
  // Si un lot avec le même nom ET la même description existe déjà (comparaison insensible
  // à la casse et aux espaces superflus), on fusionne les quantités au lieu de créer un doublon.
  const addLot = (newLot: Lot) => {
    setStocks((prevStocks) => {
      const existingIndex = prevStocks.findIndex(
        (lot) =>
          lot.name.trim().toLowerCase() === newLot.name.trim().toLowerCase() &&
          (lot.description ?? "").trim().toLowerCase() ===
            (newLot.description ?? "").trim().toLowerCase()
      );
      if (existingIndex !== -1) {
        // Lot identique trouvé : on additionne simplement la quantité au lot existant
        const updated = [...prevStocks];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + newLot.quantity,
        };
        return updated;
      }
      // Aucun lot correspondant : on ajoute le nouveau lot tel quel
      return [...prevStocks, newLot];
    });
  };

  // Supprime entièrement un lot du stock, quelle que soit sa quantité restante
  const deleteLot = (id: string) => {
    setStocks((prevStocks) => prevStocks.filter((lot) => lot.id !== id));
  };

  //retire N unités, supprime le lot si quantité tombe à 0
  // Diminue la quantité d'un lot précis. Si la quantité résultante est nulle ou négative,
  // le lot est automatiquement retiré du stock (filter() élimine les quantités <= 0).
  const removeLotQuantity = (id: string, quantityToRemove: number) => {
    setStocks((prevStocks) =>
      prevStocks
        .map((lot) =>
          lot.id === id
            ? { ...lot, quantity: lot.quantity - quantityToRemove } // on retire la quantité demandée
            : lot
        )
        .filter((lot) => lot.quantity > 0) // Supprime automatiquement si <= 0
    );
  };

  // Expose l'état du stock et toutes les actions associées à tous les composants enfants
  return (
    <StockContext.Provider value={{ stocks, addLot, deleteLot, removeLotQuantity }}>
      {children}
    </StockContext.Provider>
  );
};

// Hook d'accès au contexte du stock. Lève une erreur explicite si utilisé
// en dehors d'un StockProvider, pour éviter un context undefined silencieux
export const useStock = () => {
  const context = useContext(StockContext);
  if (!context)
    throw new Error("useStock doit être utilisé dans un StockProvider");
  return context;
};