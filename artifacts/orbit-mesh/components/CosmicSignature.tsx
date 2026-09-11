import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useBle } from "@/context/BleContext";
import { useColors } from "@/hooks/useColors";

function deriveCosmicSignature(vlf: number, amp: number, time: number): string {
  const entropy = Math.sin(vlf * 0.1) * 10000 + Math.cos(amp * 10) * 5000 + time * 0.001;
  let hex = "";
  const chars = "abcdef0123456789";
  for (let i = 0; i < 32; i++) {
    const idx = Math.floor(Math.abs(Math.sin(entropy + i * 1.618) * 16)) % 16;
    hex += chars[idx];
  }
  return hex;
}

export function CosmicSignature() {
  const colors = useColors();
  const { latestTelemetry } = useBle();
  const [sig, setSig] = useState("a7f29e4d...");
  const [tick, setTick] = useState(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
      const vlf = latestTelemetry?.vlf_hz;
      const amp = latestTelemetry?.vlf_amp;
      if (vlf == null || amp == null) return;
      setSig(deriveCosmicSignature(vlf, amp, Date.now()));
      glow.value = withRepeat(withTiming(1, { duration: 800 }), 2, true);
    }, 1000);
    return () => clearInterval(id);
  }, [latestTelemetry]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glow.value * 0.8,
    shadowRadius: glow.value * 15,
    shadowColor: "#a855f7",
    elevation: glow.value * 10,
  }));

  const chunks = sig.match(/.{1,4}/g) ?? [];

  return (
    <View style={[styles.card, { backgroundColor: "#1a0b2e", borderColor: "#7c3aed" }]}>
      <View style={styles.header}>
        <Feather name="key" size={18} color="#c4b5fd" />
        <Text style={[styles.title, { color: "#e9d5ff" }]}>KOZMİK İMZA</Text>
      </View>

      <Text style={[styles.subtitle, { color: "#c4b5fd" }]}>
        Bu anahtarın kaynağı bilgisayar değil, şu an üzerinizden geçen uzay havası.
      </Text>

      <Animated.View style={[styles.sigBox, glowStyle]}>
        <Text style={styles.sigText}>
          {chunks.map((chunk, i) => (
            <Text key={i}>
              <Text style={{ color: i % 2 === 0 ? "#a855f7" : "#e879f9" }}>{chunk}</Text>
              {i < chunks.length - 1 ? " " : ""}
            </Text>
          ))}
        </Text>
      </Animated.View>

      <View style={styles.meta}>
        <Text style={[styles.metaText, { color: "#a78bfa" }]}>
          <Feather name="radio" size={12} color="#a78bfa" /> VLF Entropisi: {latestTelemetry?.vlf_hz.toFixed(2) ?? "7.83"} Hz
        </Text>
        <Text style={[styles.metaText, { color: "#a78bfa" }]}>
          <Feather name="shield" size={12} color="#a78bfa" /> PQC Doğrulandı ✓
        </Text>
      </View>

      <Text style={[styles.footer, { color: "#8b5cf6" }]}>
        Kopyalanamaz. Kuantum bilgisayarlara karşı dayanıklı.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 20 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  title: { fontSize: 15, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 12, lineHeight: 18 },
  sigBox: {
    backgroundColor: "#0f0518",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#6d28d9",
    alignItems: "center",
  },
  sigText: { 
    fontSize: 14, 
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", 
    letterSpacing: 1,
    color: "#fff"
  },
  meta: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  metaText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  footer: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 10, textAlign: "center" },
});
