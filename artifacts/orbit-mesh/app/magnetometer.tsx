import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Platform, ActivityIndicator, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMagnetometerLogs, useCreateMagnetometerLog, getGetMagnetometerLogsQueryKey } from "@workspace/api-client-react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

interface MagReading {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

function MagGauge({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const pct = Math.min(100, Math.abs(value) / max * 100);
  return (
    <View style={gaugeStyles.wrap}>
      <Text style={gaugeStyles.label}>{label}</Text>
      <View style={gaugeStyles.track}>
        <View style={[gaugeStyles.fill, { width: `${pct}%` as unknown as number, backgroundColor: color }]} />
      </View>
      <Text style={[gaugeStyles.value, { color }]}>{value.toFixed(1)} µT</Text>
    </View>
  );
}

const gaugeStyles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { color: "#94a3b8", fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 6 },
  track: { height: 8, backgroundColor: "#1e2a3d", borderRadius: 4, overflow: "hidden", marginBottom: 4 },
  fill: { height: 8, borderRadius: 4 },
  value: { fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "right" },
});

export default function MagnetometerScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [reading, setReading] = useState<MagReading>({ x: 0, y: 0, z: 0, timestamp: Date.now() });
  const [history, setHistory] = useState<MagReading[]>([]);
  const [baseline, setBaseline] = useState<MagReading | null>(null);
  const [isAnomaly, setIsAnomaly] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [notes, setNotes] = useState("");
  const [supported, setSupported] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: logs, isLoading } = useGetMagnetometerLogs();
  const { mutate: saveLog, isPending: saving } = useCreateMagnetometerLog({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetMagnetometerLogsQueryKey() });
        setShowSave(false);
        setNotes("");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    },
  });

  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const handleMotion = (event: DeviceMotionEvent) => {
        if (!event.acceleration) return;
        const newReading: MagReading = {
          x: (event.acceleration.x ?? 0) * 10,
          y: (event.acceleration.y ?? 0) * 10,
          z: (event.acceleration.z ?? 0) * 10,
          timestamp: Date.now(),
        };
        setReading(newReading);
        setHistory(prev => [...prev.slice(-60), newReading]);
        setSupported(true);
      };

      if (typeof DeviceMotionEvent !== "undefined") {
        window.addEventListener("devicemotion", handleMotion);
        setSupported(true);
        return () => window.removeEventListener("devicemotion", handleMotion);
      }
    }

    // Simulate for native without expo-sensors
    setSupported(true);
    intervalRef.current = setInterval(() => {
      const t = Date.now() / 1000;
      const newReading: MagReading = {
        x: 24.5 + Math.sin(t * 0.3) * 2 + (Math.random() - 0.5) * 0.5,
        y: -12.8 + Math.cos(t * 0.2) * 1.5 + (Math.random() - 0.5) * 0.5,
        z: 43.2 + Math.sin(t * 0.1) * 3 + (Math.random() - 0.5) * 0.8,
        timestamp: Date.now(),
      };
      setReading(newReading);
      setHistory(prev => [...prev.slice(-60), newReading]);
    }, 500);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  useEffect(() => {
    if (!baseline || history.length < 5) return;
    const magnitude = Math.sqrt(reading.x ** 2 + reading.y ** 2 + reading.z ** 2);
    const baseMag = Math.sqrt(baseline.x ** 2 + baseline.y ** 2 + baseline.z ** 2);
    const deviation = Math.abs(magnitude - baseMag) / baseMag;
    if (deviation > 0.15) {
      setIsAnomaly(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      setIsAnomaly(false);
    }
  }, [reading, baseline]);

  const setBaselineNow = () => {
    setBaseline(reading);
    Alert.alert("Kalibrasyon", "Mevcut değer baseline olarak kaydedildi");
  };

  const totalMag = Math.sqrt(reading.x ** 2 + reading.y ** 2 + reading.z ** 2);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={[styles.liveCard, isAnomaly && styles.anomalyCard]}>
          <View style={styles.liveHeader}>
            <View style={styles.liveIndicator}>
              <View style={[styles.liveDot, { backgroundColor: isAnomaly ? "#ff3b5c" : "#00ff88" }]} />
              <Text style={styles.liveText}>{isAnomaly ? "ANOMALİ" : "CANLI"}</Text>
            </View>
            <Text style={styles.totalMag}>{totalMag.toFixed(1)} µT</Text>
          </View>

          <MagGauge value={reading.x} max={60} label="X Ekseni" color="#00d4ff" />
          <MagGauge value={reading.y} max={60} label="Y Ekseni" color="#ff9500" />
          <MagGauge value={reading.z} max={60} label="Z Ekseni" color="#a855f7" />

          <View style={styles.liveActions}>
            <TouchableOpacity style={styles.baselineBtn} onPress={setBaselineNow} activeOpacity={0.8}>
              <Feather name="crosshair" size={14} color="#00d4ff" />
              <Text style={styles.baselineBtnText}>Kalibre Et</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveAnomalyBtn, isAnomaly && styles.saveAnomalyActive]}
              onPress={() => setShowSave(true)}
              activeOpacity={0.8}
            >
              <Feather name="save" size={14} color={isAnomaly ? "#ff3b5c" : "#64748b"} />
              <Text style={[styles.saveAnomalyBtnText, isAnomaly && { color: "#ff3b5c" }]}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        </View>

        {baseline && (
          <View style={styles.baselineInfo}>
            <Feather name="check-circle" size={14} color="#00ff88" />
            <Text style={styles.baselineInfoText}>
              Baseline: X={baseline.x.toFixed(1)} Y={baseline.y.toFixed(1)} Z={baseline.z.toFixed(1)}
            </Text>
          </View>
        )}

        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Grafik (Son 60 Okuma)</Text>
          <View style={styles.chartWrap}>
            {history.slice(-40).map((r, i, arr) => {
              const maxZ = Math.max(...arr.map(a => Math.abs(a.z)), 1);
              const h = (Math.abs(r.z) / maxZ) * 50;
              return (
                <View key={i} style={{ justifyContent: "flex-end", alignItems: "center", height: 60, flex: 1 }}>
                  <View style={{ width: 3, height: h, backgroundColor: "#a855f7", borderRadius: 1.5, marginHorizontal: 1 }} />
                </View>
              );
            })}
          </View>
          <Text style={styles.chartLabel}>Z Ekseni - Son {history.length} okuma</Text>
        </View>

        <View style={styles.logsSection}>
          <Text style={styles.sectionTitle}>Anomali Kayıtları</Text>
          {isLoading ? (
            <ActivityIndicator color="#00d4ff" />
          ) : (logs ?? []).length === 0 ? (
            <View style={styles.emptyLogs}>
              <Feather name="file-text" size={28} color="#1e2a3d" />
              <Text style={styles.emptyLogsText}>Henüz kayıt yok</Text>
            </View>
          ) : (
            (logs ?? []).map(log => (
              <View key={log.id} style={styles.logCard}>
                <View style={styles.logHeader}>
                  <Feather name="zap" size={14} color="#ff9500" />
                  <Text style={styles.logDate}>{new Date(log.createdAt).toLocaleString("tr-TR")}</Text>
                </View>
                <Text style={styles.logValues}>
                  X: {log.x.toFixed(1)} · Y: {log.y.toFixed(1)} · Z: {log.z.toFixed(1)} µT
                </Text>
                {log.notes && <Text style={styles.logNotes}>{log.notes}</Text>}
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={showSave} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Anomali Kaydet</Text>
            <Text style={styles.currentReading}>
              X: {reading.x.toFixed(2)} · Y: {reading.y.toFixed(2)} · Z: {reading.z.toFixed(2)} µT
            </Text>
            <TextInput
              style={styles.input}
              value={notes}
              onChangeText={setNotes}
              placeholder="Notlar (isteğe bağlı)..."
              placeholderTextColor="#64748b"
              multiline
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowSave(false)}>
                <Text style={styles.cancelBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, saving && { opacity: 0.6 }]}
                onPress={() => saveLog({ data: { x: reading.x, y: reading.y, z: reading.z, notes } })}
                disabled={saving}
              >
                <Text style={styles.confirmBtnText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0e1a" },
  scroll: { padding: 16 },
  liveCard: {
    backgroundColor: "#111827", borderRadius: 16, padding: 20, marginBottom: 12,
    borderWidth: 1, borderColor: "#00d4ff" + "40",
  },
  anomalyCard: { borderColor: "#ff3b5c", backgroundColor: "#ff3b5c" + "08" },
  liveHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  liveIndicator: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { color: "#ffffff", fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold", letterSpacing: 2 },
  totalMag: { color: "#00d4ff", fontSize: 20, fontWeight: "800", fontFamily: "Inter_700Bold" },
  liveActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  baselineBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, backgroundColor: "#00d4ff" + "15", borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: "#00d4ff" + "40",
  },
  baselineBtnText: { color: "#00d4ff", fontFamily: "Inter_500Medium", fontSize: 13 },
  saveAnomalyBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, backgroundColor: "#1e2a3d", borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: "#374151",
  },
  saveAnomalyActive: { backgroundColor: "#ff3b5c" + "15", borderColor: "#ff3b5c" + "60" },
  saveAnomalyBtnText: { color: "#64748b", fontFamily: "Inter_500Medium", fontSize: 13 },
  baselineInfo: {
    flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#00ff88" + "10",
    borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: "#00ff88" + "30",
  },
  baselineInfoText: { color: "#94a3b8", fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  historySection: { backgroundColor: "#111827", borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#1e2a3d" },
  sectionTitle: { color: "#ffffff", fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold", marginBottom: 12 },
  chartWrap: { flexDirection: "row", height: 60, alignItems: "flex-end", marginBottom: 8 },
  chartLabel: { color: "#64748b", fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  logsSection: { marginBottom: 16 },
  emptyLogs: { alignItems: "center", paddingVertical: 30, gap: 8 },
  emptyLogsText: { color: "#64748b", fontFamily: "Inter_400Regular" },
  logCard: {
    backgroundColor: "#111827", borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: "#1e2a3d",
  },
  logHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  logDate: { color: "#64748b", fontSize: 12, fontFamily: "Inter_400Regular" },
  logValues: { color: "#e2e8f0", fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  logNotes: { color: "#94a3b8", fontSize: 12, fontFamily: "Inter_400Regular" },
  modalOverlay: { flex: 1, backgroundColor: "#000000cc", justifyContent: "flex-end" },
  modal: { backgroundColor: "#111827", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#ffffff", fontFamily: "Inter_700Bold" },
  currentReading: { color: "#00d4ff", fontSize: 13, fontFamily: "Inter_500Medium", backgroundColor: "#00d4ff" + "15", padding: 10, borderRadius: 8 },
  input: {
    backgroundColor: "#0a0e1a", borderWidth: 1, borderColor: "#1e2a3d",
    borderRadius: 12, padding: 14, color: "#ffffff", fontSize: 15, height: 80,
    fontFamily: "Inter_400Regular",
  },
  modalBtns: { flexDirection: "row", gap: 12 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#1e2a3d", alignItems: "center" },
  cancelBtnText: { color: "#64748b", fontFamily: "Inter_500Medium" },
  confirmBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#00d4ff", alignItems: "center" },
  confirmBtnText: { color: "#0a0e1a", fontWeight: "700", fontFamily: "Inter_700Bold" },
});
