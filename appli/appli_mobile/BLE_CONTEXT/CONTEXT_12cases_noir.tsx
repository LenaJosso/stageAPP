import React, { createContext, useContext } from "react";
import { useEsp32 } from "../USE ESP32/12_CASES_NOIR"; // A CHANGER SI ON CHANGE DE ROUE
import { BleContextType } from "../TYPE/type_12CN";

const BleContext = createContext<BleContextType | undefined>(undefined);

export const BleProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const bleValues = useEsp32();
  return (
    <BleContext.Provider value={bleValues}>{children}</BleContext.Provider>
  );
};

export const useBleGlobal = () => {
  const context = useContext(BleContext);
  if (!context)
    throw new Error("useBleGlobal doit être utilisé dans un BleProvider");
  return context;
};
