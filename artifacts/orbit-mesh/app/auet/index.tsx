import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBle } from "@/context/BleContext";
import { useColors } from "@/hooks/useColors";

interface AuetEvent {
  id: string;
  timestamp: string;
  type: string;
  intensity: string;
  notes?: string;
  source: "ble" | "manual";
  nodeId?: string;
  vlf_hz?: number;
  vlf_amplitude?: number;
  anomalyScore?: number;
}

const EVENT_TYPES = ["Titreşim", "Sismik", "Akustik", "Yeraltı Sesi", "VLF Anomali", "Diğer"];
const INTENSITIES = ["Düşük", "Orta", "Yüksek", "Kritik"];

export default function AuetScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { connectedDevice, latestTelemetry, anomalyScore, consensus } = useBle();
  const [events, setEvents] = useState<AuetEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState("Titreşim");
  const [intensity, setIntensity] = useState("Orta");
  const [notes, setNotes] = useState("");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  React.useEffect(() => {
    AsyncStorage.getItem("@orbit-mesh/auet").then(d => { if (d) setEvents(JSON.parse(d)); });
  }, []);

  // Auto-log BLE consensus anomalies
  React.useEffect(() => {
    if (consensus.status === "Normal") return;
    const autoId = `consensus-${consensus.lastUpdated}`;
    setEvents(prev => {
      if (prev.find(e => e.id === autoId)) return prev;
      const autoEvent: AuetEvent = {
        id: autoId,
        timestamp: new Date().toISOString(),
        type: "VLF Anomali",
        intensity: consensus.status === "Doğrulanmış" ? "Kritik" : "Yüksek",
        source: "ble",
        nodeId: latestTelemetry?.nodeId,
        vlf_hz: latestTelemetry?.vlf_hz,
        vlf_amplitude: latestTelemetry?.vlf_amplitude,
        anomalyScore: anomalyScore ? Math.round(anomalyScore.total) : undefined,
      };
      const updated = [autoEvent, ...prev];
      AsyncStorage.setItem("@orbit-mesh/auet", JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, [consensus.lastUpdated]);

  async function logEvent() {
    const event: AuetEvent = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type, intensity,
      notes: notes.trim() || undefined,
      source: "manual",
      nodeId: connectedDevice?.id,
      vlf_hz: latestTelemetry?.vlf_hz,
      vlf_amplitude: latestTelemetry?.vlf_amplitude,
      anomalyScore: anomalyScore ? Math.round(anomalyScore.total) : undefined,
    };
    const updated = [event, ...events];
    setEvents(updated);
    await AsyncStorage.setItem("@orbit-mesh/auet", JSON.stringify(updated));
    setNotes(""); setShowForm(false);
  }

  const intensityColor = (i: string) => {
    if (i === "Kritik") return colors.danger;
    if (i === "Yüksek") return colors.warning;
    if (i === "Orta") return colors.primary;
    return colors.accent;
  };

  const isConnected = !!connectedDevice;
  const hasData = !!latestTelemetry;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>AUET</Text>
        <Pressable onPress={() => setShowForm(f => !f)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Feather name={showForm ? "x" : "plus"} size={24} color={colors.accent} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <LinearGradient colors={[colors.accent + "22", "transparent"]} style={StyleSheet.absoluteFill} />
          <Feather name="activity" size={24} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoTitle, { color: colors.foreground }]}>Akustik Yeraltı Olay Takibi</Text>
            <Text style={[styles.infoDesc, { color: colors.mutedForeground }]}>
              Titreşim, sismik ve akustik olayları logla. BLE bağlıyken anomaliler otomatik kaydedilir.
            </Text>
          </View>
        </View>

        {/* Status */}
        {isConnected && hasData ? (
          <View style={[styles.statusCard, { backgroundColor: consensus.status !== "Normal" ? colors.danger + "22" : colors.accent + "22", borderColor: consensus.status !== "Normal" ? colors.danger + "44" : colors.accent + "44" }]}>
            <Feather name={consensus.status !== "Normal" ? "alert-triangle" : "check-circle"} size={14} color={consensus.status !== "Normal" ? colors.danger : colors.accent} />
            <Text style={[styles.statusText, { color: consensus.status !== "Normal" ? colors.danger : colors.accent }]}>
              {consensus.status !== "Normal" ? `Mesh Anomali: ${consensus.status} (${consensus.anomalyCount} node)` : `Cihaz bağlı: ${connectedDevice.name ?? connectedDevice.id}`}
            </Text>
          </View>
        ) : isConnected ? (
          <View style={[styles.statusCard, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "44" }]}>
            <Feather name="bluetooth" size={14} color={colors.primary} />
            <Text style={[styles.statusText, { color: colors.primary }]}>
              {connectedDevice.name ?? connectedDevice.id} bağlı — telemetri bekleniyor...
            </Text>
          </View>
        ) : (
          <View style={[styles.statusCard, { backgroundColor: colors.warning + "22", borderColor: colors.warning + "44" }]}>
            <Feather name="clock" size={14} color={colors.warning} />
            <Text style={[styles.statusText, { color: colors.warning }]}>Donanım bağlı değil — Manuel kayıt modu aktif</Text>
          </View>
        )}

        {/* Anomaly Score Panel */}
        {anomalyScore && (
          <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.scoreTitle, { color: colors.foreground }]}>Anomali Skoru</Text>
            <View style={styles.scoreRow}>
              <View style={[styles.scoreCircle, { borderColor: anomalyScore.total >= 60 ? colors.danger : anomalyScore.total >= 30 ? colors.warning : colors.accent }]}>
                <Text style={[styles.scoreValue, { color: anomalyScore.total >= 60 ? colors.danger : anomalyScore.total >= 30 ? colors.warning : colors.accent }]}>
                  {Math.round(anomalyScore.total)}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.scoreLevel, { color: anomalyScore.total >= 60 ? colors.danger : anomalyScore.total >= 30 ? colors.warning : colors.accent }]}>
                  {anomalyScore.level}
                </Text>
                <Text style={[styles.scoreBreakdown, { color: colors.mutedForeground }]}>
                  VLF {anomalyScore.vlfScore.toFixed(0)} | Mag {anomalyScore.magneticScore.toFixed(0)} | Temp {anomalyScore.thermalScore.toFixed(0)} | Seis {anomalyScore.seismicScore.toFixed(0)}
                </Text>
              </View>
            </View>
            <Text style={[styles.consensusLabel, { color: colors.mutedForeground }]}>
              Mesh Consensus: {consensus.status} ({consensus.anomalyCount}/{consensus.totalNodes} node)
            </Text>
          </View>
        )}

        {/* Live Telemetry */}
        {isConnected && hasData && (
          <View style={[styles.telemetryPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.telemetryTitle, { color: colors.foreground }]}>Anlık BLE Sensör Verisi</Text>
            <View style={styles.telemetryGrid}>
              <View style={styles.telemetryCell}>
                <Text style={[styles.telemetryLabel, { color: colors.mutedForeground }]}>VLF Frekans</Text>
                <Text style={[styles.telemetryValue, { color: colors.primary }]}>{latestTelemetry.vlf_hz > 0 ? `${latestTelemetry.vlf_hz.toFixed(2)} Hz` : "—"}</Text>
              </View>
              <View style={styles.telemetryCell}>
                <Text style={[styles.telemetryLabel, { color: colors.mutedForeground }]}>Amplitüd</Text>
                <Text style={[styles.telemetryValue, { color: colors.primary }]}>{latestTelemetry.vlf_amplitude > 0 ? latestTelemetry.vlf_amplitude.toFixed(3) : "—"}</Text>
              </View>
              <View style={styles.telemetryCell}>
                <Text style={[styles.telemetryLabel, { color: colors.mutedForeground }]}>Batarya</Text>
                <Text style={[styles.telemetryValue, { color: latestTelemetry.battery > 20 ? colors.accent : colors.danger }]}>{latestTelemetry.battery > 0 ? `%${latestTelemetry.battery}` : "—"}</Text>
              </View>
              <View style={styles.telemetryCell}>
                <Text style={[styles.telemetryLabel, { color: colors.mutedForeground }]}>Sıcaklık</Text>
                <Text style={[styles.telemetryValue, { color: colors.foreground }]}>{latestTelemetry.temp_c !== 0 ? `${latestTelemetry.temp_c.toFixed(1)}°C` : "—"}</Text>
              </View>
              <View style={styles.telemetryCell}>
                <Text style={[styles.telemetryLabel, { color: colors.mutedForeground }]}>Signal Quality</Text>
                <Text style={[styles.telemetryValue, { color: colors.secondary }]}>{latestTelemetry.vlf_amplitude > 500 ? "Güçlü" : latestTelemetry.vlf_amplitude > 100 ? "Orta" : "Zayıf"}</Text>
              </View>
              <View style={styles.telemetryCell}>
                <Text style={[styles.telemetryLabel, { color: colors.mutedForeground }]}>Current Score</Text>
                <Text style={[styles.telemetryValue, { color: anomalyScore ? (anomalyScore.total >= 60 ? colors.danger : anomalyScore.total >= 30 ? colors.warning : colors.accent) : colors.mutedForeground }]}>
                  {anomalyScore ? Math.round(anomalyScore.total) : "—"}
                </Text>
              </View>
            </View>
            {latestTelemetry.anomaly && (
              <View style={[styles.anomalyRow, { backgroundColor: colors.danger + "22" }]}>
                <Feather name="alert-triangle" size={14} color={colors.danger} />
                <Text style={[styles.anomalyText, { color: colors.danger }]}>ANOMALİ ALGILANDI — otomatik log oluşturuldu</Text>
              </View>
            )}
          </View>
        )}

        {showForm && (
          <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.formTitle, { color: colors.foreground }]}>Olay Kaydet</Text>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Olay Tipi</Text>
            <View style={styles.chipRow}>
              {EVENT_TYPES.map(t => (
                <Pressable key={t} style={[styles.chip, { backgroundColor: type === t ? colors.accent : colors.muted, borderColor: type === t ? colors.accent : colors.border }]} onPress={() => setType(t)}>
                  <Text style={[styles.chipText, { color: type === t ? colors.background : colors.foreground }]}>{t}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Şiddet</Text>
            <View style={styles.chipRow}>
              {INTENSITIES.map(i => (
                <Pressable key={i} style={[styles.chip, { backgroundColor: intensity === i ? intensityColor(i) : colors.muted, borderColor: intensity === i ? intensityColor(i) : colors.border }]} onPress={() => setIntensity(i)}>
                  <Text style={[styles.chipText, { color: intensity === i ? colors.background : colors.foreground }]}>{i}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Notlar</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]} value={notes} onChangeText={setNotes} placeholder="Gözlem notları..." placeholderTextColor={colors.mutedForeground} multiline />
            <Pressable style={[styles.logBtn, { backgroundColor: colors.accent }]} onPress={logEvent}>
              <Feather name="save" size={16} color={colors.background} />
              <Text style={[styles.logBtnText, { color: colors.background }]}>Kaydet</Text>
            </Pressable>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Olay Günlüğü ({events.length})</Text>
        {events.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="radio" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Henüz olay kaydedilmedi</Text>
          </View>
        ) : (
          events.map(e => (
            <View key={e.id} style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: intensityColor(e.intensity), borderLeftWidth: 3 }]}>
              <View style={styles.eventTop}>
                <Text style={[styles.eventType, { color: colors.foreground }]}>{e.type}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  {e.source === "ble" && <View style={[styles.bleBadge, { backgroundColor: colors.accent + "22" }]}><Feather name="bluetooth" size={10} color={colors.accent} /><Text style={[styles.bleBadgeText, { color: colors.accent }]}>BLE</Text></View>}
                  <View style={[styles.intensityBadge, { backgroundColor: intensityColor(e.intensity) + "33" }]}>
                    <Text style={[styles.intensityText, { color: intensityColor(e.intensity) }]}>{e.intensity}</Text>
                  </View>
                </View>
              </View>
              <Text style={[styles.eventTime, { color: colors.mutedForeground }]}>{new Date(e.timestamp).toLocaleString("tr-TR")}</Text>
              {e.vlf_hz !== undefined && <Text style={[styles.eventMeta, { color: colors.primary }]}>VLF: {e.vlf_hz.toFixed(2)} Hz · Amp: {(e.vlf_amplitude ?? 0).toFixed(3)}</Text>}
              {e.anomalyScore !== undefined && <Text style={[styles.eventMeta, { color: colors.warning }]}>Anomaly Score: {e.anomalyScore}</Text>}
              {e.notes && <Text style={[styles.eventNotes, { color: colors.mutedForeground }]}>{e.notes}</Text>}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  infoCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16, overflow: "hidden" },
  infoTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 4 },
  infoDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  statusCard: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 16 },
  statusText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  scoreCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16, gap: 10 },
  scoreTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  scoreCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, alignItems: "center", justifyContent: "center" },
  scoreValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  scoreLevel: { fontSize: 16, fontFamily: "Inter_700Bold" },
  scoreBreakdown: { fontSize: 11, fontFamily: "Inter_400Regular" },
  consensusLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  telemetryPanel: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16, gap: 10 },
  telemetryTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  telemetryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  telemetryCell: { width: "45%", gap: 2 },
  telemetryLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  telemetryValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  anomalyRow: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 8, padding: 8 },
  anomalyText: { fontSize: 12, fontFamily: "Inter_700Bold", flex: 1 },
  form: { borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 20, gap: 10 },
  formTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular", minHeight: 70 },
  logBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12 },
  logBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 12 },
  emptyCard: { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  eventCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, gap: 6 },
  eventTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eventType: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  bleBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  bleBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  intensityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  intensityText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  eventTime: { fontSize: 12, fontFamily: "Inter_400Regular" },
  eventMeta: { fontSize: 12, fontFamily: "Inter_500Medium" },
  eventNotes: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
