import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Dimensions, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useBle } from "@/context/BleContext";
import { SpaceWeatherAlert } from "@/components/SpaceWeatherAlert";
import { NasaComparison } from "@/components/NasaComparison";
import { IonosphereSandbox } from "@/components/IonosphereSandbox";
import { CosmicSignature } from "@/components/CosmicSignature";

const { width } = Dimensions.get("window");

/**
 * JÜRİ SİMÜLASYON EKRANI
 * Amaç: Jüri masası önünde gerçek BLE telemetrisiyle projenin
 * gözlem ve analiz akışını tek ekranda göstermek.
 */
export default function SimulationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { connectedDevice, latestTelemetry } = useBle();
  const t = latestTelemetry;
  const isLive = !!connectedDevice && !!t;

  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPulse((p) => (p + 1) % 60), 100);
    return () => clearInterval(id);
  }, []);

  // Schumann kalp atışı animasyonu
  const heartSize = 80 + Math.sin(pulse * 0.2) * (t ? (t.vlf_hz - 7) * 30 : 5);

  return (
    <View style={[styles.root, { backgroundColor: "#020408" }]}>
      <LinearGradient
        colors={["#0f172a", "#020408"]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
            <Feather name="radio" size={28} color="#38bdf8" />
          <Text style={styles.headerTitle}>ORBIT-MESH</Text>
          <View style={[styles.liveDot, { backgroundColor: isLive ? "#10b981" : "#f59e0b" }]} />
          <Text style={[styles.liveText, { color: isLive ? "#10b981" : "#f59e0b" }]}>
            {isLive ? "CANLI VERİ" : "VERİ BEKLENİYOR"}
          </Text>
        </View>

        {/* Schumann Nabzı */}
        <View style={styles.heartWrap}>
          <View
            style={[
              styles.heartCircle,
              {
                width: heartSize,
                height: heartSize,
                borderColor: t?.anomaly ? "#ef4444" : "#a855f7",
                shadowColor: t?.anomaly ? "#ef4444" : "#a855f7",
              },
            ]}
          >
          <Text style={styles.heartFreq}>{t?.vlf_hz.toFixed(2) ?? "--.--"}</Text>
            <Text style={styles.heartHz}>Hz</Text>
          </View>
          <Text style={styles.heartLabel}>SCHUMANN NABZI</Text>
          <Text style={styles.heartSub}>
            {t ? "Dünya'nın doğal rezonans frekansı" : "BLE bağlantısı kurulduğunda gerçek veri gösterilir"}
          </Text>
        </View>

        {/* Space Weather Alert */}
        <SpaceWeatherAlert />

        {/* NASA Comparison */}
        <NasaComparison />

        {/* Cosmic Signature */}
        <CosmicSignature />

        {/* Ionosphere Sandbox */}
        <IonosphereSandbox />

        {/* Footer */}
        <View style={styles.footerBox}>
          <Text style={styles.footerTitle}>"Uzayı Dinlemek İçin Bir Kart Yeter"</Text>
          <Text style={styles.footerSub}>Project LAB | TEKNOFEST 2026 Finalist</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 24 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#e2e8f0", letterSpacing: 2 },
  liveDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  liveText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  heartWrap: { alignItems: "center", marginBottom: 28 },
  heartCircle: {
    borderRadius: 999,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.6,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  heartFreq: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#fff" },
  heartHz: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#94a3b8" },
  heartLabel: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#c4b5fd", marginTop: 12 },
  heartSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#64748b", marginTop: 4 },
  footerBox: { alignItems: "center", marginTop: 20, marginBottom: 40 },
  footerTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#38bdf8", textAlign: "center" },
  footerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#475569", marginTop: 6 },
});
