import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Dimensions } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useBle } from "@/context/BleContext";
import { useNasaSpaceWeather } from "@/hooks/useNasaSpaceWeather";
import { useSpaceWeather } from "@/hooks/useSpaceWeather";
import { SpaceWeatherAlert } from "@/components/SpaceWeatherAlert";
import { NasaComparison } from "@/components/NasaComparison";
import { CosmicSignature } from "@/components/CosmicSignature";
import { IonosphereSandbox } from "@/components/IonosphereSandbox";

const { width } = Dimensions.get("window");

export default function JuriSimScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { connectedDevice, latestTelemetry, anomalyScore } = useBle();
  const { data: nasaData } = useNasaSpaceWeather();
  const { data: swData } = useSpaceWeather();

  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPulse((p) => (p + 1) % 60), 100);
    return () => clearInterval(id);
  }, []);

  const isConnected = !!connectedDevice;
  const t = latestTelemetry;
  const heartSize = 80 + Math.sin(pulse * 0.2) * (t ? (t.vlf_hz - 7) * 30 : 5);

  const schumannModes = [
    { hz: 7.83, name: "Temel", diff: t ? Math.abs(t.vlf_hz - 7.83) : 0 },
    { hz: 14.3, name: "2. Mod", diff: t ? Math.abs(t.vlf_hz - 14.3) : 0 },
    { hz: 20.8, name: "3. Mod", diff: t ? Math.abs(t.vlf_hz - 20.8) : 0 },
    { hz: 27.3, name: "4. Mod", diff: t ? Math.abs(t.vlf_hz - 27.3) : 0 },
  ];
  const closestMode = schumannModes.reduce((a, b) => a.diff < b.diff ? a : b);

  return (
    <View style={[styles.root, { backgroundColor: "#020408" }]}>
      <LinearGradient colors={["#0f172a", "#020408"]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Feather name="radio" size={28} color="#38bdf8" />
          <Text style={styles.headerTitle}>ORBIT-MESH</Text>
          <View style={[styles.liveDot, { backgroundColor: isConnected ? "#10b981" : "#ef4444" }]} />
          <Text style={[styles.liveText, { color: isConnected ? "#10b981" : "#ef4444" }]}>
            {isConnected ? "CANLI VERİ" : "CİHAZ BAĞLI DEĞİL"}
          </Text>
        </View>

        {!isConnected && (
          <View style={[styles.bleCard, { borderColor: "#ef4444" }]}>
            <Feather name="bluetooth" size={20} color="#ef4444" />
            <Text style={[styles.bleText, { color: "#fca5a5" }]}>
              Deneyap Kart bağlı değil. VLF verisi almak için BLE bağlantısı kurun.
            </Text>
          </View>
        )}

        <View style={styles.heartWrap}>
          <View style={[styles.heartCircle, {
            width: heartSize, height: heartSize,
            borderColor: t?.anomaly ? "#ef4444" : "#a855f7",
            shadowColor: t?.anomaly ? "#ef4444" : "#a855f7",
          }]}>
            <Text style={styles.heartFreq}>{t?.vlf_hz.toFixed(2) ?? "--.--"}</Text>
            <Text style={styles.heartHz}>Hz</Text>
          </View>
          <Text style={styles.heartLabel}>SCHUMANN NABZI</Text>
          <Text style={styles.heartSub}>
            {t ? `En yakın mod: ${closestMode.name} (${closestMode.hz} Hz)` : "Dünya'nın doğal rezonans frekansı"}
          </Text>
          {t?.anomaly && (
            <View style={styles.anomalyBadge}>
              <Feather name="alert-triangle" size={14} color="#fecaca" />
              <Text style={styles.anomalyText}>ANOMALİ TESPİT EDİLDİ</Text>
            </View>
          )}
        </View>

        {isConnected && t && (
          <View style={styles.telemetryGrid}>
            <View style={[styles.telCard, { borderColor: colors.border }]}>
              <Feather name="activity" size={18} color="#38bdf8" />
              <Text style={styles.telValue}>{t.vlf_amp.toFixed(0)}</Text>
              <Text style={styles.telLabel}>VLF Genlik (mV)</Text>
            </View>
            <View style={[styles.telCard, { borderColor: colors.border }]}>
              <Feather name="thermometer" size={18} color="#f59e0b" />
              <Text style={styles.telValue}>{t.state}</Text>
              <Text style={styles.telLabel}>Uzay durumu</Text>
            </View>
            <View style={[styles.telCard, { borderColor: colors.border }]}>
              <Feather name="battery" size={18} color="#22c55e" />
              <Text style={styles.telValue}>%{t.bat.toFixed(0)}</Text>
              <Text style={styles.telLabel}>Batarya</Text>
            </View>
            <View style={[styles.telCard, { borderColor: colors.border }]}>
              <Feather name="cpu" size={18} color="#a855f7" />
              <Text style={styles.telValue}>{anomalyScore?.total.toFixed(0) ?? "0"}</Text>
              <Text style={styles.telLabel}>Anomali Skoru</Text>
            </View>
          </View>
        )}

        <SpaceWeatherAlert />
        <NasaComparison />

        {swData?.solarWind && (
          <View style={[styles.panel, { borderColor: colors.border }]}>
            <View style={styles.panelHeader}>
              <Feather name="wind" size={18} color="#38bdf8" />
              <Text style={[styles.panelTitle, { color: colors.foreground }]}>GÜNEŞ RÜZGARI (DSCOVR)</Text>
            </View>
            <View style={styles.panelGrid}>
              <View style={styles.panelItem}>
                <Text style={styles.panelValue}>{swData.solarWind.speed.toFixed(0)}</Text>
                <Text style={styles.panelUnit}>km/s</Text>
                <Text style={styles.panelLabel}>Hız</Text>
              </View>
              <View style={styles.panelItem}>
                <Text style={styles.panelValue}>{swData.solarWind.density.toFixed(1)}</Text>
                <Text style={styles.panelUnit}>p/cm³</Text>
                <Text style={styles.panelLabel}>Yoğunluk</Text>
              </View>
              <View style={styles.panelItem}>
                <Text style={styles.panelValue}>{swData.solarWind.bz.toFixed(1)}</Text>
                <Text style={styles.panelUnit}>nT</Text>
                <Text style={styles.panelLabel}>Bz</Text>
              </View>
            </View>
          </View>
        )}

        {swData?.xray && (
          <View style={[styles.panel, { borderColor: colors.border }]}>
            <View style={styles.panelHeader}>
              <Feather name="sun" size={18} color={swData.xray.status === "storm" ? "#ef4444" : "#fbbf24"} />
              <Text style={[styles.panelTitle, { color: colors.foreground }]}>GÜNEŞ X-IŞINI (GOES)</Text>
            </View>
            <View style={styles.xrayRow}>
              <Text style={[styles.xrayClass, { 
                color: swData.xray.status === "storm" ? "#ef4444" : swData.xray.status === "active" ? "#fbbf24" : "#22c55e" 
              }]}>
                {swData.xray.class}-Sınıfı
              </Text>
              <Text style={[styles.xrayFlux, { color: colors.mutedForeground }]}>
                {swData.xray.flux.toExponential(2)} W/m²
              </Text>
            </View>
          </View>
        )}

        <CosmicSignature />
        <IonosphereSandbox />

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
  bleCard: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16, backgroundColor: "#450a0a", flexDirection: "row", alignItems: "center", gap: 10 },
  bleText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  heartWrap: { alignItems: "center", marginBottom: 28 },
  heartCircle: { borderRadius: 999, borderWidth: 3, alignItems: "center", justifyContent: "center", shadowOpacity: 0.6, shadowRadius: 20, shadowOffset: { width: 0, height: 0 }, elevation: 10 },
  heartFreq: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#fff" },
  heartHz: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#94a3b8" },
  heartLabel: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#c4b5fd", marginTop: 12 },
  heartSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#64748b", marginTop: 4 },
  anomalyBadge: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, backgroundColor: "#7f1d1d", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  anomalyText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fecaca" },
  telemetryGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 20, gap: 10, marginBottom: 20 },
  telCard: { width: "47%", backgroundColor: "rgba(30,41,59,0.6)", borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center", gap: 4 },
  telValue: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  telLabel: { fontSize: 10, fontFamily: "Inter_500Medium", color: "#94a3b8" },
  panel: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16, backgroundColor: "rgba(30,41,59,0.4)" },
  panelHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  panelTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  panelGrid: { flexDirection: "row", justifyContent: "space-around" },
  panelItem: { alignItems: "center" },
  panelValue: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#fff" },
  panelUnit: { fontSize: 10, fontFamily: "Inter_500Medium", color: "#94a3b8" },
  panelLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#64748b", marginTop: 2 },
  xrayRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  xrayClass: { fontSize: 22, fontFamily: "Inter_700Bold" },
  xrayFlux: { fontSize: 14, fontFamily: "Inter_500Medium" },
  footerBox: { alignItems: "center", marginTop: 20, marginBottom: 40 },
  footerTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#38bdf8", textAlign: "center" },
  footerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#475569", marginTop: 6 },
});