// app/simulation/index.tsx
// ORBIT-MESH PRO V2.1 — Gerçek Verilerle Uzay Simülasyonu

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LineChart } from "react-native-chart-kit";

import { useBle } from "@/context/BleContext";
import { useColors } from "@/hooks/useColors";
import { OrbitMeshTelemetry } from "@/utils/telemetryParser";

const screenWidth = Dimensions.get("window").width - 32;

export default function SimulationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { latestTelemetry, connectedDevice } = useBle();

  const tele = latestTelemetry as OrbitMeshTelemetry | null;
  const isConnected = !!connectedDevice && !!tele;

  // Grafik verileri (son 20 örnek)
  const [vlfHistory, setVlfHistory] = useState<number[]>(Array(20).fill(0));
  const [schumannHistory, setSchumannHistory] = useState<number[]>(
    Array(20).fill(7.83)
  );
  const [motionHistory, setMotionHistory] = useState<number[]>(
    Array(20).fill(0)
  );

  // Her 900ms'de bir veri güncelle (BLE'den geliyorsa onu kullan, yoksa simüle et)
  useEffect(() => {
    const interval = setInterval(() => {
      let amp, sch, mot;
      if (isConnected && tele) {
        amp = tele.vlf_amp;
        sch = tele.sch_hz;
        mot = tele.mot_vel;
      } else {
        // Simülasyon modu
        amp = Math.random() * 500 + 50;
        sch = 7.83 + (Math.random() - 0.5) * 0.6;
        mot = Math.random() * 3;
      }
      setVlfHistory((prev) => [...prev.slice(1), amp]);
      setSchumannHistory((prev) => [...prev.slice(1), sch]);
      setMotionHistory((prev) => [...prev.slice(1), mot]);
    }, 900);

    return () => clearInterval(interval);
  }, [isConnected, tele]);

  const chartConfig = {
    backgroundColor: colors.background,
    backgroundGradientFrom: colors.background,
    backgroundGradientTo: colors.background,
    color: (opacity = 1) => colors.primary,
    labelColor: () => colors.mutedForeground,
    strokeWidth: 2,
    decimalPlaces: 1,
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, borderBottomColor: colors.border },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Simülasyon
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.statusBanner,
            {
              backgroundColor: isConnected
                ? colors.accent + "22"
                : colors.warning + "22",
              borderColor: isConnected
                ? colors.accent + "66"
                : colors.warning + "66",
            },
          ]}
        >
          <Feather
            name={isConnected ? "check-circle" : "bluetooth"}
            size={20}
            color={isConnected ? colors.accent : colors.warning}
          />
          <Text
            style={[
              styles.statusText,
              { color: isConnected ? colors.accent : colors.warning },
            ]}
          >
            {isConnected
              ? `${connectedDevice?.name} bağlı — Gerçek veri akışı`
              : "Simülasyon modu (BLE bağlı değil)"}
          </Text>
        </View>

        {/* VLF Grafiği */}
        <View
          style={[
            styles.chartCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.chartTitle, { color: colors.foreground }]}>
            VLF Genlik (Son 20 örnek)
          </Text>
          <LineChart
            data={{
              labels: vlfHistory.map((_, i) => `${i}`),
              datasets: [{ data: vlfHistory }],
            }}
            width={screenWidth}
            height={180}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>

        {/* Schumann Grafiği */}
        <View
          style={[
            styles.chartCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.chartTitle, { color: colors.foreground }]}>
            Schumann Frekansı (Hz)
          </Text>
          <LineChart
            data={{
              labels: schumannHistory.map((_, i) => `${i}`),
              datasets: [{ data: schumannHistory }],
            }}
            width={screenWidth}
            height={180}
            chartConfig={{
              ...chartConfig,
              color: () => colors.mor,
            }}
            bezier
            style={styles.chart}
          />
        </View>

        {/* Hareket Hızı Grafiği */}
        <View
          style={[
            styles.chartCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.chartTitle, { color: colors.foreground }]}>
            İyonosferik Hareket Hızı (km/s)
          </Text>
          <LineChart
            data={{
              labels: motionHistory.map((_, i) => `${i}`),
              datasets: [{ data: motionHistory }],
            }}
            width={screenWidth}
            height={180}
            chartConfig={{
              ...chartConfig,
              color: () => colors.turquoise,
            }}
            bezier
            style={styles.chart}
          />
        </View>

        {/* Anlık Değerler */}
        <View
          style={[
            styles.liveCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.liveTitle, { color: colors.foreground }]}>
            Anlık Değerler
          </Text>
          <View style={styles.liveGrid}>
            <View style={styles.liveCell}>
              <Text style={[styles.liveLabel, { color: colors.mutedForeground }]}>
                VLF Genlik
              </Text>
              <Text style={[styles.liveValue, { color: colors.primary }]}>
                {(isConnected && tele ? tele.vlf_amp : vlfHistory[vlfHistory.length - 1]).toFixed(1)}
              </Text>
            </View>
            <View style={styles.liveCell}>
              <Text style={[styles.liveLabel, { color: colors.mutedForeground }]}>
                Schumann
              </Text>
              <Text style={[styles.liveValue, { color: colors.accent }]}>
                {(isConnected && tele ? tele.sch_hz : schumannHistory[schumannHistory.length - 1]).toFixed(2)} Hz
              </Text>
            </View>
            <View style={styles.liveCell}>
              <Text style={[styles.liveLabel, { color: colors.mutedForeground }]}>
                Hareket Hızı
              </Text>
              <Text style={[styles.liveValue, { color: colors.turquoise }]}>
                {(isConnected && tele ? tele.mot_vel : motionHistory[motionHistory.length - 1]).toFixed(2)} km/s
              </Text>
            </View>
            <View style={styles.liveCell}>
              <Text style={[styles.liveLabel, { color: colors.mutedForeground }]}>
                Durum
              </Text>
              <Text style={[styles.liveValue, { color: colors.foreground }]}>
                {isConnected && tele ? tele.state : "SIMULATION"}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  statusText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  chartCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
  },
  chart: { marginTop: 6, borderRadius: 12 },
  liveCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  liveTitle: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 12 },
  liveGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  liveCell: { width: "47%", gap: 2 },
  liveLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  liveValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
});
