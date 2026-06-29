import React, { createContext, useContext } from "react";
import { useEsp32 } from "./useesp32";

// Le type du contexte est directement dérivé du hook — plus besoin de BleContextType séparé.
type BleContextValue = ReturnType<typeof useEsp32>;

const BleContext = createContext<BleContextValue | undefined>(undefined);

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