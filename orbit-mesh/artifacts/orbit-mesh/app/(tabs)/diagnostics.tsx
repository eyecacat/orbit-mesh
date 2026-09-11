// app/(tabs)/diagnostics.tsx
// ORBIT-MESH — Analiz İstasyonu (V2.2 tek-anten firmware ile uyumlu)
// DÜZELTME: BleContext'te `connectedDevice` YOK, doğrusu `connectedDevices` (dizi).
// Eski kod undefined okuduğu için BLE bağlı olsa bile "bekleniyor" gösteriyordu.
// Ayrıca V2.2 firmware'de wave/motion alanları yok; grafikler gerçek alanlara
// (vlf_amp, sch_hz, b6_10) bağlandı ve bant-enerjisi sekmesi eklendi.

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBle } from "@/context/BleContext";
import { useColors } from "@/hooks/useColors";
import { OrbitMeshTelemetry } from "@/utils/telemetryParser";

const screenWidth = Dimensions.get("window").width - 32;
const HISTORY_LEN = 20;

type ChartKey = "vlf" | "schumann" | "band";
type SelfTestState = "OK" | "WARN" | "ERROR" | "PENDING";

export default function DiagnosticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { connectedDevices, latestTelemetry, anomalyScore, consensus, pqcStatus, meshNodes } =
    useBle();

  const tele = latestTelemetry as OrbitMeshTelemetry | null;
  const activeDevice = connectedDevices[0] ?? null;
  const isConnected = connectedDevices.length > 0 && !!tele;

  // Canlı geçmiş: BleContext'teki telemetry akışından son N örnek
  const [history, setHistory] = useState<OrbitMeshTelemetry[]>([]);
  const lastTsRef = useRef(0);
  useEffect(() => {
    if (!tele || tele.receivedAt === lastTsRef.current) return;
    lastTsRef.current = tele.receivedAt;
    setHistory((prev) => [...prev.slice(-(HISTORY_LEN - 1)), tele]);
  }, [tele]);

  const [activeChart, setActiveChart] = useState<ChartKey>("vlf");
  const series = useMemo(() => {
    const pick = (fn: (t: OrbitMeshTelemetry) => number) =>
      history.map(fn).slice(-12);
    const labels = history.slice(-12).map((_, i) => `${i + 1}`);
    return {
      vlf: { data: pick((t) => t.vlf_amp), labels },
      schumann: { data: pick((t) => t.sch_hz), labels },
      band: { data: pick((t) => t.b6_10), labels },
    };
  }, [history]);

  const chartMeta: Record<ChartKey, { label: string; color: string; unit: string }> = {
    vlf: { label: "VLF Genlik", color: "#f472b6", unit: "ADC" },
    schumann: { label: "Schumann (Hz)", color: "#60a5fa", unit: "Hz" },
    band: { label: "6–10 Hz Bant Enerjisi", color: "#00E5B0", unit: "" },
  };
  const meta = chartMeta[activeChart];

  const selfTestItems = useMemo(() => {
    const items: { key: string; label: string; state: SelfTestState; detail: string }[] = [];
    items.push({
      key: "ble",
      label: "BLE Bağlantısı",
      state: connectedDevices.length > 0 ? "OK" : "ERROR",
      detail:
        connectedDevices.length > 0
          ? `${connectedDevices.length} düğüm: ${connectedDevices
              .map((d) => d.name ?? d.id)
              .join(", ")}`
          : "Bağlı düğüm yok",
    });
    items.push({
      key: "telemetry",
      label: "Telemetri Akışı",
      state: tele ? "OK" : connectedDevices.length > 0 ? "PENDING" : "ERROR",
      detail: tele ? `${Math.round((Date.now() - tele.receivedAt) / 1000)} sn önce güncellendi` : "Veri bekleniyor",
    });
    items.push({
      key: "adc",
      label: "VLF ADC Girişi",
      state: !tele ? "PENDING" : tele.fault ? "ERROR" : (tele.vlf_amp ?? 0) > 1 ? "OK" : "WARN",
      detail: !tele ? "—" : tele.fault ? "Sinyal arızası (INPUT_FAULT)" : `Amp: ${tele.vlf_amp.toFixed(1)}`,
    });
    items.push({
      key: "noise",
      label: "Gürültü Seviyesi",
      state: !tele ? "PENDING" : tele.mains ? "WARN" : "OK",
      detail: !tele ? "—" : tele.mains ? "50 Hz şebeke gürültüsü" : "Temiz",
    });
    items.push({
      key: "sch",
      label: "Schumann Rezonansı",
      state: !tele ? "PENDING" : tele.sch_active ? "OK" : "WARN",
      detail: !tele ? "—" : tele.sch_active ? `${tele.sch_hz.toFixed(2)} Hz aktif` : "Sinyal zayıf",
    });
    items.push({
      key: "sq",
      label: "Sinyal Kalitesi",
      state: !tele ? "PENDING" : tele.sq > 40 ? "OK" : tele.sq > 20 ? "WARN" : "ERROR",
      detail: !tele ? "—" : `SQ: ${tele.sq.toFixed(0)} dB`,
    });
    return items;
  }, [connectedDevices, tele]);

  const stateColor =
    (tele?.state ?? "") === "QUIET"
      ? colors.accent
      : (tele?.state ?? "") === "WATCH"
      ? colors.primary
      : (tele?.state ?? "") === "ACTIVE" || (tele?.state ?? "") === "DISTURBED"
      ? colors.warning
      : colors.danger;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Başlık */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Analiz İstasyonu</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Gerçek Zamanlı Uzay Gözlem Verileri
          </Text>
        </View>

        {/* Bağlantı durumu */}
        <View
          style={[
            styles.statusBanner,
            {
              backgroundColor: isConnected ? colors.accent + "22" : colors.warning + "22",
              borderColor: isConnected ? colors.accent : colors.warning,
            },
          ]}
        >
          <Feather name="bluetooth" size={18} color={isConnected ? colors.accent : colors.warning} />
          <Text
            style={[styles.statusText, { color: isConnected ? colors.accent : colors.warning }]}
          >
            {isConnected
              ? `${activeDevice?.name ?? tele?.nodeId} bağlı — canlı veri akışı aktif${
                  connectedDevices.length > 1 ? ` (${connectedDevices.length} düğüm)` : ""
                }`
              : "BLE bağlantısı bekleniyor"}
          </Text>
        </View>

        {isConnected && tele ? (
          <>
            {/* Canlı metrikler — V2.2 firmware alanları */}
            <View style={styles.metricsGrid}>
              {[
                { label: "Durum", value: tele.state, color: stateColor },
                { label: "VLF Frekans", value: `${tele.vlf_hz.toFixed(2)} Hz` },
                { label: "VLF Genlik", value: tele.vlf_amp.toFixed(1) },
                { label: "Sinyal Kalite", value: `${tele.sq.toFixed(0)} dB` },
                { label: "Schumann", value: `${tele.sch_hz.toFixed(2)} Hz`, sub: tele.sch_active ? "Aktif" : "Pasif" },
                { label: "Schumann Oran", value: tele.sch_ratio.toFixed(3) },
                { label: "Aktivite", value: tele.act.toFixed(2) },
                { label: "ADS1115", value: `${tele.ads1.toFixed(3)} V` },
                { label: "Bant 6–10 Hz", value: tele.b6_10.toFixed(3) },
                { label: "Bant 17–25 Hz", value: tele.b17_25.toFixed(3) },
                { label: "Şebeke 45–55 Hz", value: tele.b45_55.toFixed(3) },
                { label: "Batarya", value: `%${tele.bat.toFixed(0)}`, color: tele.bat > 20 ? colors.accent : colors.danger },
              ].map((m, i) => (
                <View key={i} style={[styles.metricCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{m.label}</Text>
                  <Text style={[styles.metricValue, { color: m.color ?? colors.foreground }]}>{m.value}</Text>
                  {m.sub ? <Text style={[styles.metricSub, { color: colors.mutedForeground }]}>{m.sub}</Text> : null}
                </View>
              ))}
            </View>

            {/* Anomali + consensus */}
            {anomalyScore && (
              <View
                style={[
                  styles.anomalyCard,
                  {
                    borderColor: anomalyScore.total >= 50 ? colors.danger : colors.border,
                    backgroundColor: anomalyScore.total >= 50 ? colors.danger + "14" : colors.card,
                  },
                ]}
              >
                <View style={styles.anomalyHeader}>
                  <Feather
                    name={anomalyScore.total >= 50 ? "alert-triangle" : "check-circle"}
                    size={20}
                    color={anomalyScore.total >= 50 ? colors.danger : colors.accent}
                  />
                  <Text style={[styles.anomalyTitle, { color: colors.foreground }]}>Anomali Skoru</Text>
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
                </View>
                <Text style={[styles.consensusText, { color: colors.mutedForeground }]}>
                  Mesh Consensus: {consensus.status} ({consensus.anomalyCount}/{consensus.totalNodes} düğüm) —{" "}
                  {router ? "" : ""}
                  {consensus.status === "Doğrulanmış"
                    ? "anomali ağ genelinde doğrulandı"
                    : consensus.status === "Şüpheli"
                    ? "birden fazla düğüm aynı yönde — izlemeye devam"
                    : "ağda doğrulama yok — yerel ölçüm olabilir"}
                </Text>
              </View>
            )}

            {/* PQC kartı — detay ekranına gider */}
            <Pressable
              onPress={() => router.push("/pqc")}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={[styles.pqcCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Feather name="shield" size={18} color={colors.mesh} />
                  <Text style={[styles.pqcTitle, { color: colors.foreground, flex: 1 }]}>
                    PQC Kuantum Güvenlik
                  </Text>
                  <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
                </View>
                <View style={styles.pqcGrid}>
                  <View style={styles.pqcCell}>
                    <Text style={[styles.pqcLabel, { color: colors.mutedForeground }]}>Durum</Text>
                    <Text style={[styles.pqcValue, { color: (pqcStatus?.recentFailures ?? 0) > 0 ? colors.warning : colors.accent }]}>
                      {(pqcStatus?.recentFailures ?? 0) > 0 ? "Müdahale" : "Güvende"}
                    </Text>
                  </View>
                  <View style={styles.pqcCell}>
                    <Text style={[styles.pqcLabel, { color: colors.mutedForeground }]}>Doğrulanan Paket</Text>
                    <Text style={[styles.pqcValue, { color: colors.foreground }]}>
                      {pqcStatus?.recentVerifications ?? 0}
                    </Text>
                  </View>
                  <View style={styles.pqcCell}>
                    <Text style={[styles.pqcLabel, { color: colors.mutedForeground }]}>Düğüm</Text>
                    <Text style={[styles.pqcValue, { color: colors.foreground }]}>
                      {pqcStatus?.pqcActiveNodes?.length ?? meshNodes.length}/{pqcStatus?.totalNodes ?? meshNodes.length}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.pqcSeed, { color: colors.mutedForeground }]} numberOfLines={1}>
                  Seed: {tele.pqc_seed}
                </Text>
              </View>
            </Pressable>

            {/* Canlı grafik */}
            <View style={[styles.chartCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <View style={styles.chartHeader}>
                <Text style={[styles.chartTitle, { color: colors.foreground }]}>{meta.label}</Text>
                <View style={styles.chartTabs}>
                  {(["vlf", "schumann", "band"] as ChartKey[]).map((key) => (
                    <Pressable
                      key={key}
                      onPress={() => setActiveChart(key)}
                      style={[
                        styles.chartTab,
                        { backgroundColor: activeChart === key ? colors.primary + "33" : "transparent" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chartTabText,
                          { color: activeChart === key ? colors.primary : colors.mutedForeground },
                        ]}
                      >
                        {key === "vlf" ? "VLF" : key === "schumann" ? "Schumann" : "Bant"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <LineChart
                data={{
                  labels: series[activeChart].labels,
                  datasets: [{ data: series[activeChart].data.length > 1 ? series[activeChart].data : [0, 0] }],
                }}
                width={screenWidth - 32}
                height={180}
                yAxisSuffix={meta.unit ? ` ${meta.unit}` : ""}
                chartConfig={{
                  backgroundColor: "transparent",
                  backgroundGradientFrom: colors.card,
                  backgroundGradientTo: colors.card,
                  decimalPlaces: activeChart === "schumann" ? 2 : 1,
                  color: () => meta.color,
                  labelColor: () => colors.mutedForeground,
                  style: { borderRadius: 12 },
                  propsForDots: { r: "2" },
                  propsForBackgroundLines: { stroke: colors.border },
                }}
                bezier
                style={styles.chart}
              />
              <Text style={[styles.chartHint, { color: colors.mutedForeground }]}>
                Son {history.length} telemetri paketi (~{Math.round((history.length * 0.9 * 10) / 10)} sn)
              </Text>
            </View>

            {/* Sistem öz-testi */}
            <View style={[styles.selfTestCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={[styles.selfTestTitle, { color: colors.foreground }]}>Sistem Öz-Testi</Text>
              {selfTestItems.map((item) => {
                const c =
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
                      <View style={[styles.selfTestDot, { backgroundColor: c }]} />
                      <Text style={[styles.selfTestLabel, { color: colors.foreground }]}>{item.label}</Text>
                    </View>
                    <Text style={[styles.selfTestState, { color: c }]}>
                      {item.state} · {item.detail}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Düğüm listesi */}
            {meshNodes.length > 0 && (
              <View style={[styles.selfTestCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Text style={[styles.selfTestTitle, { color: colors.foreground }]}>Mesh Düğümleri</Text>
                {meshNodes.map((n) => (
                  <View key={n.id} style={styles.selfTestRow}>
                    <View style={styles.selfTestLeft}>
                      <Feather name="radio" size={14} color={n.isConnected ? colors.accent : colors.mutedForeground} />
                      <Text style={[styles.selfTestLabel, { color: colors.foreground }]}>{n.name ?? n.id}</Text>
                    </View>
                    <Text style={[styles.selfTestState, { color: colors.mutedForeground }]}>
                      Skor: {Math.round(n.anomalyScore?.total ?? 0)}
                      {typeof n.rssi === "number" ? ` · ${n.rssi} dBm` : ""}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <View style={[styles.placeholderCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Feather name="bluetooth" size={40} color={colors.mutedForeground} />
            <Text style={[styles.placeholderTitle, { color: colors.foreground }]}>
              Analiz için BLE bağlantısı gerekli
            </Text>
            <Text style={[styles.placeholderDesc, { color: colors.mutedForeground }]}>
              ORBIT-MESH düğümünü bağlayarak gerçek VLF, Schumann ve uzay havası verilerini canlı izleyin.
            </Text>
            <Pressable
              onPress={() => router.push("/ble" as any)}
              style={({ pressed }) => [
                styles.goToBleBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Feather name="bluetooth" size={16} color={colors.primaryForeground} />
              <Text style={[styles.goToBleText, { color: colors.primaryForeground }]}>BLE'ye Git</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, marginBottom: 16 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 4 },
  statusBanner: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1, padding: 14, marginHorizontal: 20, marginBottom: 16 },
  statusText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 20, gap: 10, marginBottom: 16 },
  metricCard: { width: "47%", flexGrow: 1, borderRadius: 14, borderWidth: 1, padding: 12, gap: 2 },
  metricLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  metricValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  metricSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  anomalyCard: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16, gap: 4 },
  anomalyHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  anomalyTitle: { flex: 1, fontSize: 14, fontFamily: "Inter_700Bold" },
  anomalyValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  anomalyLevel: { fontSize: 15, fontFamily: "Inter_700Bold" },
  consensusText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  pqcCard: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16, gap: 12 },
  pqcTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  pqcGrid: { flexDirection: "row", gap: 10 },
  pqcCell: { flex: 1, gap: 2 },
  pqcLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },
  pqcValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  pqcSeed: { fontSize: 11, fontFamily: "Inter_400Regular" },
  chartCard: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  chartHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  chartTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  chartTabs: { flexDirection: "row", gap: 4 },
  chartTab: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  chartTabText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  chart: { marginTop: 6, borderRadius: 12 },
  chartHint: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 8 },
  selfTestCard: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16, gap: 10 },
  selfTestTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  selfTestRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  selfTestLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  selfTestDot: { width: 10, height: 10, borderRadius: 5 },
  selfTestLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  selfTestState: { fontSize: 11, fontFamily: "Inter_600SemiBold", flexShrink: 1, textAlign: "right" },
  placeholderCard: { marginHorizontal: 20, marginTop: 40, borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", gap: 12 },
  placeholderTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  placeholderDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  goToBleBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  goToBleText: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
