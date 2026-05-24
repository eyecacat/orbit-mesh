import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";

interface Star {
  top: number;
  left: number;
  size: number;
  opacity: number;
}

export function StarBackground() {
  const stars = useMemo<Star[]>(() => {
    const result: Star[] = [];
    for (let i = 0; i < 60; i++) {
      result.push({
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: Math.random() < 0.7 ? 1 : Math.random() < 0.5 ? 2 : 3,
        opacity: 0.2 + Math.random() * 0.6,
      });
    }
    return result;
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map((star, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            top: `${star.top}%` as unknown as number,
            left: `${star.left}%` as unknown as number,
            width: star.size,
            height: star.size,
            borderRadius: star.size / 2,
            backgroundColor: "#ffffff",
            opacity: star.opacity,
          }}
        />
      ))}
    </View>
  );
}
