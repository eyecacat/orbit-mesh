import React from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNasaSpaceWeather } from "@/hooks/useNasaSpaceWeather";
import { useBle } from "@/context/BleContext";
import { useColors } from "@/hooks/useColors";

export function NasaComparison() {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const { data: nasaData } = useNasaSpaceWeather();
  const { latestTelemetry } = useBle();
  const orbitSignalQuality = latestTelemetry?.sq ?? null;
  const maxVal = Math.max(nasaData?.kpIndex || 0, 1);
  const nasaBar = nasaData ? (nasaData.kpIndex / maxVal) * 100 : 0;

  if (!nasaData) return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Feather name="activity" size={18} color={colors.primary} />
        <Text style={[styles.title, { color: colors.foreground }]}>NASA CANLI KARŞILAŞTIRMA</Text>
      </View>

      <View style={styles.compareRow}>
        <View style={[styles.pill, { backgroundColor: "#1e3a5f" }]}>
          <Text style={styles.pillLabel}>NASA Kp</Text>
          <Text style={styles.pillValue}>{nasaData.kpIndex.toFixed(1)}</Text>
        </View>
        <Feather name="arrow-right" size={18} color={colors.mutedForeground} />
        <View style={[styles.pill, { backgroundColor: colors.primary + "33" }]}>
          <Text style={[styles.pillLabel, { color: colors.primary }]}>ORBIT SQ</Text>
          <Text style={[styles.pillValue, { color: colors.primary }]}>
            {orbitSignalQuality == null ? "—" : orbitSignalQuality.toFixed(0)}
          </Text>
        </View>
      </View>

      <View style={styles.accuracyBox}>
        <Feather name="info" size={16} color={colors.warning} />
        <Text style={[styles.accuracyText, { color: colors.warning }]}>
          Kp ve SQ farklı ölçeklerdir; doğrudan doğruluk hesabı yapılmaz.
        </Text>
      </View>

      <View style={styles.chartContainer}>
        <View style={styles.barRow}>
          <Text style={[styles.barLabel, { color: colors.mutedForeground }]}>NASA</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${nasaBar}%`, backgroundColor: "#38bdf8" }]} />
          </View>
          <Text style={[styles.barValue, { color: "#38bdf8" }]}>{nasaData.kpIndex.toFixed(1)}</Text>
        </View>
        {orbitSignalQuality != null && (
          <View style={styles.barRow}>
            <Text style={[styles.barLabel, { color: colors.mutedForeground }]}>ORBIT SQ</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.min(100, orbitSignalQuality)}%`, backgroundColor: colors.primary }]} />
            </View>
            <Text style={[styles.barValue, { color: colors.primary }]}>{orbitSignalQuality.toFixed(0)}</Text>
          </View>
        )}
      </View>

      <Text style={[styles.footer, { color: colors.mutedForeground }]}>
        NASA Kp küresel uzay havasını, ORBIT SQ ise yerel BLE sinyal kalitesini gösterir.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 20 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  title: { fontSize: 14, fontFamily: "Inter_700Bold" },
  compareRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", marginBottom: 12 },
  pill: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, alignItems: "center", minWidth: 100 },
  pillLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: "#93c5fd", marginBottom: 2 },
  pillValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  accuracyBox: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  accuracyText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  chartContainer: { marginTop: 8, gap: 8 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  barLabel: { width: 50, fontSize: 10, fontFamily: "Inter_600SemiBold" },
  barTrack: { flex: 1, height: 12, backgroundColor: "#1e293b", borderRadius: 6, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 6 },
  barValue: { width: 40, fontSize: 12, fontFamily: "Inter_700Bold", textAlign: "right" },
  footer: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 10, textAlign: "center" },
});
