import React from "react";
import { Text, TextStyle, StyleProp } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";

// 1. On définit le type des props que le composant accepte
interface GradientTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
}

export function GradientText({ text, style }: GradientTextProps) {
  return (
    // Correction de 'transparant' -> 'transparent'
    <MaskedView
      maskElement={
        <Text style={[style, { backgroundColor: "transparent" }]}>{text}</Text>
      }
    >
      <LinearGradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        colors={["red", "yellow"]}
      >
        <Text style={[style, { opacity: 0 }]}>{text}</Text>
      </LinearGradient>
    </MaskedView>
  );
}
