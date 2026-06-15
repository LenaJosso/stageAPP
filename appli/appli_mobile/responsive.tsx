import { useState, useEffect } from "react";
import { Dimensions } from "react-native";

const BaseWidth = 375;

export function useResponsive() {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription.remove();
  }, []);

  const scale = (size: number) => (dimensions.width / BaseWidth) * size;
  const moderateScale = (size: number, factor = 0.5) =>
    size + (scale(size) - size) * factor;

  // Export des outils de responsiveness pour les utiliser dans l'application
  return {
    // Note : Utiliser un facteur de 1 ici revient exactement à faire un simple `scale(size)`.
    fontSize: (size: number) => moderateScale(size, 1),
    number: (n: number) => moderateScale(n, 1),
    deviceWidth: dimensions.width,
    deviceHeight: dimensions.height,
  };
}