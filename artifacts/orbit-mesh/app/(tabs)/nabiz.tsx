import React, { useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useGetNabizScore, useGetGlobalNabiz, useUpdatePulse, getGetNabizScoreQueryKey, getGetGlobalNabizQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";

function PulseRing({ score }: { score: number }) {
  const color = score >= 80 ? "#00ff88" : score >= 50 ? "#ff9500" : "#ff3b5c";
  const circumference = 2 * Math.PI * 50;
  const filled = (score / 100) * circumference;

  return (
    <View style={styles.pulseContainer}>
      <View style={[styles.pulseBg, { borderColor: color + "30" }]}>
        <View style={[styles.pulseInner, { borderColor: color }]}>
          <Text style={[styles.scoreNum, { color }]}>{score}</Text>
          <Text style={styles.scoreLabel}>Nabız Skoru</Text>
        </View>
      </View>
    </View>
  );
}

export default function NabizScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data: score, isLoading: scoreLoading, refetch: refetchScore } = useGetNabizScore();
  const { data: global, isLoading: globalLoading, refetch: refetchGlobal } = useGetGlobalNabiz();

  const { mutate: updatePulse } = useUpdatePulse({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetNabizScoreQueryKey() });
        qc.invalidateQueries({ queryKey: getGetGlobalNabizQueryKey() });
      },
    },
  });

  useEffect(() => {
    if (user?.city) {
      updatePulse({ data: { city: user.city } });
    }
  }, []);

  const currentScore = score?.score ?? 100;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => { refetchScore(); refetchGlobal(); }} tintColor="#00d4ff" />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Nabız</Text>
          <Text style={styles.subtitle}>Ağ Canlılık Skoru</Text>
        </View>

        {scoreLoading ? (
          <ActivityIndicator color="#00d4ff" size="large" style={{ marginTop: 60 }} />
        ) : (
          <>
            <PulseRing score={currentScore} />

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Feather name="users" size={20} color="#00d4ff" />
                <Text style={styles.statNum}>{score?.networkSize ?? 0}</Text>
                <Text style={styles.statLabel}>Ağ Boyutu</Text>
              </View>
              <View style={styles.statCard}>
                <Feather name="activity" size={20} color="#00ff88" />
                <Text style={styles.statNum}>{score?.activeContacts ?? 0}</Text>
                <Text style={styles.statLabel}>Aktif</Text>
              </View>
              <View style={styles.statCard}>
                <Feather name="wifi-off" size={20} color="#ff3b5c" />
                <Text style={styles.statNum}>{(score?.silentContacts ?? []).length}</Text>
                <Text style={styles.statLabel}>Sessiz</Text>
              </View>
            </View>

            {(score?.silentContacts ?? []).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sessiz Kalan Kişiler</Text>
                {score!.silentContacts.map((c, i) => (
                  <View key={i} style={styles.alertCard}>
                    <View style={styles.alertIcon}>
                      <Feather name="user-x" size={18} color="#ff3b5c" />
                    </View>
                    <View style={styles.alertInfo}>
                      <Text style={styles.alertName}>{c.name}</Text>
                      <Text style={styles.alertDays}>
                        {c.daysSilent === 999 ? "Hiç aktif olmadı" : `${c.daysSilent} gündür sessiz`}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.notifyBtn}>
                      <Text style={styles.notifyBtnText}>Hatırlat</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Dünya Nabzı</Text>
              {globalLoading ? (
                <ActivityIndicator color="#00d4ff" />
              ) : (
                <>
                  <View style={styles.globalCard}>
                    <View style={styles.globalTop}>
                      <Feather name="globe" size={24} color="#00d4ff" />
                      <View>
                        <Text style={styles.globalNum}>{global?.totalActiveUsers ?? 0}</Text>
                        <Text style={styles.globalLabel}>Aktif Kullanıcı (24 saat)</Text>
                      </View>
                      <View style={[styles.globalScore, { backgroundColor: "#00d4ff" + "20" }]}>
                        <Text style={styles.globalScoreNum}>{global?.globalScore ?? 0}</Text>
                        <Text style={styles.globalScoreLabel}>Skor</Text>
                      </View>
                    </View>
                  </View>

                  {(global?.regions ?? []).length > 0 && (
                    <View style={styles.regionsCard}>
                      <Text style={styles.regionsTitle}>En Aktif Şehirler</Text>
                      {(global?.regions ?? []).slice(0, 5).map((region, i) => (
                        <View key={i} style={styles.regionRow}>
                          <Text style={styles.regionRank}>#{i + 1}</Text>
                          <View style={styles.regionInfo}>
                            <Text style={styles.regionCity}>{region.city}</Text>
                            <Text style={styles.regionCountry}>{region.country}</Text>
                          </View>
                          <View style={styles.regionPulseBar}>
                            <View style={[styles.regionPulseFill, { width: `${Math.min(100, region.pulseScore)}%` as unknown as number }]} />
                          </View>
                          <Text style={styles.regionScore}>{region.activeUsers}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </View>

            <View style={styles.infoCard}>
              <Feather name="info" size={16} color="#64748b" />
              <Text style={styles.infoText}>
                Nabız skoru, kişilerinin son 48 saat içinde aktif olup olmadığını gösterir. 
                Uygulama her açıldığında otomatik güncellenir.
              </Text>
            </View>
          </>
        )}
        <View style={{ height: 100 + insets.bottom }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0e1a" },
  scroll: { padding: 16 },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: "800", color: "#ffffff", fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 14, color: "#64748b", marginTop: 4, fontFamily: "Inter_400Regular" },
  pulseContainer: { alignItems: "center", marginBottom: 32 },
  pulseBg: {
    width: 160, height: 160, borderRadius: 80,
    borderWidth: 12, alignItems: "center", justifyContent: "center",
  },
  pulseInner: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 3, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center", gap: 4,
  },
  scoreNum: { fontSize: 40, fontWeight: "900", fontFamily: "Inter_700Bold" },
  scoreLabel: { fontSize: 12, color: "#64748b", fontFamily: "Inter_400Regular" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: "#111827", borderRadius: 14, padding: 14,
    alignItems: "center", gap: 6, borderWidth: 1, borderColor: "#1e2a3d",
  },
  statNum: { fontSize: 22, fontWeight: "800", color: "#ffffff", fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, color: "#64748b", fontFamily: "Inter_400Regular" },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#ffffff", marginBottom: 12, fontFamily: "Inter_700Bold" },
  alertCard: {
    backgroundColor: "#111827", borderRadius: 14, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8,
    borderWidth: 1, borderColor: "#ff3b5c" + "40",
  },
  alertIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#ff3b5c" + "20", alignItems: "center", justifyContent: "center" },
  alertInfo: { flex: 1 },
  alertName: { color: "#ffffff", fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  alertDays: { color: "#ff3b5c", fontSize: 13, fontFamily: "Inter_400Regular" },
  notifyBtn: { backgroundColor: "#1e2a3d", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  notifyBtnText: { color: "#94a3b8", fontSize: 12, fontFamily: "Inter_500Medium" },
  globalCard: {
    backgroundColor: "#111827", borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: "#00d4ff" + "30", marginBottom: 12,
  },
  globalTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  globalNum: { fontSize: 24, fontWeight: "800", color: "#00d4ff", fontFamily: "Inter_700Bold" },
  globalLabel: { fontSize: 12, color: "#64748b", fontFamily: "Inter_400Regular" },
  globalScore: { marginLeft: "auto", alignItems: "center", padding: 10, borderRadius: 10 },
  globalScoreNum: { fontSize: 20, fontWeight: "800", color: "#00d4ff", fontFamily: "Inter_700Bold" },
  globalScoreLabel: { fontSize: 10, color: "#64748b", fontFamily: "Inter_400Regular" },
  regionsCard: { backgroundColor: "#111827", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#1e2a3d" },
  regionsTitle: { color: "#94a3b8", fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 12 },
  regionRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  regionRank: { color: "#64748b", fontSize: 13, fontFamily: "Inter_500Medium", width: 24 },
  regionInfo: { width: 80 },
  regionCity: { color: "#ffffff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  regionCountry: { color: "#64748b", fontSize: 11, fontFamily: "Inter_400Regular" },
  regionPulseBar: { flex: 1, height: 4, backgroundColor: "#1e2a3d", borderRadius: 2, overflow: "hidden" },
  regionPulseFill: { height: 4, backgroundColor: "#00d4ff", borderRadius: 2 },
  regionScore: { color: "#00d4ff", fontSize: 13, fontFamily: "Inter_600SemiBold", width: 30, textAlign: "right" },
  infoCard: {
    backgroundColor: "#111827", borderRadius: 12, padding: 14,
    flexDirection: "row", gap: 10, borderWidth: 1, borderColor: "#1e2a3d",
  },
  infoText: { flex: 1, color: "#64748b", fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
});
