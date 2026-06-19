import { useEsp32 } from "../USE ESP32/12_CASES";
export type BleContextType = ReturnType<typeof useEsp32>;

export type RootStackParamList = {
  Home: undefined;
  AddLot: undefined;
  ViewStock: undefined;
  ConnexionBluetooth: undefined;
  Commande: undefined;
  Statistics: undefined;
};

//Definition lot
export type Lot = {
  id: string;
  nom: string;
  description: string;
  quantite: number;
};

//Definition stocks
export type StockContextType = {
  stocks: Lot[];
  addLot: (newLot: Lot) => void;
  deleteLot: (id: string) => void;
  removeLotQuantity: (id: string, quantite: number) => void
};
