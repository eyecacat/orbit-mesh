// app/mesh-consensus/index.tsx
// ORBIT-MESH PRO V2.1 — Anomali Konsensus ve Doğrulama Paneli

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBle } from "@/context/BleContext";
import { useColors } from "@/hooks/useColors";

export default function MeshConsensusScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { meshNodes, consensus, anomalyScore } = useBle();

  const consensusColor =
    consensus.status === "Doğrulanmış"
      ? colors.danger
      : consensus.status === "Şüpheli"
      ? colors.warning
      : colors.accent;

  // Anomali skoru yüksek olan düğümleri filtrele
  const anomalousNodes = meshNodes.filter(
    (node) => node.anomalyScore && node.anomalyScore.total >= 50
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, borderBottomColor: colors.border },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Konsensus
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Konsensus Banner */}
        <View
          style={[
            styles.consensusBanner,
            {
              backgroundColor: consensusColor + "22",
              borderColor: consensusColor + "66",
            },
          ]}
        >
          <Feather
            name={
              consensus.status === "Normal" ? "check-circle" : "alert-triangle"
            }
            size={28}
            color={consensusColor}
          />
          <View style={{ marginLeft: 12 }}>
            <Text style={[styles.consensusTitle, { color: consensusColor }]}>
              {consensus.status === "Normal"
                ? "Tüm Sistem Normal"
                : `Mesh ${consensus.status} Alarmı`}
            </Text>
            <Text style={[styles.consensusDesc, { color: colors.mutedForeground }]}>
              {consensus.anomalyCount} node anomali · {consensus.totalNodes} toplam node
            </Text>
            <Text style={[styles.consensusTime, { color: colors.mutedForeground }]}>
              Son güncelleme: {new Date(consensus.lastUpdated).toLocaleTimeString("tr-TR")}
            </Text>
          </View>
        </View>

        {/* Global Anomali Skoru */}
        {anomalyScore && (
          <View
            style={[
              styles.scoreCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.scoreTitle, { color: colors.foreground }]}>
              Global Anomali Skoru
            </Text>
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
                  VLF {anomalyScore.vlfScore.toFixed(0)} · Schumann {anomalyScore.schumannScore.toFixed(0)} · Hareket {anomalyScore.motionScore.toFixed(0)} · Gürültü {anomalyScore.noiseScore.toFixed(0)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Doğrulanmış Anomaliler */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Doğrulanmış Anomaliler ({anomalousNodes.length})
        </Text>

        {anomalousNodes.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="check-circle" size={32} color={colors.accent} />
            <Text style={[styles.emptyText, { color: colors.foreground }]}>
              Şu anda doğrulanmış anomali yok.
            </Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              Tüm düğümler normal durumda.
            </Text>
          </View>
        ) : (
          anomalousNodes.map((node) => {
            const score = node.anomalyScore;
            const t = node.telemetry;
            return (
              <View
                key={node.id}
                style={[
                  styles.nodeCard,
                  {
                    backgroundColor: colors.card,
                    borderColor:
                      score && score.total >= 70
                        ? colors.danger + "44"
                        : colors.warning + "44",
                  },
                ]}
              >
                <View style={styles.nodeTop}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View
                      style={[
                        styles.nodeDot,
                        { backgroundColor: node.isConnected ? colors.accent : colors.mutedForeground },
                      ]}
                    />
                    <Text style={[styles.nodeName, { color: colors.foreground }]}>
                      {node.name ?? node.id}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.anomalyBadge,
                      { backgroundColor: colors.danger + "22" },
                    ]}
                  >
                    <Text style={[styles.anomalyBadgeText, { color: colors.danger }]}>
                      {score && score.level}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.nodeId, { color: colors.mutedForeground }]}>
                  {node.id}
                </Text>
                {score && (
                  <Text style={[styles.nodeScore, { color: colors.danger }]}>
                    Skor: {Math.round(score.total)} ({score.vlfScore.toFixed(0)} VLF · {score.schumannScore.toFixed(0)} Schumann)
                  </Text>
                )}
                {t && (
                  <Text style={[styles.nodeDetail, { color: colors.mutedForeground }]}>
                    Son veri: {t.vlf_hz.toFixed(2)} Hz · {t.sch_hz.toFixed(2)} Hz · {t.mot_vel.toFixed(2)} km/s
                  </Text>
                )}
                <Text style={[styles.nodeLastSeen, { color: colors.mutedForeground }]}>
                  Son görülme: {new Date(node.lastSeen).toLocaleTimeString("tr-TR")}
                </Text>
              </View>
            );
          })
        )}

        {/* Tüm Düğümlerin Özeti */}
        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 16 }]}>
          Tüm Düğümler ({meshNodes.length})
        </Text>
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {meshNodes.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Henüz düğüm yok
            </Text>
          ) : (
            meshNodes.map((node) => {
              const score = node.anomalyScore;
              const color =
                score && score.total >= 70
                  ? colors.danger
                  : score && score.total >= 50
                  ? colors.warning
                  : colors.accent;
              return (
                <View key={node.id} style={styles.summaryRow}>
                  <Text style={[styles.summaryName, { color: colors.foreground }]}>
                    {node.name ?? node.id}
                  </Text>
                  <View style={[styles.summaryBar, { backgroundColor: colors.muted }]}>
                    <View
                      style={[
                        styles.summaryFill,
                        {
                          width: `${Math.min(100, score ? score.total : 0)}%`,
                          backgroundColor: color,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.summaryScore, { color }]}>
                    {score ? Math.round(score.total) : 0}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  consensusBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  consensusTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 2 },
  consensusDesc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  consensusTime: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 4 },
  scoreCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    gap: 10,
  },
  scoreTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  scoreCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, alignItems: "center", justifyContent: "center" },
  scoreValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  scoreLevel: { fontSize: 16, fontFamily: "Inter_700Bold" },
  scoreBreakdown: { fontSize: 11, fontFamily: "Inter_400Regular" },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 12 },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  nodeCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 6,
  },
  nodeTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  nodeDot: { width: 8, height: 8, borderRadius: 4 },
  nodeName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  nodeId: { fontSize: 11, fontFamily: "Inter_400Regular" },
  anomalyBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  anomalyBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  nodeScore: { fontSize: 12, fontFamily: "Inter_500Medium" },
  nodeDetail: { fontSize: 11, fontFamily: "Inter_400Regular" },
  nodeLastSeen: { fontSize: 11, fontFamily: "Inter_400Regular" },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  summaryName: { fontSize: 13, fontFamily: "Inter_500Medium", width: 80 },
  summaryBar: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  summaryFill: { height: "100%", borderRadius: 4 },
  summaryScore: { fontSize: 13, fontFamily: "Inter_700Bold", width: 30, textAlign: "right" },
});
