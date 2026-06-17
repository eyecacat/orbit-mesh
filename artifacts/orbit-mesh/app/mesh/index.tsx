import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBle } from "@/context/BleContext";
import { useColors } from "@/hooks/useColors";

export default function MeshScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { meshNodes, anomalyScore, consensus, latestTelemetry } = useBle();

  const consensusColor =
    consensus.status === "Doğrulanmış" ? colors.danger :
    consensus.status === "Şüpheli" ? colors.warning : colors.accent;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Mesh Analytics</Text>
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

        {/* Global Score */}
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
                {anomalyScore.motionFiltered && (
                  <Text style={[styles.motionFiltered, { color: colors.warning }]}>
                    ⚠ Hareket filtreli — node taşınıyor olabilir
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Latest Telemetry */}
        {latestTelemetry && (
          <View style={[styles.latestCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Son Telemetri</Text>
            <View style={styles.latestGrid}>
              <View style={styles.latestCell}>
                <Text style={[styles.latestLabel, { color: colors.mutedForeground }]}>Node</Text>
                <Text style={[styles.latestValue, { color: colors.foreground }]}>{latestTelemetry.nodeId}</Text>
              </View>
              <View style={styles.latestCell}>
                <Text style={[styles.latestLabel, { color: colors.mutedForeground }]}>VLF</Text>
                <Text style={[styles.latestValue, { color: colors.primary }]}>{latestTelemetry.vlf_hz.toFixed(2)} Hz</Text>
              </View>
              <View style={styles.latestCell}>
                <Text style={[styles.latestLabel, { color: colors.mutedForeground }]}>Amp</Text>
                <Text style={[styles.latestValue, { color: colors.primary }]}>{latestTelemetry.vlf_amplitude.toFixed(3)}</Text>
              </View>
              <View style={styles.latestCell}>
                <Text style={[styles.latestLabel, { color: colors.mutedForeground }]}>Bat</Text>
                <Text style={[styles.latestValue, { color: latestTelemetry.battery > 20 ? colors.accent : colors.danger }]}>%{latestTelemetry.battery}</Text>
              </View>
              <View style={styles.latestCell}>
                <Text style={[styles.latestLabel, { color: colors.mutedForeground }]}>Temp</Text>
                <Text style={[styles.latestValue, { color: colors.foreground }]}>{latestTelemetry.temp_c.toFixed(1)}°C</Text>
              </View>
              <View style={styles.latestCell}>
                <Text style={[styles.latestLabel, { color: colors.mutedForeground }]}>Mag</Text>
                <Text style={[styles.latestValue, { color: colors.secondary }]}>
                  {Math.sqrt(latestTelemetry.mx**2 + latestTelemetry.my**2 + latestTelemetry.mz**2).toFixed(1)}
                </Text>
              </View>
              <View style={styles.latestCell}>
                <Text style={[styles.latestLabel, { color: colors.mutedForeground }]}>Motion</Text>
                <Text style={[styles.latestValue, { color: Math.abs(Math.sqrt(latestTelemetry.ax**2 + latestTelemetry.ay**2 + latestTelemetry.az**2) - 1.0) > 1.5 ? colors.warning : colors.foreground }]}>
                  {Math.abs(Math.sqrt(latestTelemetry.ax**2 + latestTelemetry.ay**2 + latestTelemetry.az**2) - 1.0).toFixed(2)}
                </Text>
              </View>
              <View style={styles.latestCell}>
                <Text style={[styles.latestLabel, { color: colors.mutedForeground }]}>Anomaly</Text>
                <Text style={[styles.latestValue, { color: latestTelemetry.anomaly ? colors.danger : colors.accent }]}>
                  {latestTelemetry.anomaly ? "EVET" : "Hayır"}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Node List */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Node Listesi ({meshNodes.length})</Text>
        {meshNodes.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="server" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Henüz node kaydedilmedi</Text>
          </View>
        ) : (
          meshNodes.map(node => {
            const score = node.anomalyScore;
            const scoreColor = score ? (score.total >= 60 ? colors.danger : score.total >= 30 ? colors.warning : colors.accent) : colors.mutedForeground;
            return (
              <View key={node.id} style={[styles.nodeCard, { backgroundColor: colors.card, borderColor: node.health === "Kritik" ? colors.danger + "44" : node.health === "Yüksek" ? colors.warning + "44" : colors.border }]}>
                <View style={styles.nodeTop}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={[styles.nodeDot, { backgroundColor: node.isConnected ? colors.accent : colors.mutedForeground }]} />
                    <Text style={[styles.nodeName, { color: colors.foreground }]}>{node.name ?? node.id}</Text>
                  </View>
                  <View style={[styles.healthBadge, { backgroundColor: scoreColor + "22" }]}>
                    <Text style={[styles.healthText, { color: scoreColor }]}>{node.health}</Text>
                  </View>
                </View>
                <Text style={[styles.nodeId, { color: colors.mutedForeground }]}>{node.id}</Text>
                <Text style={[styles.nodeMeta, { color: colors.mutedForeground }]}>
                  Son görülme: {new Date(node.lastSeen).toLocaleTimeString("tr-TR")}
                </Text>
                {score && (
                  <Text style={[styles.nodeScore, { color: scoreColor }]}>
                    Skor: {Math.round(score.total)} | VLF {score.vlfScore.toFixed(0)} | Mag {score.magneticScore.toFixed(0)} | Temp {score.thermalScore.toFixed(0)} | Seis {score.seismicScore.toFixed(0)}
                  </Text>
                )}
                {score?.motionFiltered && (
                  <Text style={[styles.nodeFiltered, { color: colors.warning }]}>
                    ⚠ Hareket filtreli — veri güvenilmez
                  </Text>
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
  motionFiltered: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  latestCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16, gap: 10 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 10 },
  latestGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  latestCell: { width: "22%", gap: 2 },
  latestLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },
  latestValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  emptyCard: { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  nodeCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, gap: 6 },
  nodeTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  nodeDot: { width: 8, height: 8, borderRadius: 4 },
  nodeName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  nodeId: { fontSize: 11, fontFamily: "Inter_400Regular" },
  nodeMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  healthBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  healthText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  nodeScore: { fontSize: 12, fontFamily: "Inter_500Medium" },
  nodeFiltered: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
