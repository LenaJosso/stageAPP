import React from "react";
import Svg, { G, Path, Text as SvgText } from "react-native-svg";

interface Quartier {
  id: string | number;
  label: string;
  couleur: string;
  valeur?: number; // optionnel — défaut 1 (cases égales)
}

interface RoueProps {
  donnees: Quartier[];
  taille?: number;
}

export const Roue: React.FC<RoueProps> = ({ donnees, taille = 300 }) => {
  const rayon = taille / 2;
  const centre = taille / 2;

  const totalValeurs = donnees.reduce((sum, q) => sum + (q.valeur ?? 1), 0);
  let angleDepart = 0;

  return (
    <Svg width={taille} height={taille} viewBox={`0 0 ${taille} ${taille}`}>
      <G>
        {/*tous les calculs permettant le calcul du desing de la roue selon le nombre
        de quartier donné par l'esp */}
        {donnees.map((quartier) => {
          const valeur = quartier.valeur ?? 1;
          const angleQuartier = (valeur / totalValeurs) * 360;
          const angleFin = angleDepart + angleQuartier;

          const radDepart = (angleDepart - 90) * (Math.PI / 180);
          const radFin    = (angleFin    - 90) * (Math.PI / 180);

          const x1 = centre + rayon * Math.cos(radDepart);
          const y1 = centre + rayon * Math.sin(radDepart);
          const x2 = centre + rayon * Math.cos(radFin);
          const y2 = centre + rayon * Math.sin(radFin);

          const grandArc = angleQuartier > 180 ? 1 : 0;

          const cheminD = `
            M ${centre} ${centre}
            L ${x1} ${y1}
            A ${rayon} ${rayon} 0 ${grandArc} 1 ${x2} ${y2}
            Z
          `;

          const angleTexte = angleDepart + angleQuartier / 2 - 90;
          const radTexte   = angleTexte * (Math.PI / 180);
          const xTexte     = centre + rayon * 0.6 * Math.cos(radTexte);
          const yTexte     = centre + rayon * 0.6 * Math.sin(radTexte);

          angleDepart = angleFin;

          return (
            <G key={quartier.id}>
              <Path
                d={cheminD}
                fill={quartier.couleur}
                stroke="#404040"
                strokeWidth="2"
              />
              <SvgText
                x={xTexte}
                y={yTexte}
                fill="#ffffff"
                textAnchor="middle"
                alignmentBaseline="central"
                fontSize="14"
                fontWeight="bold"
              >
                {quartier.label}
              </SvgText>
            </G>
          );
        })}
      </G>
    </Svg>
  );
};