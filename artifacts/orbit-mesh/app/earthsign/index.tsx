import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useBle } from "@/context/BleContext";
import { useColors } from "@/hooks/useColors";

interface EarthSignRecord {
  id: string;
  title: string;
  timestamp: string;
  deviceId: string;
  userId: string;
  hash: string;
  location?: string;
  notes?: string;
  vlfHz?: number;
  vlfAmplitude?: number;
  mx?: number; my?: number; mz?: number;
  ax?: number; ay?: number; az?: number;
  anomaly?: boolean;
  anomalyScore?: number;
  consensusStatus?: string;
  nodeList?: string[];
  source: "ble" | "manual";
}

export default function EarthSignScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { connectedDevice, latestTelemetry, anomalyScore, consensus } = useBle();
  const [records, setRecords] = useState<EarthSignRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  React.useEffect(() => {
    load();
  }, []);

  // Auto-seal mesh consensus anomalies
  React.useEffect(() => {
    if (consensus.status === "Normal") return;
    const autoId = `mesh-consensus-${consensus.lastUpdated}`;
    setRecords(prev => {
      if (prev.find(r => r.id === autoId)) return prev;
      const hash = `ESG-MESH-${consensus.lastUpdated.toString(16).toUpperCase()}`;
      const record: EarthSignRecord = {
        id: autoId,
        title: `Mesh Anomali — ${consensus.status}`,
        timestamp: new Date().toISOString(),
        deviceId: connectedDevice?.id ?? "MESH",
        userId: user?.id ?? "anonymous",
        hash,
        vlfHz: latestTelemetry?.vlf_hz,
        vlfAmplitude: latestTelemetry?.vlf_amplitude,
        mx: latestTelemetry?.mx, my: latestTelemetry?.my, mz: latestTelemetry?.mz,
        ax: latestTelemetry?.ax, ay: latestTelemetry?.ay, az: latestTelemetry?.az,
        anomaly: true,
        anomalyScore: anomalyScore ? Math.round(anomalyScore.total) : undefined,
        consensusStatus: consensus.status,
        nodeList: consensus.nodeScores.map(n => n.nodeId),
        source: "ble",
        notes: `Otomatik mühür: ${consensus.anomalyCount} node anomali. Mesh consensus: ${consensus.status}`,
      };
      const updated = [record, ...prev];
      AsyncStorage.setItem("@orbit-mesh/earthsign", JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, [consensus.lastUpdated]);

  async function load() {
    const data = await AsyncStorage.getItem("@orbit-mesh/earthsign");
    if (data) setRecords(JSON.parse(data));
  }

  async function createRecord() {
    if (!title.trim()) { Alert.alert("Hata", "Başlık gerekli"); return; }
    const now = new Date().toISOString();
    const hash = `ESG-${Date.now().toString(16).toUpperCase()}`;
    const record: EarthSignRecord = {
      id: Date.now().toString(),
      title: title.trim(),
      timestamp: now,
      deviceId: connectedDevice?.id ?? "LOCAL",
      userId: user?.id ?? "anonymous",
      hash,
      notes: notes.trim() || undefined,
      vlfHz: latestTelemetry?.vlf_hz,
      vlfAmplitude: latestTelemetry?.vlf_amplitude,
      mx: latestTelemetry?.mx, my: latestTelemetry?.my, mz: latestTelemetry?.mz,
      ax: latestTelemetry?.ax, ay: latestTelemetry?.ay, az: latestTelemetry?.az,
      anomaly: latestTelemetry?.anomaly ?? false,
      anomalyScore: anomalyScore ? Math.round(anomalyScore.total) : undefined,
      consensusStatus: consensus.status,
      source: connectedDevice ? "ble" : "manual",
    };
    const updated = [record, ...records];
    setRecords(updated);
    await AsyncStorage.setItem("@orbit-mesh/earthsign", JSON.stringify(updated));
    setTitle(""); setNotes(""); setShowForm(false);
  }

  const isConnected = !!connectedDevice;
  const hasData = !!latestTelemetry;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>EarthSign</Text>
        <Pressable onPress={() => setShowForm(f => !f)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Feather name={showForm ? "x" : "plus"} size={24} color={colors.secondary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <LinearGradient colors={[colors.secondary + "22", "transparent"]} style={StyleSheet.absoluteFill} />
          <Feather name="shield" size={24} color={colors.secondary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoTitle, { color: colors.foreground }]}>Kayıt & Kaynak Sistemi</Text>
            <Text style={[styles.infoDesc, { color: colors.mutedForeground }]}>
              Her kayıt zaman damgası, cihaz kimliği ve kullanıcı imzasıyla mühürlenir. Mesh anomalileri otomatik mühürlenir.
            </Text>
          </View>
        </View>

        {/* Status */}
        {isConnected && hasData ? (
          <View style={[styles.statusCard, { backgroundColor: consensus.status !== "Normal" ? colors.danger + "22" : colors.accent + "22", borderColor: consensus.status !== "Normal" ? colors.danger + "44" : colors.accent + "44" }]}>
            <Feather name={consensus.status !== "Normal" ? "alert-triangle" : "shield"} size={14} color={consensus.status !== "Normal" ? colors.danger : colors.accent} />
            <Text style={[styles.statusText, { color: consensus.status !== "Normal" ? colors.danger : colors.accent }]}>
              {consensus.status !== "Normal"
                ? `Mesh Anomali: ${consensus.status} (${consensus.anomalyCount} node)`
                : `Aktif: ${connectedDevice.name ?? connectedDevice.id} · Node: ${latestTelemetry.nodeId}`}
            </Text>
          </View>
        ) : isConnected ? (
          <View style={[styles.statusCard, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "44" }]}>
            <Feather name="bluetooth" size={14} color={colors.primary} />
            <Text style={[styles.statusText, { color: colors.primary }]}>
              {connectedDevice.name ?? connectedDevice.id} bağlı — veri bekleniyor...
            </Text>
          </View>
        ) : null}

        {/* Live BLE Panel */}
        {isConnected && hasData && (
          <View style={[styles.blePanel, { backgroundColor: colors.card, borderColor: colors.secondary + "44" }]}>
            <View style={styles.blePanelHeader}>
              <Feather name="bluetooth" size={14} color={colors.secondary} />
              <Text style={[styles.blePanelTitle, { color: colors.secondary }]}>Anlık BLE Sensör Verisi</Text>
            </View>
            <View style={styles.bleGrid}>
              <View style={styles.bleCell}>
                <Text style={[styles.bleCellLabel, { color: colors.mutedForeground }]}>VLF</Text>
                <Text style={[styles.bleCellValue, { color: colors.primary }]}>{latestTelemetry.vlf_hz > 0 ? `${latestTelemetry.vlf_hz.toFixed(2)} Hz` : "—"}</Text>
              </View>
              <View style={styles.bleCell}>
                <Text style={[styles.bleCellLabel, { color: colors.mutedForeground }]}>Amplitüd</Text>
                <Text style={[styles.bleCellValue, { color: colors.primary }]}>{latestTelemetry.vlf_amplitude > 0 ? latestTelemetry.vlf_amplitude.toFixed(3) : "—"}</Text>
              </View>
              <View style={styles.bleCell}>
                <Text style={[styles.bleCellLabel, { color: colors.mutedForeground }]}>Sıcaklık</Text>
                <Text style={[styles.bleCellValue, { color: colors.foreground }]}>{latestTelemetry.temp_c !== 0 ? `${latestTelemetry.temp_c.toFixed(1)}°C` : "—"}</Text>
              </View>
              <View style={styles.bleCell}>
                <Text style={[styles.bleCellLabel, { color: colors.mutedForeground }]}>Durum</Text>
                <Text style={[styles.bleCellValue, { color: latestTelemetry.anomaly ? colors.danger : colors.accent }]}>{latestTelemetry.anomaly ? "⚠ ANOMALİ" : "Normal"}</Text>
              </View>
              <View style={styles.bleCell}>
                <Text style={[styles.bleCellLabel, { color: colors.mutedForeground }]}>Score</Text>
                <Text style={[styles.bleCellValue, { color: anomalyScore ? (anomalyScore.total >= 60 ? colors.danger : anomalyScore.total >= 30 ? colors.warning : colors.accent) : colors.mutedForeground }]}>
                  {anomalyScore ? Math.round(anomalyScore.total) : "—"}
                </Text>
              </View>
              <View style={styles.bleCell}>
                <Text style={[styles.bleCellLabel, { color: colors.mutedForeground }]}>Consensus</Text>
                <Text style={[styles.bleCellValue, { color: consensus.status !== "Normal" ? colors.danger : colors.accent }]}>{consensus.status}</Text>
              </View>
            </View>
            <Text style={[styles.bleMeta, { color: colors.mutedForeground }]}>{new Date(latestTelemetry.receivedAt).toLocaleTimeString("tr-TR")}</Text>
          </View>
        )}

        {showForm && (
          <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.formTitle, { color: colors.foreground }]}>Yeni EarthSign Kaydı</Text>
            {isConnected && (
              <View style={[styles.formNote, { backgroundColor: colors.secondary + "22" }]}>
                <Feather name="info" size={12} color={colors.secondary} />
                <Text style={[styles.formNoteText, { color: colors.secondary }]}>
                  Cihaz: {connectedDevice.name ?? connectedDevice.id}{hasData ? ` · VLF=${latestTelemetry.vlf_hz.toFixed(2)}Hz` : ""}
                </Text>
              </View>
            )}
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Başlık</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]} value={title} onChangeText={setTitle} placeholder="Olay başlığı..." placeholderTextColor={colors.mutedForeground} />
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Notlar (opsiyonel)</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border, minHeight: 80 }]} value={notes} onChangeText={setNotes} placeholder="Gözlem notları..." placeholderTextColor={colors.mutedForeground} multiline />
            <Pressable style={[styles.createBtn, { backgroundColor: colors.secondary }]} onPress={createRecord}>
              <Feather name="shield" size={16} color="white" />
              <Text style={styles.createBtnText}>Kaydı Mühürle</Text>
            </Pressable>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Kayıtlar ({records.length})</Text>
        {records.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="file-text" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Henüz kayıt yok</Text>
          </View>
        ) : (
          records.map(r => (
            <View key={r.id} style={[styles.recordCard, { backgroundColor: colors.card, borderColor: r.anomaly ? colors.danger + "44" : colors.border, borderLeftWidth: r.anomaly ? 3 : 1, borderLeftColor: r.anomaly ? colors.danger : colors.border }]}>
              <View style={styles.recordTop}>
                <Text style={[styles.recordTitle, { color: colors.foreground }]}>{r.title}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  {r.source === "ble" && <View style={[styles.sourceBadge, { backgroundColor: colors.accent + "22" }]}><Feather name="bluetooth" size={9} color={colors.accent} /><Text style={[styles.sourceBadgeText, { color: colors.accent }]}>BLE</Text></View>}
                  <View style={[styles.hashBadge, { backgroundColor: colors.secondary + "22" }]}><Text style={[styles.hashText, { color: colors.secondary }]}>{r.hash}</Text></View>
                </View>
              </View>
              <Text style={[styles.recordTime, { color: colors.mutedForeground }]}>{new Date(r.timestamp).toLocaleString("tr-TR")}</Text>
              {r.deviceId && r.deviceId !== "LOCAL" && <Text style={[styles.recordDevice, { color: colors.primary }]}>Cihaz: {r.deviceId}</Text>}
              {r.vlfHz !== undefined && r.vlfHz > 0 && <Text style={[styles.recordMeta, { color: colors.primary }]}>VLF: {r.vlfHz.toFixed(2)} Hz · Amp: {(r.vlfAmplitude ?? 0).toFixed(3)}</Text>}
              {r.anomalyScore !== undefined && <Text style={[styles.recordMeta, { color: colors.warning }]}>Score: {r.anomalyScore} | Consensus: {r.consensusStatus}</Text>}
              {r.nodeList && r.nodeList.length > 0 && <Text style={[styles.recordMeta, { color: colors.mutedForeground }]}>Nodes: {r.nodeList.join(", ")}</Text>}
              {r.notes && <Text style={[styles.recordNotes, { color: colors.mutedForeground }]}>{r.notes}</Text>}
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
  statusCard: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 12 },
  statusText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  blePanel: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16, gap: 10 },
  blePanelHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  blePanelTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  bleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  bleCell: { width: "45%", gap: 2 },
  bleCellLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  bleCellValue: { fontSize: 17, fontFamily: "Inter_700Bold" },
  bleMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  form: { borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 20, gap: 10 },
  formTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  formNote: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, padding: 8 },
  formNoteText: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  createBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12 },
  createBtnText: { color: "white", fontSize: 14, fontFamily: "Inter_700Bold" },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 12 },
  emptyCard: { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  recordCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, gap: 6 },
  recordTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  recordTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  sourceBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5 },
  sourceBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold" },
  hashBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  hashText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  recordTime: { fontSize: 12, fontFamily: "Inter_400Regular" },
  recordDevice: { fontSize: 11, fontFamily: "Inter_500Medium" },
  recordMeta: { fontSize: 12, fontFamily: "Inter_500Medium" },
  recordNotes: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
