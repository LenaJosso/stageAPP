import React, { createContext, useContext, useState } from "react";
import { Lot, StockContextType } from "../type";

const StockContext = createContext<StockContextType | undefined>(undefined);

export const StockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stocks, setStocks] = useState<Lot[]>([]);

  const addLot = (newLot: Lot) => {
    setStocks((prevStocks) => {
      const existingIndex = prevStocks.findIndex(
        (lot) =>
          lot.name.trim().toLowerCase() === newLot.name.trim().toLowerCase() &&
          (lot.description ?? "").trim().toLowerCase() ===
            (newLot.description ?? "").trim().toLowerCase()
      );
      if (existingIndex !== -1) {
        const updated = [...prevStocks];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + newLot.quantity,
        };
        return updated;
      }
      return [...prevStocks, newLot];
    });
  };

  const deleteLot = (id: string) => {
    setStocks((prevStocks) => prevStocks.filter((lot) => lot.id !== id));
  };

  //retire N unités, supprime le lot si quantité tombe à 0
  const removeLotQuantity = (id: string, quantityToRemove: number) => {
    setStocks((prevStocks) =>
      prevStocks
        .map((lot) =>
          lot.id === id
            ? { ...lot, quantite: lot.quantity -quantityToRemove }
            : lot
        )
        .filter((lot) => lot.quantity > 0)
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