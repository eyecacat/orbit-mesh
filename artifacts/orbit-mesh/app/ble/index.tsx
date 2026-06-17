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

const SERVICE_UUID = "12345678-1234-1234-1234-123456789abc";

export default function BleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [showDebug, setShowDebug] = useState(false);

  const {
    isAvailable, isExpoGoEnv, permissionsGranted,
    scanning, devices, connectedDevice,
    telemetry, latestTelemetry,
    anomalyScore, consensus, meshNodes, nodeMoving,
    logs, requestPermissions, startScan, stopScan,
    connectToDevice, disconnect,
  } = useBle();

  const isWeb = Platform.OS === "web";
  const isBlocked = isWeb || isExpoGoEnv || isAvailable === false || permissionsGranted === false;

  async function handleScan() {
    if (isWeb || isExpoGoEnv) {
      Alert.alert("BLE Yok", isWeb ? "Web ortamında BLE desteklenmiyor." : "Expo Go'da BLE çalışmaz.");
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
    try { await connectToDevice(device); }
    catch (err: any) { Alert.alert("Bağlantı Hatası", err?.message ?? "Bilinmeyen hata"); }
  }

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

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>BLE Ağı</Text>
        <Pressable onPress={() => setShowDebug(v => !v)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Feather name="terminal" size={22} color={showDebug ? colors.primary : colors.mutedForeground} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
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
            { backgroundColor: isBlocked ? colors.muted : scanning ? colors.warning : colors.primary, opacity: pressed ? 0.8 : 1 },
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
                <Text style={[styles.connectedName, { color: colors.foreground }]}>{connectedDevice.name ?? "Bilinmeyen Cihaz"}</Text>
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
            {anomalyScore.motionFiltered && (
              <Text style={[styles.motionFiltered, { color: colors.warning }]}>
                ⚠ Node hareket ediyor — yanlış pozitif filtre uygulandı
              </Text>
            )}
            <Text style={[styles.consensusLabel, { color: colors.mutedForeground }]}>
              Mesh Consensus: {consensus.status} ({consensus.anomalyCount}/{consensus.totalNodes} node)
            </Text>
          </View>
        )}

        {/* Live Telemetry */}
        {latestTelemetry && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Anlık Telemetri</Text>
            <View style={[styles.liveCard, { backgroundColor: colors.card, borderColor: colors.accent + "44" }]}>
              <LinearGradient colors={[colors.accent + "11", "transparent"]} style={StyleSheet.absoluteFill} />
              <View style={styles.liveGrid}>
                <View style={styles.liveCell}>
                  <Text style={[styles.liveCellLabel, { color: colors.mutedForeground }]}>VLF Frekans</Text>
                  <Text style={[styles.liveCellValue, { color: colors.primary }]}>
                    {latestTelemetry.vlf_hz > 0 ? `${latestTelemetry.vlf_hz.toFixed(2)} Hz` : "bekleniyor"}
                  </Text>
                </View>
                <View style={styles.liveCell}>
                  <Text style={[styles.liveCellLabel, { color: colors.mutedForeground }]}>Amplitüd</Text>
                  <Text style={[styles.liveCellValue, { color: colors.primary }]}>
                    {latestTelemetry.vlf_amplitude > 0 ? latestTelemetry.vlf_amplitude.toFixed(3) : "bekleniyor"}
                  </Text>
                </View>
                <View style={styles.liveCell}>
                  <Text style={[styles.liveCellLabel, { color: colors.mutedForeground }]}>Batarya</Text>
                  <Text style={[styles.liveCellValue, { color: latestTelemetry.battery > 20 ? colors.accent : colors.danger }]}>
                    {latestTelemetry.battery > 0 ? `%${latestTelemetry.battery}` : "bekleniyor"}
                  </Text>
                </View>
                <View style={styles.liveCell}>
                  <Text style={[styles.liveCellLabel, { color: colors.mutedForeground }]}>Sıcaklık</Text>
                  <Text style={[styles.liveCellValue, { color: colors.foreground }]}>
                    {latestTelemetry.temp_c !== 0 ? `${latestTelemetry.temp_c.toFixed(1)}°C` : "bekleniyor"}
                  </Text>
                </View>
                {/* Magnetometer */}
                <View style={styles.liveCell}>
                  <Text style={[styles.liveCellLabel, { color: colors.mutedForeground }]}>Manyetik (X/Y/Z)</Text>
                  <Text style={[styles.liveCellValue, { color: colors.secondary }]}>
                    {latestTelemetry.mx.toFixed(1)} / {latestTelemetry.my.toFixed(1)} / {latestTelemetry.mz.toFixed(1)}
                  </Text>
                </View>
                <View style={styles.liveCell}>
                  <Text style={[styles.liveCellLabel, { color: colors.mutedForeground }]}>Hareket (X/Y/Z)</Text>
                  <Text style={[styles.liveCellValue, { color: nodeMoving ? colors.warning : colors.foreground }]}>
                    {latestTelemetry.ax.toFixed(2)} / {latestTelemetry.ay.toFixed(2)} / {latestTelemetry.az.toFixed(2)}
                  </Text>
                </View>
              </View>
              {latestTelemetry.nodeId !== "unknown" && (
                <Text style={[styles.nodeId, { color: colors.mutedForeground }]}>
                  Node: {latestTelemetry.nodeId} · {new Date(latestTelemetry.receivedAt).toLocaleTimeString("tr-TR")}
                </Text>
              )}
              {latestTelemetry.anomaly && (
                <View style={[styles.anomalyBadge, { backgroundColor: colors.danger + "22", borderColor: colors.danger + "66" }]}>
                  <Feather name="alert-triangle" size={14} color={colors.danger} />
                  <Text style={[styles.anomalyText, { color: colors.danger }]}>ANOMALİ ALGILANDI</Text>
                </View>
              )}
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
                keyExtractor={t => `${t.receivedAt}-${t.nodeId}`}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
                renderItem={({ item, index }) => (
                  <View style={[styles.historyRow, { borderTopColor: colors.border, borderTopWidth: index === 0 ? 0 : 1 }]}>
                    <Text style={[styles.historyTime, { color: colors.mutedForeground }]}>
                      {new Date(item.receivedAt).toLocaleTimeString("tr-TR", { hour12: false })}
                    </Text>
                    <Text style={[styles.historyVal, { color: colors.primary }]}>{item.vlf_hz.toFixed(2)} Hz</Text>
                    <Text style={[styles.historyVal, { color: colors.foreground }]}>{item.vlf_amplitude.toFixed(3)}</Text>
                    <Text style={[styles.historyVal, { color: item.battery > 20 ? colors.accent : colors.danger }]}>%{item.battery}</Text>
                    <Text style={[styles.historyVal, { color: colors.foreground }]}>{item.temp_c.toFixed(1)}°C</Text>
                    {item.anomaly && <Feather name="alert-triangle" size={12} color={colors.danger} />}
                  </View>
                )}
              />
            </View>
          </>
        )}

        {/* Device List */}
        {devices.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Keşfedilen Cihazlar ({devices.length})</Text>
            {devices.map(device => {
              const signal = device.rssi ?? -100;
              const signalColor = signal > -60 ? colors.accent : signal > -80 ? colors.warning : colors.danger;
              const isConnected = connectedDevice?.id === device.id;
              return (
                <Pressable
                  key={device.id}
                  style={({ pressed }) => [
                    styles.deviceCard,
                    { backgroundColor: colors.card, borderColor: isConnected ? colors.accent + "66" : colors.border, opacity: pressed ? 0.7 : 1 },
                  ]}
                  onPress={() => isConnected ? disconnect() : handleConnect(device)}
                >
                  <View style={styles.deviceRow}>
                    <View style={[styles.deviceIcon, { backgroundColor: isConnected ? colors.accent + "22" : colors.primary + "22" }]}>
                      <Feather name="bluetooth" size={18} color={isConnected ? colors.accent : colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.deviceName, { color: colors.foreground }]}>{device.name ?? "(İsimsiz)"}</Text>
                      <Text style={[styles.deviceId, { color: colors.mutedForeground }]}>{device.id}</Text>
                    </View>
                    <View style={styles.rssiCol}>
                      <Text style={[styles.rssiValue, { color: signalColor }]}>{device.rssi ?? "?"} dBm</Text>
                      <View style={[styles.rssiBar, { backgroundColor: colors.muted }]}>
                        <View style={[styles.rssiFill, { backgroundColor: signalColor, width: `${Math.max(0, Math.min(100, (signal + 100) / 60 * 100))}%` }]} />
                      </View>
                    </View>
                    <Feather name={isConnected ? "x-circle" : "chevron-right"} size={18} color={isConnected ? colors.danger : colors.mutedForeground} />
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
              Deneyap Kart ORBIT-MESH firmware ile başlatılmış olmalı.
            </Text>
          </View>
        )}

        {/* Firmware Reference */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Beklenen Cihaz / JSON Formatı</Text>
        <View style={[styles.codeBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Text style={[styles.code, { color: colors.accent }]}>{`Cihaz Adı: ORBIT-MESH-*\nService: ${SERVICE_UUID}\n\n{\n  "nodeId":"NODE01",\n  "timestamp":123456,\n  "vlf_hz":52.7,\n  "vlf_amplitude":812,\n  "battery":91,\n  "temp_c":28.3,\n  "mx":12.4,\n  "my":-4.2,\n  "mz":8.1,\n  "ax":0.01,\n  "ay":0.02,\n  "az":0.98,\n  "anomaly":false\n}`}</Text>
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
            keyExtractor={l => l.id}
            style={{ maxHeight: 220 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const logColor = item.level === "error" ? colors.danger : item.level === "warn" ? colors.warning : item.level === "scan" ? colors.secondary : "#6ee7b7";
              return <Text style={[styles.logLine, { color: logColor }]} numberOfLines={3}>{item.time} {item.message}</Text>;
            }}
          />
        </View>
      )}
    </View>
  );
}

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
  motionFiltered: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
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
