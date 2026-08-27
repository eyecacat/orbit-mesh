// app/mesh/index.tsx
// ORBIT-MESH PRO V2.1 — Mesh Ağı Yönetim Paneli
// Tüm bağlı düğümler listelenir, her düğüm için detaylar gösterilir.

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBle } from "@/context/BleContext";
import { useColors } from "@/hooks/useColors";
import { OrbitMeshTelemetry } from "@/utils/telemetryParser";

export default function MeshScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { meshNodes, connectedDevices, anomalyScore, consensus, latestTelemetry } = useBle();

  const consensusColor =
    consensus.status === "Doğrulanmış" ? colors.danger :
    consensus.status === "Şüpheli" ? colors.warning : colors.accent;

  const tele = latestTelemetry as OrbitMeshTelemetry | null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Mesh Ağı</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Consensus Banner */}
        <View style={[styles.consensusBanner, { backgroundColor: consensusColor + "22", borderColor: consensusColor + "66" }]}>
          <Feather name={consensus.status === "Normal" ? "check-circle" : "alert-triangle"} size={24} color={consensusColor} />
          <View style={{ marginLeft: 12 }}>
            <Text style={[styles.consensusTitle, { color: consensusColor }]}>
              {consensus.status === "Normal" ? "Tüm Sistem Normal" : `Mesh ${consensus.status} Alarmı`}
            </Text>
            <Text style={[styles.consensusDesc, { color: colors.mutedForeground }]}>
              {consensus.anomalyCount} node anomali · {consensus.totalNodes} toplam node
            </Text>
          </View>
        </View>

        {/* Global Anomali Skoru */}
        {anomalyScore && (
          <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.scoreTitle, { color: colors.foreground }]}>Anomali Skoru</Text>
            <View style={styles.scoreRow}>
              <View style={[styles.scoreCircle, { borderColor: anomalyScore.total >= 70 ? colors.danger : anomalyScore.total >= 50 ? colors.warning : colors.accent }]}>
                <Text style={[styles.scoreValue, { color: anomalyScore.total >= 70 ? colors.danger : anomalyScore.total >= 50 ? colors.warning : colors.accent }]}>
                  {Math.round(anomalyScore.total)}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.scoreLevel, { color: anomalyScore.total >= 70 ? colors.danger : anomalyScore.total >= 50 ? colors.warning : colors.accent }]}>
                  {anomalyScore.level}
                </Text>
                <Text style={[styles.scoreBreakdown, { color: colors.mutedForeground }]}>
                  VLF {anomalyScore.vlfScore.toFixed(0)} | Schumann {anomalyScore.schumannScore.toFixed(0)} | Hareket {anomalyScore.motionScore.toFixed(0)} | Gürültü {anomalyScore.noiseScore.toFixed(0)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Son Telemetri (ana düğüm) */}
        {tele && (
          <View style={[styles.latestCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ana Düğüm Son Veri</Text>
            <View style={styles.latestGrid}>
              <View style={styles.latestCell}>
                <Text style={[styles.latestLabel, { color: colors.mutedForeground }]}>Node</Text>
                <Text style={[styles.latestValue, { color: colors.foreground }]}>{tele.nodeId}</Text>
              </View>
              <View style={styles.latestCell}>
                <Text style={[styles.latestLabel, { color: colors.mutedForeground }]}>VLF Frekans</Text>
                <Text style={[styles.latestValue, { color: colors.primary }]}>{tele.vlf_hz.toFixed(2)} Hz</Text>
              </View>
              <View style={styles.latestCell}>
                <Text style={[styles.latestLabel, { color: colors.mutedForeground }]}>VLF Genlik</Text>
                <Text style={[styles.latestValue, { color: colors.primary }]}>{tele.vlf_amp.toFixed(1)}</Text>
              </View>
              <View style={styles.latestCell}>
                <Text style={[styles.latestLabel, { color: colors.mutedForeground }]}>Batarya</Text>
                <Text style={[styles.latestValue, { color: tele.bat > 20 ? colors.accent : colors.danger }]}>%{tele.bat.toFixed(0)}</Text>
              </View>
              <View style={styles.latestCell}>
                <Text style={[styles.latestLabel, { color: colors.mutedForeground }]}>Durum</Text>
                <Text style={[styles.latestValue, { color: colors.foreground }]}>{tele.state}</Text>
              </View>
              <View style={styles.latestCell}>
                <Text style={[styles.latestLabel, { color: colors.mutedForeground }]}>Schumann</Text>
                <Text style={[styles.latestValue, { color: tele.sch_active ? colors.accent : colors.danger }]}>
                  {tele.sch_hz.toFixed(2)} Hz
                </Text>
              </View>
              <View style={styles.latestCell}>
                <Text style={[styles.latestLabel, { color: colors.mutedForeground }]}>Yön</Text>
                <Text style={[styles.latestValue, { color: colors.secondary }]}>
                  {tele.wave_dir.toFixed(1)}° {tele.wave_src}
                </Text>
              </View>
              <View style={styles.latestCell}>
                <Text style={[styles.latestLabel, { color: colors.mutedForeground }]}>Hareket Hızı</Text>
                <Text style={[styles.latestValue, { color: tele.mot_vel > 1 ? colors.warning : colors.foreground }]}>
                  {tele.mot_vel.toFixed(2)} km/s
                </Text>
              </View>
              <View style={styles.latestCell}>
                <Text style={[styles.latestLabel, { color: colors.mutedForeground }]}>Hareket Trend</Text>
                <Text style={[styles.latestValue, { color: tele.mot_trend === "APPROACHING" ? colors.danger : colors.accent }]}>
                  {tele.mot_trend}
                </Text>
              </View>
              <View style={styles.latestCell}>
                <Text style={[styles.latestLabel, { color: colors.mutedForeground }]}>Anomali</Text>
                <Text style={[styles.latestValue, { color: tele.anomaly ? colors.danger : colors.accent }]}>
                  {tele.anomaly ? "EVET" : "Hayır"}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Node Listesi */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Ağdaki Düğümler ({meshNodes.length})
        </Text>

        {meshNodes.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="server" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Henüz düğüm kaydedilmedi</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>BLE'den en az bir Deneyap Kart bağlayın.</Text>
          </View>
        ) : (
          meshNodes.map(node => {
            const score = node.anomalyScore;
            const scoreColor = score ? (score.total >= 70 ? colors.danger : score.total >= 50 ? colors.warning : colors.accent) : colors.mutedForeground;
            const t = node.telemetry;
            const isConnected = node.isConnected;
            const rssi = node.rssi;
            const signalStrength = rssi !== null ? (rssi > -60 ? "Güçlü" : rssi > -80 ? "Orta" : "Zayıf") : "?";

            return (
              <View key={node.id} style={[styles.nodeCard, { backgroundColor: colors.card, borderColor: node.health === "Kritik" ? colors.danger + "44" : node.health === "Yüksek" ? colors.warning + "44" : colors.border }]}>
                <View style={styles.nodeTop}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={[styles.nodeDot, { backgroundColor: isConnected ? colors.accent : colors.mutedForeground }]} />
                    <Text style={[styles.nodeName, { color: colors.foreground }]}>{node.name ?? node.id}</Text>
                  </View>
                  <View style={[styles.healthBadge, { backgroundColor: scoreColor + "22" }]}>
                    <Text style={[styles.healthText, { color: scoreColor }]}>{node.health}</Text>
                  </View>
                </View>
                <Text style={[styles.nodeId, { color: colors.mutedForeground }]}>{node.id}</Text>
                <View style={styles.nodeMetaRow}>
                  <Text style={[styles.nodeMeta, { color: colors.mutedForeground }]}>
                    Son görülme: {new Date(node.lastSeen).toLocaleTimeString("tr-TR")}
                  </Text>
                  <Text style={[styles.nodeRssi, { color: rssi !== null ? (rssi > -60 ? colors.accent : rssi > -80 ? colors.warning : colors.danger) : colors.mutedForeground }]}>
                    {rssi !== null ? `${rssi} dBm (${signalStrength})` : "Sinyal yok"}
                  </Text>
                </View>
                {score && (
                  <Text style={[styles.nodeScore, { color: scoreColor }]}>
                    Skor: {Math.round(score.total)} | VLF {score.vlfScore.toFixed(0)} | Schumann {score.schumannScore.toFixed(0)} | Hareket {score.motionScore.toFixed(0)} | Gürültü {score.noiseScore.toFixed(0)}
                  </Text>
                )}
                {t && (
                  <Text style={[styles.nodeDetail, { color: colors.mutedForeground }]}>
                    VLF {t.vlf_hz.toFixed(2)}Hz · Sch {t.sch_hz.toFixed(2)}Hz · Hız {t.mot_vel.toFixed(2)} km/s
                  </Text>
                )}
                {!isConnected && (
                  <View style={[styles.offlineBadge, { backgroundColor: colors.danger + "22", borderColor: colors.danger + "44" }]}>
                    <Feather name="alert-circle" size={12} color={colors.danger} />
                    <Text style={[styles.offlineText, { color: colors.danger }]}>Bağlantı Kesik</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  consensusBanner: { flexDirection: "row", alignItems: "center", borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  consensusTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 2 },
  consensusDesc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  scoreCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16, gap: 10 },
  scoreTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  scoreCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, alignItems: "center", justifyContent: "center" },
  scoreValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  scoreLevel: { fontSize: 16, fontFamily: "Inter_700Bold" },
  scoreBreakdown: { fontSize: 11, fontFamily: "Inter_400Regular" },
  latestCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16, gap: 10 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 10 },
  latestGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  latestCell: { width: "30%", gap: 2 },
  latestLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },
  latestValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  emptyCard: { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  emptySub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "gray" },
  nodeCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, gap: 6 },
  nodeTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  nodeDot: { width: 8, height: 8, borderRadius: 4 },
  nodeName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  nodeId: { fontSize: 11, fontFamily: "Inter_400Regular" },
  nodeMetaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  nodeMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  nodeRssi: { fontSize: 11, fontFamily: "Inter_500Medium" },
  healthBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  healthText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  nodeScore: { fontSize: 12, fontFamily: "Inter_500Medium" },
  nodeDetail: { fontSize: 11, fontFamily: "Inter_400Regular" },
  offlineBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: "flex-start" },
  offlineText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
