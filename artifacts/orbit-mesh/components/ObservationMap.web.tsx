import React from "react";
import { Text, View } from "react-native";
import type { ObservationMapProps } from "./observationMapTypes";

export default function ObservationMap({ markers, width }: ObservationMapProps) {
  return (
    <View
      style={{
        width,
        height: 320,
        backgroundColor: "#0f172a",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        gap: 8,
      }}
    >
      <Text style={{ color: "#cbd5e1", fontFamily: "Inter_700Bold", textAlign: "center" }}>
        Harita fiziksel cihazda kullanılabilir
      </Text>
      <Text style={{ color: "#94a3b8", fontFamily: "Inter_400Regular", textAlign: "center" }}>
        Web önizlemesinde {markers.length} BLE düğümü listeleniyor; konum haritası native build içinde açılır.
      </Text>
    </View>
  );
}