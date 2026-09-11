import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Dimensions } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useBle } from "@/context/BleContext";

const { width } = Dimensions.get("window");

const SCHUMANN_MODES = [
  { n: 1, hz: 7.83, name: "Temel", desc: "Dünya'nın kalp atışı" },
  { n: 2, hz: 14.3, name: "2. Harmonic", desc: "İyonosfer yansıması" },
  { n: 3, hz: 20.8, name: "3. Harmonic", desc: "Manyetosfer etkileşimi" },
  { n: 4, hz: 27.3, name: "4. Harmonic", desc: "Güneş rüzgarı etkisi" },
  { n: 5, hz: 33.8, name: "5. Harmonic", desc: "Yüksek frekans modu" },
];

export default function IyonosferScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { connectedDevice, latestTelemetry } = useBle();
  const t = latestTelemetry;
  const isConnected = !!connectedDevice;

  const findClosestMode = () => {
    if (!t) return null;
    let closest = SCHUMANN_MODES[0];
    let minDiff = Math.abs(t.vlf_hz - closest.hz);
    for (const mode of SCHUMANN_MODES) {
      const diff = Math.abs(t.vlf_hz - mode.hz);
      if (diff < minDiff) { minDiff = diff; closest = mode; }
    }
    return { mode: closest, diff: minDiff };
  };

  const closest = findClosestMode();

  const getIonosphereStatus = () => {
    if (!t) return { label: "Veri Yok", color: "#64748b", desc: "Cihaz bağlı değil" };
    const amp = t.vlf_amp;
    if (amp > 1200) return { label: "YOĞUN", color: "#22c55e", desc: "Güçlü iyonosfer yansıması — GPS normal" };
    if (amp > 800) return { label: "NORMAL", color: "#38bdf8", desc: "Orta iyonosfer yoğunluğu" };
    if (amp > 400) return { label: "SEYREK", color: "#fbbf24", desc: "Zayıf yansıma — GPS sapmaları olabilir" };
    return { label: "KRİTİK", color: "#ef4444", desc: "İyonosfer çok seyrek — GPS riskli" };
  };

  const iono = getIonosphereStatus();

  return (
    <View style={[styles.root, { backgroundColor: "#020408" }]}>
      <LinearGradient colors={["#0c1e3e", "#020408"]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Feather name="layers" size={28} color="#38bdf8" />
          <Text style={styles.headerTitle}>İYONOSFER KUMSALI</Text>
          <View style={[styles.liveDot, { backgroundColor: isConnected ? "#10b981" : "#ef4444" }]} />
        </View>

        {!isConnected && (
          <View style={[styles.bleCard, { borderColor: "#ef4444" }]}>
            <Feather name="bluetooth" size={20} color="#ef4444" />
            <Text style={[styles.bleText, { color: "#fca5a5" }]}>
              Deneyap Kart bağlı değil. İyonosfer analizi için BLE bağlantısı gerekli.
            </Text>
          </View>
        )}

        {isConnected && (
          <View style={[styles.statusCard, { borderColor: iono.color }]}>
            <View style={styles.statusRow}>
              <Feather name="globe" size={24} color={iono.color} />
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.statusLabel, { color: iono.color }]}>İYONOSFER DURUMU: {iono.label}</Text>
                <Text style={[styles.statusDesc, { color: "#94a3b8" }]}>{iono.desc}</Text>
              </View>
            </View>
          </View>
        )}

        {isConnected && t && (
          <View style={styles.metricsRow}>
            <View style={[styles.metricCard, { borderColor: "#0ea5e9" }]}>
              <Text style={styles.metricValue}>{t.vlf_hz.toFixed(2)}</Text>
              <Text style={styles.metricUnit}>Hz</Text>
              <Text style={styles.metricLabel}>Frekans</Text>
            </View>
            <View style={[styles.metricCard, { borderColor: "#0ea5e9" }]}>
              <Text style={styles.metricValue}>{t.vlf_amp.toFixed(0)}</Text>
              <Text style={styles.metricUnit}>mV</Text>
              <Text style={styles.metricLabel}>Genlik</Text>
            </View>
            <View style={[styles.metricCard, { borderColor: "#0ea5e9" }]}>
              <Text style={styles.metricValue}>{t.bat.toFixed(0)}</Text>
              <Text style={styles.metricUnit}>%</Text>
              <Text style={styles.metricLabel}>Batarya</Text>
            </View>
          </View>
        )}

        <View style={[styles.schumannCard, { borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>SCHUMANN REZONANSLARI</Text>
          <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
            Dünya-iyonosfer kavitesinin doğal frekansları
          </Text>

          {SCHUMANN_MODES.map((mode) => {
            const isClosest = closest?.mode.n === mode.n;
            const diff = t ? Math.abs(t.vlf_hz - mode.hz) : 999;
            const matchPercent = t ? Math.max(0, 100 - diff * 20) : 0;

            return (
              <View key={mode.n} style={styles.modeRow}>
                <View style={[styles.modeBadge, { backgroundColor: isClosest ? (mode.n === 1 ? "#22c55e" : "#a855f7") : "transparent", borderColor: isClosest ? "transparent" : colors.border }]}>
                  <Text style={[styles.modeN, { color: isClosest ? "#fff" : colors.mutedForeground }]}>n={mode.n}</Text>
                </View>
                <View style={styles.modeInfo}>
                  <Text style={[styles.modeHz, { color: colors.foreground }]}>{mode.hz} Hz</Text>
                  <Text style={[styles.modeName, { color: colors.mutedForeground }]}>{mode.name}</Text>
                </View>
                <View style={styles.modeBarTrack}>
                  <View style={[styles.modeBarFill, { width: `${matchPercent}%`, backgroundColor: isClosest ? "#22c55e" : "#38bdf8" }]} />
                </View>
                <Text style={[styles.modeMatch, { color: isClosest ? "#22c55e" : colors.mutedForeground }]}>
                  {matchPercent.toFixed(0)}%
                </Text>
                {isClosest && (
                  <Feather name="check-circle" size={16} color="#22c55e" style={{ marginLeft: 6 }} />
                )}
              </View>
            );
          })}
        </View>

        {t?.anomaly && (
          <View style={[styles.anomalyCard, { borderColor: "#ef4444" }]}>
            <Feather name="alert-triangle" size={22} color="#ef4444" />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={[styles.anomalyTitle, { color: "#fecaca" }]}>İYONOSFER ANOMALİSİ</Text>
              <Text style={[styles.anomalyDesc, { color: "#fca5a5" }]}>
                VLF sinyalinde beklenmeyen sapma tespit edildi. Güneş patlaması veya manyetik fırtına etkisi olabilir.
              </Text>
            </View>
          </View>
        )}

        <View style={[styles.infoCard, { borderColor: colors.border }]}>
          <Text style={[styles.infoTitle, { color: colors.foreground }]}>İyonosfer Nedir?</Text>
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            İyonosfer, Dünya atmosferinin 60-1000 km yüksekliğindeki katmanıdır. Güneş UV ışınımı ile iyonize olur ve radyo dalgalarını yansıtır. VLF (Very Low Frequency, 3-30 kHz) sinyalleri iyonosfer ile Dünya yüzeyi arasında sıkışarak binlerce kilometre yol alabilir. Schumann rezonansları (7.83 Hz) bu kavitenin doğal frekansıdır. GPS sinyalleri iyonosferden geçer. İyonosfer yoğunluğu arttıkça GPS hataları artar.
          </Text>
        </View>

        <View style={styles.footerBox}>
          <Text style={styles.footerTitle}>Dünya'nın Nabzını Dinliyoruz</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 24 },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#e0f2fe", letterSpacing: 2 },
  liveDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  bleCard: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16, backgroundColor: "#450a0a", flexDirection: "row", alignItems: "center", gap: 10 },
  bleText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  statusCard: { marginHorizontal: 20, borderRadius: 16, borderWidth: 2, padding: 16, marginBottom: 20, backgroundColor: "rgba(30,41,59,0.4)" },
  statusRow: { flexDirection: "row", alignItems: "center" },
  statusLabel: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statusDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  metricsRow: { flexDirection: "row", paddingHorizontal: 20, gap: 10, marginBottom: 20 },
  metricCard: { flex: 1, backgroundColor: "rgba(14,165,233,0.08)", borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center" },
  metricValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  metricUnit: { fontSize: 10, fontFamily: "Inter_500Medium", color: "#7dd3fc" },
  metricLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#94a3b8", marginTop: 2 },
  schumannCard: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 20, backgroundColor: "rgba(30,41,59,0.3)" },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 4 },
  sectionSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 16 },
  modeRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 },
  modeBadge: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  modeN: { fontSize: 11, fontFamily: "Inter_700Bold" },
  modeInfo: { width: 100 },
  modeHz: { fontSize: 14, fontFamily: "Inter_700Bold" },
  modeName: { fontSize: 10, fontFamily: "Inter_400Regular" },
  modeBarTrack: { flex: 1, height: 8, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" },
  modeBarFill: { height: "100%", borderRadius: 4 },
  modeMatch: { width: 40, fontSize: 12, fontFamily: "Inter_700Bold", textAlign: "right" },
  anomalyCard: { marginHorizontal: 20, borderRadius: 16, borderWidth: 2, padding: 16, marginBottom: 20, backgroundColor: "#450a0a", flexDirection: "row", alignItems: "center" },
  anomalyTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  anomalyDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 18 },
  infoCard: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 20, backgroundColor: "rgba(30,41,59,0.2)" },
  infoTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 10 },
  infoText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 20 },
  footerBox: { alignItems: "center", marginTop: 10, marginBottom: 40 },
  footerTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#38bdf8", textAlign: "center" },
});
