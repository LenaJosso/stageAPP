import React, { createContext, useContext, useState } from "react";
import { Lot, StockContextType } from "../TYPE/type_12C";

const StockContext = createContext<StockContextType | undefined>(undefined);

export const StockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stocks, setStocks] = useState<Lot[]>([]);

  const addLot = (newLot: Lot) => {
    setStocks((prevStocks) => {
      const existingIndex = prevStocks.findIndex(
        (lot) =>
          lot.nom.trim().toLowerCase() === newLot.nom.trim().toLowerCase() &&
          (lot.description ?? "").trim().toLowerCase() ===
            (newLot.description ?? "").trim().toLowerCase()
      );
      if (existingIndex !== -1) {
        const updated = [...prevStocks];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantite: updated[existingIndex].quantite + newLot.quantite,
        };
        return updated;
      }
      return [...prevStocks, newLot];
    });
  };

  const deleteLot = (id: string) => {
    setStocks((prevStocks) => prevStocks.filter((lot) => lot.id !== id));
  };

  // ✅ Nouveau : retire N unités, supprime le lot si quantité tombe à 0
  const removeLotQuantity = (id: string, quantiteARetirer: number) => {
    setStocks((prevStocks) =>
      prevStocks
        .map((lot) =>
          lot.id === id
            ? { ...lot, quantite: lot.quantite - quantiteARetirer }
            : lot
        )
        .filter((lot) => lot.quantite > 0)
    );
  };

  return (
    <StockContext.Provider value={{ stocks, addLot, deleteLot, removeLotQuantity }}>
      {children}
    </StockContext.Provider>
  );
};

export const useStock = () => {
  const context = useContext(StockContext);
  if (!context)
    throw new Error("useStock doit être utilisé dans un StockProvider");
  return context;
};