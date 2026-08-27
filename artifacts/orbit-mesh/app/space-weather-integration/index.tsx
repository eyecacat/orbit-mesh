// app/space-weather-integration/index.tsx
// ORBIT-MESH PRO V2.1 — Açık Kaynak Veri ile Mesh Entegrasyonu

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { BACKEND_URL } from "@/lib/env";

interface SolarFlare {
  flrID: string;
  beginTime: string;
  classType: string;
  sourceLocation?: string;
}

interface CME {
  activityID: string;
  startTime: string;
  note?: string;
}

interface GST {
  gstID: string;
  startTime: string;
  allKpIndex?: Array<{ observedTime: string; kpIndex: number }>;
}

export default function SpaceWeatherIntegrationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { meshNodes, consensus, connectedDevices } = useBle();

  const [flares, setFlares] = useState<SolarFlare[]>([]);
  const [cmes, setCmes] = useState<CME[]>([]);
  const [gsts, setGsts] = useState<GST[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    void fetchSpaceWeather();
  }, []);

  async function fetchSpaceWeather() {
    try {
      setLoading(true);
      const end = new Date().toISOString().split("T")[0];
      const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const [flaresRes, cmesRes, gstsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/nasa?type=FLR&start=${start}&end=${end}`),
        fetch(`${BACKEND_URL}/api/nasa?type=CME&start=${start}&end=${end}`),
        fetch(`${BACKEND_URL}/api/nasa?type=GST&start=${start}&end=${end}`),
      ]);

      if (flaresRes.ok) setFlares(await flaresRes.json());
      if (cmesRes.ok) setCmes(await cmesRes.json());
      if (gstsRes.ok) setGsts(await gstsRes.json());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  // Mesh anomali sayısı (son 10 dakika içindeki yüksek anomali)
  const recentAnomalies = meshNodes.filter(
    (node) =>
      node.anomalyScore &&
      node.anomalyScore.total >= 50 &&
      Date.now() - node.lastSeen < 10 * 60 * 1000
  );

  // Uzay havası olayı ile anomali ilişkisini kontrol et
  const hasCorrelation = flares.length > 0 && recentAnomalies.length > 0;

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
          Uzay Havası & Mesh
        </Text>
        <Pressable onPress={fetchSpaceWeather}>
          <Feather name="refresh-cw" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Durum Özeti */}
        <View
          style={[
            styles.statusCard,
            {
              backgroundColor: colors.card,
              borderColor: hasCorrelation ? colors.warning + "44" : colors.border,
            },
          ]}
        >
          <View style={styles.statusHeader}>
            <Feather name="radio" size={18} color={colors.primary} />
            <Text style={[styles.statusTitle, { color: colors.foreground }]}>
              Mesh – Uzay Havası İlişkisi
            </Text>
          </View>
          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <Text style={[styles.statusValue, { color: colors.primary }]}>
                {flares.length + cmes.length + gsts.length}
              </Text>
              <Text style={[styles.statusLabel, { color: colors.mutedForeground }]}>
                NASA Olayı
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={[styles.statusValue, { color: recentAnomalies.length > 0 ? colors.danger : colors.accent }]}>
                {recentAnomalies.length}
              </Text>
              <Text style={[styles.statusLabel, { color: colors.mutedForeground }]}>
                Mesh Anomalisi
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={[styles.statusValue, { color: hasCorrelation ? colors.warning : colors.accent }]}>
                {hasCorrelation ? "Korelasyon Var" : "Normal"}
              </Text>
              <Text style={[styles.statusLabel, { color: colors.mutedForeground }]}>
                Durum
              </Text>
            </View>
          </View>
          {hasCorrelation && (
            <View
              style={[
                styles.correlationAlert,
                { backgroundColor: colors.warning + "22", borderColor: colors.warning + "44" },
              ]}
            >
              <Feather name="alert-triangle" size={14} color={colors.warning} />
              <Text style={[styles.correlationText, { color: colors.warning }]}>
                Uzay havası olayları ile mesh anomalileri örtüşüyor. Olaylar iyonosferi etkiliyor olabilir.
              </Text>
            </View>
          )}
        </View>

        {/* Uzay Havası Olayları */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          NASA Olayları (Son 7 Gün)
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
        ) : error ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="wifi-off" size={24} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              NASA verisi alınamadı
            </Text>
          </View>
        ) : (
          <>
            {flares.slice(0, 5).map((f) => (
              <View
                key={f.flrID}
                style={[
                  styles.eventCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.eventRow}>
                  <View
                    style={[
                      styles.eventBadge,
                      { backgroundColor: colors.solar + "33" },
                    ]}
                  >
                    <Text style={[styles.eventBadgeText, { color: colors.solar }]}>
                      FLR {f.classType}
                    </Text>
                  </View>
                  <Text style={[styles.eventTime, { color: colors.mutedForeground }]}>
                    {new Date(f.beginTime).toLocaleString("tr-TR")}
                  </Text>
                </View>
                {f.sourceLocation && (
                  <Text style={[styles.eventDetail, { color: colors.primary }]}>
                    {f.sourceLocation}
                  </Text>
                )}
              </View>
            ))}
            {cmes.slice(0, 3).map((c) => (
              <View
                key={c.activityID}
                style={[
                  styles.eventCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.eventRow}>
                  <View
                    style={[
                      styles.eventBadge,
                      { backgroundColor: colors.secondary + "33" },
                    ]}
                  >
                    <Text style={[styles.eventBadgeText, { color: colors.secondary }]}>
                      CME
                    </Text>
                  </View>
                  <Text style={[styles.eventTime, { color: colors.mutedForeground }]}>
                    {new Date(c.startTime).toLocaleString("tr-TR")}
                  </Text>
                </View>
                {c.note && (
                  <Text style={[styles.eventDetail, { color: colors.mutedForeground }]}>
                    {c.note}
                  </Text>
                )}
              </View>
            ))}
            {gsts.slice(0, 2).map((g) => (
              <View
                key={g.gstID}
                style={[
                  styles.eventCard,
                  { backgroundColor: colors.card, borderColor: colors.danger + "44" },
                ]}
              >
                <View style={styles.eventRow}>
                  <View
                    style={[
                      styles.eventBadge,
                      { backgroundColor: colors.danger + "33" },
                    ]}
                  >
                    <Text style={[styles.eventBadgeText, { color: colors.danger }]}>
                      GST
                    </Text>
                  </View>
                  <Text style={[styles.eventTime, { color: colors.mutedForeground }]}>
                    {new Date(g.startTime).toLocaleString("tr-TR")}
                  </Text>
                </View>
                {g.allKpIndex && g.allKpIndex.length > 0 && (
                  <Text style={[styles.eventDetail, { color: colors.warning }]}>
                    Maks Kp: {Math.max(...g.allKpIndex.map((k) => k.kpIndex))}
                  </Text>
                )}
              </View>
            ))}
            {flares.length === 0 && cmes.length === 0 && gsts.length === 0 && (
              <Text style={[styles.quietText, { color: colors.accent }]}>
                Son 7 günde uzay havası olayı yok.
              </Text>
            )}
          </>
        )}

        {/* Mesh Anomalileri */}
        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 16 }]}>
          Mesh Anomalileri ({recentAnomalies.length})
        </Text>
        {recentAnomalies.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="check-circle" size={24} color={colors.accent} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Son 10 dakikada anomali yok
            </Text>
          </View>
        ) : (
          recentAnomalies.map((node) => {
            const score = node.anomalyScore;
            return (
              <View
                key={node.id}
                style={[
                  styles.anomalyCard,
                  {
                    backgroundColor: colors.card,
                    borderColor:
                      score && score.total >= 70
                        ? colors.danger + "44"
                        : colors.warning + "44",
                  },
                ]}
              >
                <View style={styles.anomalyRow}>
                  <View
                    style={[
                      styles.anomalyDot,
                      {
                        backgroundColor:
                          score && score.total >= 70
                            ? colors.danger
                            : colors.warning,
                      },
                    ]}
                  />
                  <Text style={[styles.anomalyName, { color: colors.foreground }]}>
                    {node.name || node.id}
                  </Text>
                  <Text style={[styles.anomalyScore, { color: colors.danger }]}>
                    {score ? Math.round(score.total) : 0}
                  </Text>
                </View>
                <Text style={[styles.anomalyTime, { color: colors.mutedForeground }]}>
                  {new Date(node.lastSeen).toLocaleTimeString("tr-TR")}
                </Text>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statusCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  statusHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  statusGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statusItem: { alignItems: "center" },
  statusValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statusLabel: { fontSize: 10, fontFamily: "Inter_500Medium", marginTop: 2 },
  correlationAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  correlationText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 12 },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  eventCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 6,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eventBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  eventBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  eventTime: { fontSize: 12, fontFamily: "Inter_400Regular" },
  eventDetail: { fontSize: 12, fontFamily: "Inter_500Medium" },
  quietText: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center", paddingVertical: 8 },
  anomalyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 4,
  },
  anomalyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  anomalyDot: { width: 10, height: 10, borderRadius: 5 },
  anomalyName: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  anomalyScore: { fontSize: 16, fontFamily: "Inter_700Bold" },
  anomalyTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
