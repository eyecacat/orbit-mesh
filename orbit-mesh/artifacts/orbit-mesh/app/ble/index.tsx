// app/ble/index.tsx
// ORBIT-MESH PRO V2.1 ULTRA FIRMWARE İLE TAM UYUMLU EKRAN
// Tüm yeni özellikler (Schumann, ADS, yön, hareket, PQC) gösterilir.
// IMU ile ilgili kısımlar kaldırılmıştır.

import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBle } from "@/context/BleContext";
import { useColors } from "@/hooks/useColors";
import { OrbitMeshTelemetry } from "@/utils/telemetryParser";

const SERVICE_UUID = "12345678-1234-1234-1234-123456789abc";

export default function BleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [showDebug, setShowDebug] = useState(false);

  const {
    isAvailable,
    isExpoGoEnv,
    permissionsGranted,
    scanning,
    devices,
    connectedDevice,
    telemetry,
    latestTelemetry,
    anomalyScore,
    consensus,
    meshNodes,
    logs,
    requestPermissions,
    startScan,
    stopScan,
    connectToDevice,
    disconnect,
  } = useBle();

  const isWeb = Platform.OS === "web";
  const isBlocked = isWeb || isExpoGoEnv || isAvailable === false || permissionsGranted === false;

  async function handleScan() {
    if (isWeb || isExpoGoEnv) {
      Alert.alert(
        "BLE Yok",
        isWeb ? "Web ortamında BLE desteklenmiyor." : "Expo Go'da BLE çalışmaz."
      );
      return;
    }
    if (permissionsGranted !== true) {
      const ok = await requestPermissions();
      if (!ok) return;
    }
    if (scanning) stopScan();
    else startScan();
  }

  async function handleConnect(device: typeof devices[0]) {
    try {
      await connectToDevice(device);
    } catch (err: any) {
      Alert.alert("Bağlantı Hatası", err?.message ?? "Bilinmeyen hata");
    }
  }

  // Banner durumu
  const banner = isWeb
    ? { icon: "alert-triangle" as const, c: colors.danger, title: "Web Ortamı — BLE Yok", desc: "Fiziksel cihazda test edin." }
    : isExpoGoEnv
    ? { icon: "alert-triangle" as const, c: colors.warning, title: "Expo Go — BLE Çalışmaz", desc: "EAS Development Build gerekli." }
    : isAvailable === false
    ? { icon: "bluetooth" as const, c: colors.danger, title: "Bluetooth Kapalı", desc: "Bluetooth'u açın." }
    : permissionsGranted === false
    ? { icon: "lock" as const, c: colors.warning, title: "İzinler Eksik", desc: "Cihaz Tara'ya dokunun." }
    : connectedDevice
    ? { icon: "check-circle" as const, c: colors.accent, title: `Bağlı: ${connectedDevice.name ?? connectedDevice.id}`, desc: "BLE bağlantısı aktif." }
    : { icon: "bluetooth" as const, c: colors.primary, title: "BLE Hazır", desc: "Tarama başlatabilirsiniz." };

  // Telemetri verisini güvenle al
  const tele = latestTelemetry as OrbitMeshTelemetry | null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>BLE Ağı</Text>
        <Pressable onPress={() => setShowDebug((v) => !v)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Feather name="terminal" size={22} color={showDebug ? colors.primary : colors.mutedForeground} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={[styles.banner, { backgroundColor: banner.c + "22", borderColor: banner.c + "66" }]}>
          <Feather name={banner.icon} size={20} color={banner.c} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.bannerTitle, { color: banner.c }]}>{banner.title}</Text>
            <Text style={[styles.bannerDesc, { color: colors.mutedForeground }]}>{banner.desc}</Text>
          </View>
        </View>

        {/* Scan Button */}
        <Pressable
          style={({ pressed }) => [
            styles.scanBtn,
            {
              backgroundColor: isBlocked ? colors.muted : scanning ? colors.warning : colors.primary,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          onPress={handleScan}
        >
          {scanning ? (
            <>
              <ActivityIndicator color={colors.background} size="small" />
              <Text style={[styles.scanText, { color: colors.background }]}>Taranıyor... ({devices.length} bulundu)</Text>
            </>
          ) : (
            <>
              <Feather name="search" size={18} color={colors.background} />
              <Text style={[styles.scanText, { color: colors.background }]}>
                {permissionsGranted !== true && !isWeb && !isExpoGoEnv ? "İzin Ver & Tara" : "Cihaz Tara"}
              </Text>
            </>
          )}
        </Pressable>

        {/* Mesh Analytics Button */}
        {meshNodes.length > 0 && (
          <Pressable
            style={({ pressed }) => [
              styles.meshBtn,
              { backgroundColor: colors.secondary, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={() => router.push("/mesh")}
          >
            <Feather name="server" size={16} color="white" />
            <Text style={styles.meshBtnText}>Mesh Analytics Paneli ({meshNodes.length} node)</Text>
          </Pressable>
        )}

        {/* Connected Device */}
        {connectedDevice && (
          <View style={[styles.connectedCard, { backgroundColor: colors.card, borderColor: colors.accent + "66" }]}>
            <LinearGradient colors={[colors.accent + "22", "transparent"]} style={StyleSheet.absoluteFill} />
            <View style={styles.connectedRow}>
              <View style={[styles.dot, { backgroundColor: colors.accent }]} />
              <Feather name="check-circle" size={20} color={colors.accent} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.connectedName, { color: colors.foreground }]}>
                  {connectedDevice.name ?? "Bilinmeyen Cihaz"}
                </Text>
                <Text style={[styles.connectedId, { color: colors.mutedForeground }]}>{connectedDevice.id}</Text>
              </View>
              <Pressable onPress={disconnect} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                <Feather name="x-circle" size={22} color={colors.danger} />
              </Pressable>
            </View>
          </View>
        )}

        {/* Anomaly Score + Consensus */}
        {anomalyScore && (
          <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.scoreTitle, { color: colors.foreground }]}>Anomali Skoru</Text>
            <View style={styles.scoreRow}>
              <View
                style={[
                  styles.scoreCircle,
                  {
                    borderColor:
                      anomalyScore.total >= 70
                        ? colors.danger
                        : anomalyScore.total >= 50
                        ? colors.warning
                        : colors.accent,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.scoreValue,
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
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  style={[
                    styles.scoreLevel,
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
                <Text style={[styles.scoreBreakdown, { color: colors.mutedForeground }]}>
                  VLF {anomalyScore.vlfScore.toFixed(0)} | Schumann {anomalyScore.schumannScore.toFixed(0)} | Hareket {anomalyScore.motionScore.toFixed(0)} | Gürültü {anomalyScore.noiseScore.toFixed(0)}
                </Text>
              </View>
            </View>
            <Text style={[styles.consensusLabel, { color: colors.mutedForeground }]}>
              Mesh Consensus: {consensus.status} ({consensus.anomalyCount}/{consensus.totalNodes} node)
            </Text>
          </View>
        )}

        {/* Live Telemetry – Yeni alanlarla zenginleştirildi */}
        {tele && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Canlı Telemetri (Firmware V2.1)</Text>
            <View style={[styles.liveCard, { backgroundColor: colors.card, borderColor: colors.accent + "44" }]}>
              <LinearGradient colors={[colors.accent + "11", "transparent"]} style={StyleSheet.absoluteFill} />

              {/* VLF ve Schumann */}
              <View style={styles.liveGrid}>
                <View style={styles.liveCell}>
                  <Text style={[styles.liveCellLabel, { color: colors.mutedForeground }]}>VLF Frekans</Text>
                  <Text style={[styles.liveCellValue, { color: colors.primary }]}>
                    {tele.vlf_hz > 0 ? `${tele.vlf_hz.toFixed(2)} Hz` : "bekleniyor"}
                  </Text>
                </View>
                <View style={styles.liveCell}>
                  <Text style={[styles.liveCellLabel, { color: colors.mutedForeground }]}>VLF Genlik</Text>
                  <Text style={[styles.liveCellValue, { color: colors.primary }]}>
                    {tele.vlf_amp > 0 ? tele.vlf_amp.toFixed(1) : "bekleniyor"}
                  </Text>
                </View>
                <View style={styles.liveCell}>
                  <Text style={[styles.liveCellLabel, { color: colors.mutedForeground }]}>Schumann Frekans</Text>
                  <Text style={[styles.liveCellValue, { color: tele.sch_active ? colors.accent : colors.danger }]}>
                    {tele.sch_hz.toFixed(2)} Hz
                  </Text>
                </View>
                <View style={styles.liveCell}>
                  <Text style={[styles.liveCellLabel, { color: colors.mutedForeground }]}>Schumann Oranı</Text>
                  <Text style={[styles.liveCellValue, { color: tele.sch_ratio > 1 ? colors.accent : colors.warning }]}>
                    {tele.sch_ratio.toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* ADS1115 ve Bant Enerjileri */}
              <View style={styles.liveGrid}>
                <View style={styles.liveCell}>
                  <Text style={[styles.liveCellLabel, { color: colors.mutedForeground }]}>ADS1115 (1/2)</Text>
                  <Text style={[styles.liveCellValue, { color: colors.foreground }]}>
                    {tele.ads1.toFixed(3)}V / {tele.ads2.toFixed(3)}V
                  </Text>
                </View>
                <View style={styles.liveCell}>
                  <Text style={[styles.liveCellLabel, { color: colors.mutedForeground }]}>Bant 6-10 Hz</Text>
                  <Text style={[styles.liveCellValue, { color: colors.secondary }]}>{tele.b6_10.toFixed(1)}</Text>
                </View>
                <View style={styles.liveCell}>
                  <Text style={[styles.liveCellLabel, { color: colors.mutedForeground }]}>Bant 17-25 Hz</Text>
                  <Text style={[styles.liveCellValue, { color: colors.secondary }]}>{tele.b17_25.toFixed(1)}</Text>
                </View>
                <View style={styles.liveCell}>
                  <Text style={[styles.liveCellLabel, { color: colors.mutedForeground }]}>Şebeke 45-55 Hz</Text>
                  <Text style={[styles.liveCellValue, { color: tele.mains ? colors.danger : colors.foreground }]}>
                    {tele.b45_55.toFixed(1)}
                  </Text>
                </View>
              </View>

              {/* Yön ve Hareket */}
              <View style={styles.liveGrid}>
                <View style={styles.liveCell}>
                  <Text style={[styles.liveCellLabel, { color: colors.mutedForeground }]}>Dalga Yönü</Text>
                  <Text style={[styles.liveCellValue, { color: colors.accent }]}>
                    {tele.wave_dir.toFixed(1)}° ({tele.wave_src})
                  </Text>
                </View>
                <View style={styles.liveCell}>
                  <Text style={[styles.liveCellLabel, { color: colors.mutedForeground }]}>Tutarlılık</Text>
                  <Text style={[styles.liveCellValue, { color: tele.wave_coh > 0.7 ? colors.accent : colors.warning }]}>
                    {(tele.wave_coh * 100).toFixed(0)}%
                  </Text>
                </View>
                <View style={styles.liveCell}>
                  <Text style={[styles.liveCellLabel, { color: colors.mutedForeground }]}>İyonosferik Hız</Text>
                  <Text style={[styles.liveCellValue, { color: tele.mot_vel > 1 ? colors.warning : colors.foreground }]}>
                    {tele.mot_vel.toFixed(2)} km/s
                  </Text>
                </View>
                <View style={styles.liveCell}>
                  <Text style={[styles.liveCellLabel, { color: colors.mutedForeground }]}>Hareket Yönü</Text>
                  <Text style={[styles.liveCellValue, { color: colors.secondary }]}>
                    {tele.mot_head.toFixed(1)}° {tele.mot_trend}
                  </Text>
                </View>
              </View>

              {/* PQC ve Batarya */}
              <View style={styles.liveGrid}>
                <View style={styles.liveCell}>
                  <Text style={[styles.liveCellLabel, { color: colors.mutedForeground }]}>PQC Seed</Text>
                  <Text style={[styles.liveCellValue, { color: colors.mutedForeground, fontSize: 14 }]}>
                    {tele.pqc_seed.substring(0, 8)}…
                  </Text>
                </View>
                <View style={styles.liveCell}>
                  <Text style={[styles.liveCellLabel, { color: colors.mutedForeground }]}>Batarya</Text>
                  <Text style={[styles.liveCellValue, { color: tele.bat > 20 ? colors.accent : colors.danger }]}>
                    %{tele.bat.toFixed(0)}
                  </Text>
                </View>
                <View style={styles.liveCell}>
                  <Text style={[styles.liveCellLabel, { color: colors.mutedForeground }]}>Durum</Text>
                  <Text style={[styles.liveCellValue, { color: colors.primary }]}>{tele.state}</Text>
                </View>
                <View style={styles.liveCell}>
                  <Text style={[styles.liveCellLabel, { color: colors.mutedForeground }]}>Güven</Text>
                  <Text style={[styles.liveCellValue, { color: tele.mot_conf > 50 ? colors.accent : colors.warning }]}>
                    %{tele.mot_conf}
                  </Text>
                </View>
              </View>

              {tele.anomaly && (
                <View style={[styles.anomalyBadge, { backgroundColor: colors.danger + "22", borderColor: colors.danger + "66" }]}>
                  <Feather name="alert-triangle" size={14} color={colors.danger} />
                  <Text style={[styles.anomalyText, { color: colors.danger }]}>ANOMALİ ALGILANDI</Text>
                </View>
              )}
              <Text style={[styles.nodeId, { color: colors.mutedForeground }]}>
                Node: {tele.nodeId} · Uptime: {tele.uptime}s · {new Date(tele.receivedAt).toLocaleTimeString("tr-TR")}
              </Text>
            </View>
          </>
        )}

        {/* Telemetry History */}
        {telemetry.length > 1 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Geçmiş ({telemetry.length})</Text>
            <View style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <FlatList
                data={telemetry.slice(0, 12)}
                keyExtractor={(item, index) => `${item.receivedAt}-${index}`}
                scrollEnabled={false}
                renderItem={({ item, index }) => {
                  const t = item as OrbitMeshTelemetry;
                  return (
                    <View style={[styles.historyRow, { borderTopColor: colors.border, borderTopWidth: index === 0 ? 0 : 1 }]}>
                      <Text style={[styles.historyTime, { color: colors.mutedForeground }]}>
                        {new Date(t.receivedAt).toLocaleTimeString("tr-TR", { hour12: false })}
                      </Text>
                      <Text style={[styles.historyVal, { color: colors.primary }]}>{t.vlf_hz.toFixed(2)} Hz</Text>
                      <Text style={[styles.historyVal, { color: colors.foreground }]}>{t.vlf_amp.toFixed(0)}</Text>
                      <Text style={[styles.historyVal, { color: t.bat > 20 ? colors.accent : colors.danger }]}>%{t.bat}</Text>
                      <Text style={[styles.historyVal, { color: t.sch_active ? colors.accent : colors.danger }]}>
                        {t.sch_hz.toFixed(2)}
                      </Text>
                      {t.anomaly && <Feather name="alert-triangle" size={12} color={colors.danger} />}
                    </View>
                  );
                }}
              />
            </View>
          </>
        )}

        {/* Device List */}
        {devices.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Keşfedilen Cihazlar ({devices.length})</Text>
            {devices.map((device) => {
              const signal = device.rssi ?? -100;
              const signalColor = signal > -60 ? colors.accent : signal > -80 ? colors.warning : colors.danger;
              const isConnected = connectedDevice?.id === device.id;
              return (
                <Pressable
                  key={device.id}
                  style={({ pressed }) => [
                    styles.deviceCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: isConnected ? colors.accent + "66" : colors.border,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                  onPress={() => (isConnected ? disconnect() : handleConnect(device))}
                >
                  <View style={styles.deviceRow}>
                    <View
                      style={[
                        styles.deviceIcon,
                        { backgroundColor: isConnected ? colors.accent + "22" : colors.primary + "22" },
                      ]}
                    >
                      <Feather name="bluetooth" size={18} color={isConnected ? colors.accent : colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.deviceName, { color: colors.foreground }]}>
                        {device.name ?? "(İsimsiz)"}
                      </Text>
                      <Text style={[styles.deviceId, { color: colors.mutedForeground }]}>{device.id}</Text>
                    </View>
                    <View style={styles.rssiCol}>
                      <Text style={[styles.rssiValue, { color: signalColor }]}>{device.rssi ?? "?"} dBm</Text>
                      <View style={[styles.rssiBar, { backgroundColor: colors.muted }]}>
                        <View
                          style={[
                            styles.rssiFill,
                            {
                              backgroundColor: signalColor,
                              width: `${Math.max(0, Math.min(100, (signal + 100) / 60 * 100))}%`,
                            },
                          ]}
                        />
                      </View>
                    </View>
                    <Feather
                      name={isConnected ? "x-circle" : "chevron-right"}
                      size={18}
                      color={isConnected ? colors.danger : colors.mutedForeground}
                    />
                  </View>
                </Pressable>
              );
            })}
          </>
        )}

        {/* Empty State */}
        {!scanning && devices.length === 0 && !connectedDevice && (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="bluetooth" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Henüz cihaz bulunmadı</Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              Deneyap Kart ORBIT-MESH ULTRA firmware ile başlatılmış olmalı.
            </Text>
          </View>
        )}

        {/* Firmware Reference - Güncellendi */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Beklenen Firmware JSON Formatı (V2.1 ULTRA)</Text>
        <View style={[styles.codeBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Text style={[styles.code, { color: colors.accent }]}>{`{
  "nodeId":"ORBIT-1744",
  "uptime":42,
  "vlf_hz":1.00,
  "vlf_amp":30475.895,
  "bat":0.0,
  "anomaly":false,
  "fault":false,
  "mains":false,
  "sq":26.3,
  "act":14.65,
  "state":"WATCH",
  "sch_active":true,
  "sch_hz":7.00,
  "sch_ratio":4.611,
  "ads1":0.0000,
  "ads2":0.0000,
  "b6_10":13773.637,
  "b17_25":7400.775,
  "b45_55":2594.881,
  "wave_dir":179.6,
  "wave_src":"GUNEYBATI",
  "wave_coh":1.00,
  "mot_vel":0.00,
  "mot_head":0.0,
  "mot_trend":"STATIONARY",
  "mot_conf":0,
  "pqc_seed":"b0545b8b..."
}`}</Text>
        </View>
      </ScrollView>

      {/* Debug Panel */}
      {showDebug && (
        <View style={[styles.debugPanel, { backgroundColor: "#020810", borderTopColor: colors.border }]}>
          <View style={styles.debugHeader}>
            <Text style={[styles.debugTitle, { color: colors.accent }]}>Debug Log ({logs.length})</Text>
            <Pressable onPress={() => setShowDebug(false)}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <FlatList
            data={logs.slice(0, 80)}
            keyExtractor={(l) => l.id}
            style={{ maxHeight: 220 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const logColor =
                item.level === "error"
                  ? colors.danger
                  : item.level === "warn"
                  ? colors.warning
                  : item.level === "scan"
                  ? colors.secondary
                  : "#6ee7b7";
              return (
                <Text style={[styles.logLine, { color: logColor }]} numberOfLines={3}>
                  {item.time} {item.message}
                </Text>
              );
            }}
          />
        </View>
      )}
    </View>
  );
}

// ── Stiller (öncekiyle aynı, sadece renkler kullanılıyor) ──
const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  banner: { flexDirection: "row", alignItems: "center", borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  bannerTitle: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 2 },
  bannerDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  scanBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 16, paddingVertical: 14, marginBottom: 16 },
  scanText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  meshBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 12, marginBottom: 16 },
  meshBtnText: { color: "white", fontSize: 14, fontFamily: "Inter_700Bold" },
  connectedCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16, overflow: "hidden" },
  connectedRow: { flexDirection: "row", alignItems: "center" },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  connectedName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  connectedId: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  scoreCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16, gap: 10 },
  scoreTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  scoreCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, alignItems: "center", justifyContent: "center" },
  scoreValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  scoreLevel: { fontSize: 16, fontFamily: "Inter_700Bold" },
  scoreBreakdown: { fontSize: 11, fontFamily: "Inter_400Regular" },
  consensusLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 10, marginTop: 4 },
  liveCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 20, overflow: "hidden", gap: 12 },
  liveGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  liveCell: { width: "45%", gap: 4 },
  liveCellLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  liveCellValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  nodeId: { fontSize: 11, fontFamily: "Inter_400Regular" },
  anomalyBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, borderWidth: 1, padding: 10 },
  anomalyText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  historyCard: { borderRadius: 16, borderWidth: 1, marginBottom: 20, overflow: "hidden" },
  historyRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, gap: 10 },
  historyTime: { fontSize: 10, fontFamily: "Inter_400Regular", width: 60 },
  historyVal: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  deviceCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  deviceRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  deviceIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  deviceName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  deviceId: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  rssiCol: { alignItems: "flex-end", gap: 4 },
  rssiValue: { fontSize: 11, fontFamily: "Inter_500Medium" },
  rssiBar: { width: 48, height: 4, borderRadius: 2, overflow: "hidden" },
  rssiFill: { height: 4, borderRadius: 2 },
  emptyCard: { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", gap: 12, marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  codeBox: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 20 },
  code: { fontSize: 11, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", lineHeight: 18 },
  debugPanel: { position: "absolute", bottom: 0, left: 0, right: 0, borderTopWidth: 1, padding: 12 },
  debugHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  debugTitle: { fontSize: 12, fontFamily: "Inter_700Bold" },
  logLine: { fontSize: 10, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", lineHeight: 15, paddingVertical: 1 },
});
