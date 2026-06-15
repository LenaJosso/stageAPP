import React from "react";
import { Text, TextStyle, StyleProp, View } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";

interface GradientTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
}

export function GradientText({ text, style }: GradientTextProps) {
  return (
    <MaskedView
      style={{ flexDirection: "row" }}
      maskElement={
        <View style={{ flex: 1 }}>
          <Text style={[style, { backgroundColor: "transparent" }]}>{text}</Text>
        </View>
      }
    >
      <LinearGradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        colors={["#e33625", "#fac359"]}
        style={{ flex: 1 }}
      >
        <Text style={[style, { opacity: 0 }]}>{text}</Text>
      </LinearGradient>
    </MaskedView>
  );
}