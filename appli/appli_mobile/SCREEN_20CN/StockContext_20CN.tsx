import React, { createContext, useContext, useState } from "react";
import { Lot, StockContextType } from "../TYPE/type_20CN";

const StockContext = createContext<StockContextType | undefined>(undefined);

export const StockProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [stocks, setStocks] = useState<Lot[]>([]);

  const addLot = (newLot: Lot) => {
    setStocks((prevStocks) => [...prevStocks, newLot]);
  };

  const deleteLot = (id: string) => {
    setStocks((prevStocks) => prevStocks.filter((lot) => lot.id !== id));
  };

  return (
    <StockContext.Provider value={{ stocks, addLot, deleteLot }}>
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
