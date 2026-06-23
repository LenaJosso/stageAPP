import React, { createContext, useContext, useState } from "react";
import { useEsp32, WheelConfig, WHEEL_12_SIMPLE, WHEEL_12_LEDS } from "../useesp32"; // Ajustez le chemin
import { BleContextType } from "../type"; // Assurez-vous que BleContextType correspond à ce que retourne useEsp32

// Création du contexte
const BleContext = createContext<ReturnType<typeof useEsp32> | undefined>(undefined);

interface BleProviderProps {
  children: React.ReactNode;
  initialConfig?: WheelConfig; // Permet de définir une roue par défaut (ex: WHEEL_12_SIMPLE)
}

export const BleProvider: React.FC<BleProviderProps> = ({
  children,
  initialConfig = WHEEL_12_LEDS, // Configuration par défaut si non fournie
}) => {
  // Optionnel : Si vous voulez pouvoir changer de type de roue dynamiquement dans l'app
  const [currentConfig, setCurrentConfig] = useState<WheelConfig>(initialConfig);

  // Appel du hook avec la configuration active
  const bleValues = useEsp32(currentConfig);

  // On expose les valeurs du hook, et on y ajoute la possibilité de changer de config si besoin
  const contextValue = {
    ...bleValues,
    changeWheelConfig: setCurrentConfig, // Nouvelle fonction pratique pour switcher de roue
  };

  return (
    <BleContext.Provider value={contextValue}>
      {children}
    </BleContext.Provider>
  );
};

// Hook personnalisé pour consommer le contexte global
export const useBleGlobal = () => {
  const context = useContext(BleContext);
  if (!context) {
    throw new Error("useBleGlobal doit être utilisé à l'intérieur d'un BleProvider");
  }
  return context;
};