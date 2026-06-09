import React from "react";
import Svg, { Path } from "react-native-svg";

export const Triangle = () => {
  return (
    <Svg width="20" height="20" viewBox="0 0 20 20">
      <Path d="M 0 0 L 20 0 L 10 20 Z" fill="#30303D" />
      {/* 2 chiffres apres chaque lettre = axe x et y
      M= move to, c'est le pt de depart
        L 20 0= line to (trace droite horizontale)
        L 10 20 = trace deuxième droite depuis 20, 0 jusqu'au point 10, 20
        On descend de 20 unités en Y et on se place au milieu (10) en X
        Z = close et ferme auto la forme en traceant entre 2 pt
      */}
    </Svg>
  );
};

export default Triangle;
