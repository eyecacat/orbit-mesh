// app/(tabs)/diagnostics.tsx
// ORBIT-MESH PRO V2.1 ULTRA — GERÇEK BLE VERİSİ İLE ANALİZ PANELİ
// Tüm simülasyon/demo verileri kaldırıldı. Sadece gerçek telemetri kullanılır.

import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBle } from "@/context/BleContext";
import { useColors } from "@/hooks/useColors";
import { OrbitMeshTelemetry } from "@/utils/telemetryParser";

// ---- Grafik için (react-native-chart-kit) ----
import { LineChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";
const screenWidth = Dimensions.get("window").width - 32;

type SelfTestState = "OK" | "WARN" | "ERROR" | "PENDING";

export default function DiagnosticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const {
    connectedDevice,
    latestTelemetry,
    anomalyScore,
    consensus,
    pqcStatus,
  } = useBle();

  const tele = latestTelemetry as OrbitMeshTelemetry | null;
  const isConnected = !!connectedDevice && !!tele;

  // ---- Gerçek verilerden grafik geçmişi (son 6 örnek) ----
  const [vlfHistory, setVlfHistory] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [schumannHistory, setSchumannHistory] = useState<number[]>([
    7.83, 7.83, 7.83, 7.83, 7.83, 7.83,
  ]);
  const [motionHistory, setMotionHistory] = useState<number[]>([
    0, 0, 0, 0, 0, 0,
  ]);
  const [pqcHistory, setPqcHistory] = useState<number[]>([0, 0, 0, 0, 0, 0]);

  // Yeni telemetri geldiğinde grafik geçmişini güncelle
  React.useEffect(() => {
    if (!tele) return;
    setVlfHistory((prev) => [...prev.slice(1), tele.vlf_amp]);
    setSchumannHistory((prev) => [...prev.slice(1), tele.sch_hz]);
    setMotionHistory((prev) => [...prev.slice(1), tele.mot_vel]);
    // PQC geçmişi: her 900ms'de bir gelen seed uzunluğu (32 karakter)
    setPqcHistory((prev) => [...prev.slice(1), tele.pqc_seed.length]);
  }, [tele]);

  // ---- Self-test maddeleri ----
  const selfTestItems = useMemo<SelfTestState[]>(() => {
    const items: { key: string; label: string; state: SelfTestState; detail: string }[] = [];

    // 1. BLE Bağlantısı
    items.push({
      key: "ble",
      label: "BLE Bağlantısı",
      state: isConnected ? "OK" : "ERROR",
      detail: isConnected ? connectedDevice?.name ?? "Bağlı" : "Bağlı değil",
    });

    // 2. Telemetri Akışı
    items.push({
      key: "telemetry",
      label: "Telemetri Akışı",
      state: isConnected && tele ? "OK" : "PENDING",
      detail: isConnected && tele ? "Veri akıyor" : "Veri bekleniyor",
    });

    // 3. PQC Güvenlik Kalkanı
    const pqcFailures = pqcStatus?.recentFailures ?? 0;
    items.push({
      key: "pqc",
      label: "PQC Kuantum Kalkanı",
      state: !isConnected ? "PENDING" : pqcFailures > 0 ? "WARN" : "OK",
      detail: !isConnected
        ? "—"
        : pqcFailures > 0
        ? `${pqcFailures} hatalı paket engellendi`
        : "Aktif",
    });

    // 4. ADC / VLF Girişi
    items.push({
      key: "adc",
      label: "VLF ADC Girişi",
      state: !isConnected ? "PENDING" : tele?.fault ? "ERROR" : "OK",
      detail: !isConnected ? "—" : tele?.fault ? "Sinyal hatası" : "Stabil",
    });

    // 5. Gürültü Seviyesi
    items.push({
      key: "noise",
      label: "Gürültü Seviyesi",
      state: !isConnected ? "PENDING" : tele?.mains ? "WARN" : "OK",
      detail: !isConnected ? "—" : tele?.mains ? "Şebeke gürültüsü var" : "Temiz",
    });

    // 6. Edge TinyML (sinyal kalitesi)
    const sq = tele?.sq ?? 0;
    items.push({
      key: "ml",
      label: "Sinyal Analizi (TinyML)",
      state: !isConnected ? "PENDING" : sq > 40 ? "OK" : sq > 20 ? "WARN" : "ERROR",
      detail: !isConnected ? "—" : `SQ: ${sq.toFixed(0)} dB`,
    });

    return items;
  }, [isConnected, tele, connectedDevice, pqcStatus]);

  // ---- Veri kalitesi etiketi ----
  const dataQualityLabel = useMemo(() => {
    if (!isConnected) return "Bağlantı Yok";
    if (!tele) return "Veri Bekleniyor";
    const sq = tele.sq;
    if (sq >= 60) return "Mükemmel";
    if (sq >= 40) return "İyi";
    if (sq >= 20) return "Orta";
    return "Zayıf";
  }, [isConnected, tele]);

  const qualityColor = useMemo(() => {
    if (!isConnected) return colors.mutedForeground;
    if (!tele) return colors.mutedForeground;
    const sq = tele.sq;
    if (sq >= 60) return colors.accent;
    if (sq >= 40) return colors.primary;
    if (sq >= 20) return colors.warning;
    return colors.danger;
  }, [isConnected, tele, colors]);

  // ---- Aktif grafik seçimi (VLF veya Schumann) ----
  const [activeChart, setActiveChart] = useState<"vlf" | "schumann" | "motion">(
    "vlf"
  );

  // ---- Chart verileri ----
  const chartData =
    activeChart === "vlf"
      ? { labels: ["T-5", "T-4", "T-3", "T-2", "T-1", "Anlık"], data: vlfHistory }
      : activeChart === "schumann"
      ? { labels: ["T-5", "T-4", "T-3", "T-2", "T-1", "Anlık"], data: schumannHistory }
      : { labels: ["T-5", "T-4", "T-3", "T-2", "T-1", "Anlık"], data: motionHistory };

  const chartColor =
    activeChart === "vlf"
      ? "#f472b6"
      : activeChart === "schumann"
      ? "#60a5fa"
      : "#34d399";

  const chartLabel =
    activeChart === "vlf"
      ? "VLF Genlik"
      : activeChart === "schumann"
      ? "Schumann (Hz)"
      : "İyonosferik Hız (km/s)";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Başlık */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Analiz İstasyonu
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Gerçek Zamanlı Uzay Gözlem Verileri
          </Text>
        </View>

        {/* Bağlantı Durumu */}
        <View
          style={[
            styles.statusBanner,
            {
              backgroundColor: isConnected ? colors.accent + "22" : colors.warning + "22",
              borderColor: isConnected ? colors.accent + "66" : colors.warning + "66",
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
              ? `${connectedDevice?.name} bağlı — Canlı veri akışı aktif`
              : "BLE bağlantısı bekleniyor"}
          </Text>
        </View>

        {/* Eğer bağlantı varsa verileri göster */}
        {isConnected && tele ? (
          <>
            {/* Ana Metrik Kartları */}
            <View style={styles.metricsGrid}>
              <View
                style={[
                  styles.metricCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>
                  Schumann
                </Text>
                <Text style={[styles.metricValue, { color: colors.accent }]}>
                  {tele.sch_hz.toFixed(2)} Hz
                </Text>
                <Text
                  style={[
                    styles.metricSub,
                    { color: tele.sch_active ? colors.accent : colors.danger },
                  ]}
                >
                  {tele.sch_active ? "Aktif" : "Pasif"}
                </Text>
              </View>

              <View
                style={[
                  styles.metricCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>
                  VLF Genlik
                </Text>
                <Text style={[styles.metricValue, { color: colors.primary }]}>
                  {tele.vlf_amp.toFixed(1)}
                </Text>
                <Text style={[styles.metricSub, { color: colors.mutedForeground }]}>
                  SQ: {tele.sq.toFixed(0)} dB
                </Text>
              </View>

              <View
                style={[
                  styles.metricCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>
                  Yön
                </Text>
                <Text style={[styles.metricValue, { color: colors.warning }]}>
                  {tele.wave_dir.toFixed(0)}°
                </Text>
                <Text style={[styles.metricSub, { color: colors.mutedForeground }]}>
                  {tele.wave_src}
                </Text>
              </View>

              <View
                style={[
                  styles.metricCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>
                  İyonosferik Hız
                </Text>
                <Text style={[styles.metricValue, { color: colors.secondary }]}>
                  {tele.mot_vel.toFixed(2)} km/s
                </Text>
                <Text style={[styles.metricSub, { color: colors.mutedForeground }]}>
                  {tele.mot_trend}
                </Text>
              </View>
            </View>

            {/* Anomali Skoru */}
            {anomalyScore && (
              <View
                style={[
                  styles.anomalyCard,
                  {
                    backgroundColor: colors.card,
                    borderColor:
                      anomalyScore.total >= 50 ? colors.danger + "66" : colors.border,
                  },
                ]}
              >
                <View style={styles.anomalyHeader}>
                  <Feather
                    name={anomalyScore.total >= 50 ? "alert-triangle" : "check-circle"}
                    size={20}
                    color={anomalyScore.total >= 50 ? colors.danger : colors.accent}
                  />
                  <Text style={[styles.anomalyTitle, { color: colors.foreground }]}>
                    Anomali Skoru
                  </Text>
                  <Text
                    style={[
                      styles.anomalyValue,
                      {
                        color:
                          anomalyScore.total >= 70
                            ? colors.danger
                            : anomalyScore.total >= 50
                            ? colors.warning
                            : colors.accent,
                      },
                    ]}
                  >
                    {Math.round(anomalyScore.total)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.anomalyLevel,
                    {
                      color:
                        anomalyScore.total >= 70
                          ? colors.danger
                          : anomalyScore.total >= 50
                          ? colors.warning
                          : colors.accent,
                    },
                  ]}
                >
                  {anomalyScore.level}
                </Text>
                <Text
                  style={[styles.consensusText, { color: colors.mutedForeground }]}
                >
                  Mesh Consensus: {consensus.status} ({consensus.anomalyCount}/
                  {consensus.totalNodes} node)
                </Text>
              </View>
            )}

            {/* PQC Durumu */}
            {pqcStatus && (
              <View
                style={[
                  styles.pqcCard,
                  { backgroundColor: colors.card, borderColor: colors.primary + "44" },
                ]}
              >
                <View style={styles.pqcHeader}>
                  <Feather name="shield" size={18} color={colors.primary} />
                  <Text style={[styles.pqcTitle, { color: colors.foreground }]}>
                    PQC Kuantum Güvenlik
                  </Text>
                  <View
                    style={[
                      styles.pqcBadge,
                      {
                        backgroundColor:
                          pqcStatus.recentFailures > 0
                            ? colors.danger + "33"
                            : colors.accent + "33",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.pqcBadgeText,
                        {
                          color:
                            pqcStatus.recentFailures > 0 ? colors.danger : colors.accent,
                        },
                      ]}
                    >
                      {pqcStatus.recentFailures > 0 ? "Saldırı Engellendi" : "Güvende"}
                    </Text>
                  </View>
                </View>
                <View style={styles.pqcGrid}>
                  <View style={styles.pqcCell}>
                    <Text style={[styles.pqcLabel, { color: colors.mutedForeground }]}>
                      Aktif Düğüm
                    </Text>
                    <Text style={[styles.pqcValue, { color: colors.foreground }]}>
                      {pqcStatus.pqcActiveNodes.length}/{pqcStatus.totalNodes}
                    </Text>
                  </View>
                  <View style={styles.pqcCell}>
                    <Text style={[styles.pqcLabel, { color: colors.mutedForeground }]}>
                      Doğrulanan Paket
                    </Text>
                    <Text style={[styles.pqcValue, { color: colors.accent }]}>
                      {pqcStatus.recentVerifications}
                    </Text>
                  </View>
                  <View style={styles.pqcCell}>
                    <Text style={[styles.pqcLabel, { color: colors.mutedForeground }]}>
                      Hata Oranı
                    </Text>
                    <Text
                      style={[
                        styles.pqcValue,
                        {
                          color:
                            pqcStatus.failureRate > 0.1
                              ? colors.danger
                              : pqcStatus.failureRate > 0
                              ? colors.warning
                              : colors.accent,
                        },
                      ]}
                    >
                      {((pqcStatus.failureRate ?? 0) * 100).toFixed(0)}%
                    </Text>
                  </View>
                </View>
                {pqcStatus.recentFailures > 0 && (
                  <View
                    style={[
                      styles.pqcAlert,
                      { backgroundColor: colors.danger + "22", borderColor: colors.danger + "44" },
                    ]}
                  >
                    <Feather name="alert-triangle" size={14} color={colors.danger} />
                    <Text style={[styles.pqcAlertText, { color: colors.danger }]}>
                      Geçersiz paket imzası tespit edildi — zararlı veri engellendi.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Dinamik Grafik */}
            <View
              style={[
                styles.chartCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.chartHeader}>
                <Text style={[styles.chartTitle, { color: colors.foreground }]}>
                  {chartLabel} — Son 6 Örnek
                </Text>
                <View style={styles.chartTabs}>
                  {(["vlf", "schumann", "motion"] as const).map((key) => (
                    <Pressable
                      key={key}
                      style={[
                        styles.chartTab,
                        activeChart === key && {
                          backgroundColor: colors.primary + "33",
                          borderColor: colors.primary,
                        },
                      ]}
                      onPress={() => setActiveChart(key)}
                    >
                      <Text
                        style={[
                          styles.chartTabText,
                          {
                            color:
                              activeChart === key ? colors.primary : colors.mutedForeground,
                          },
                        ]}
                      >
                        {key === "vlf" ? "VLF" : key === "schumann" ? "Schumann" : "Hız"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <LineChart
                data={{
                  labels: chartData.labels,
                  datasets: [{ data: chartData.data }],
                }}
                width={screenWidth - 32}
                height={160}
                chartConfig={{
                  backgroundGradientFrom: colors.background,
                  backgroundGradientTo: colors.background,
                  color: (opacity = 1) => chartColor,
                  strokeWidth: 2,
                  labelColor: () => colors.mutedForeground,
                  decimalPlaces: 1,
                }}
                bezier
                style={styles.chart}
              />
            </View>

            {/* Self-Test */}
            <View
              style={[
                styles.selfTestCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.selfTestTitle, { color: colors.foreground }]}>
                Sistem Öz-Testi
              </Text>
              {selfTestItems.map((item) => {
                const stateColor =
                  item.state === "OK"
                    ? colors.accent
                    : item.state === "WARN"
                    ? colors.warning
                    : item.state === "ERROR"
                    ? colors.danger
                    : colors.mutedForeground;
                return (
                  <View key={item.key} style={styles.selfTestRow}>
                    <View style={styles.selfTestLeft}>
                      <View
                        style={[
                          styles.selfTestDot,
                          { backgroundColor: stateColor },
                        ]}
                      />
                      <Text style={[styles.selfTestLabel, { color: colors.foreground }]}>
                        {item.label}
                      </Text>
                    </View>
                    <Text
                      style={[styles.selfTestState, { color: stateColor }]}
                    >
                      {item.state}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        ) : (
          // ---- Bağlantı yoksa placeholder ----
          <View
            style={[
              styles.placeholderCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="bluetooth" size={48} color={colors.mutedForeground} />
            <Text style={[styles.placeholderTitle, { color: colors.foreground }]}>
              Analiz için BLE bağlantısı gerekli
            </Text>
            <Text style={[styles.placeholderDesc, { color: colors.mutedForeground }]}>
              Deneyap Kart'ı bağlayarak gerçek uzay verilerini görüntüleyin.
            </Text>
            <Pressable
              style={[styles.goToBleBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/ble" as any)}
            >
              <Feather name="bluetooth" size={16} color={colors.background} />
              <Text style={[styles.goToBleText, { color: colors.background }]}>
                BLE'ye Git
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ---- Styles ----
const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, marginBottom: 16 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 4 },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  statusText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    width: "47%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 2,
  },
  metricLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  metricValue: { fontSize: 24, fontFamily: "Inter_700Bold" },
  metricSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  anomalyCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    gap: 4,
  },
  anomalyHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  anomalyTitle: { flex: 1, fontSize: 14, fontFamily: "Inter_700Bold" },
  anomalyValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  anomalyLevel: { fontSize: 16, fontFamily: "Inter_700Bold" },
  consensusText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  pqcCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    gap: 10,
  },
  pqcHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  pqcTitle: { flex: 1, fontSize: 14, fontFamily: "Inter_700Bold" },
  pqcBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  pqcBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  pqcGrid: { flexDirection: "row", gap: 10 },
  pqcCell: { flex: 1, gap: 2 },
  pqcLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },
  pqcValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  pqcAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  pqcAlertText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  chartCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  chartTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  chartTabs: { flexDirection: "row", gap: 4 },
  chartTab: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  chartTabText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  chart: { marginTop: 6, borderRadius: 12 },
  selfTestCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    gap: 10,
  },
  selfTestTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  selfTestRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selfTestLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  selfTestDot: { width: 10, height: 10, borderRadius: 5 },
  selfTestLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  selfTestState: { fontSize: 12, fontFamily: "Inter_700Bold" },
  placeholderCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 12,
    marginTop: 20,
  },
  placeholderTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  placeholderDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  goToBleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  goToBleText: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
