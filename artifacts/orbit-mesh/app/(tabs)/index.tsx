import React, { useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetNetwork, useGetNabizScore, useGetStreak, useGetMissions,
  useUpdatePulse, getGetNetworkQueryKey, getGetNabizScoreQueryKey, getGetStreakQueryKey,
} from "@workspace/api-client-react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { StarBackground } from "@/components/StarBackground";

function TimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Günaydın";
  if (hour < 18) return "İyi günler";
  return "İyi akşamlar";
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: network, isLoading: netLoading, refetch: refetchNet } = useGetNetwork();
  const { data: score, isLoading: scoreLoading, refetch: refetchScore } = useGetNabizScore();
  const { data: streak, refetch: refetchStreak } = useGetStreak();
  const { data: missions } = useGetMissions();

  const { mutate: updatePulse } = useUpdatePulse();

  useEffect(() => {
    if (user?.city) {
      updatePulse({ data: { city: user.city } });
    }
  }, []);

  const myStatus = network?.myStatus;
  const statusColor = myStatus === "ok" ? "#00ff88" : myStatus === "alert" ? "#ff3b5c" : "#ff9500";
  const statusLabel = myStatus === "ok" ? "İyiyim" : myStatus === "alert" ? "Yardım" : "Yanıt Bekleniyor";
  const scoreVal = score?.score ?? 100;
  const scoreColor = scoreVal >= 80 ? "#00ff88" : scoreVal >= 50 ? "#ff9500" : "#ff3b5c";

  const activeMission = (missions ?? []).find(m => !m.isCompleted);

  return (
    <View style={[styles.container, { paddingTop: insets.top + (insets.top === 0 ? 67 : 0) }]}>
      <StarBackground />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => { refetchNet(); refetchScore(); refetchStreak(); }}
            tintColor="#00d4ff"
          />
        }
      >
        <View style={styles.topBar}>
          <View>
            <Text style={styles.greeting}>{TimeGreeting()},</Text>
            <Text style={styles.userName}>{user?.name?.split(" ")[0] ?? "Kullanıcı"}</Text>
          </View>
          <View style={styles.orbitBadge}>
            <View style={styles.orbitRingOuter}>
              <View style={styles.orbitRingInner} />
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.statusCard} onPress={() => router.push("/(tabs)/hayat-agi")} activeOpacity={0.85}>
          <LinearGradient
            colors={myStatus ? [statusColor + "30", statusColor + "10"] : ["#1e2a3d", "#111827"]}
            style={styles.statusGrad}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <View style={styles.statusLeft}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <View>
                <Text style={styles.statusCardTitle}>Bugünkü Durumun</Text>
                <Text style={[styles.statusValue, { color: statusColor }]}>
                  {myStatus ? statusLabel : "Henüz yanıtlamadın"}
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={20} color="#64748b" />
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push("/(tabs)/hayat-agi")} activeOpacity={0.8}>
            <View style={styles.statIcon}>
              <Feather name="users" size={18} color="#00d4ff" />
            </View>
            <Text style={styles.statNum}>{netLoading ? "—" : (network?.totalCount ?? 0)}</Text>
            <Text style={styles.statLabel}>Kişi</Text>
            <View style={styles.miniStatusRow}>
              <View style={[styles.miniDot, { backgroundColor: "#00ff88" }]} />
              <Text style={styles.miniDotNum}>{network?.okCount ?? 0}</Text>
              <View style={[styles.miniDot, { backgroundColor: "#ff9500" }]} />
              <Text style={styles.miniDotNum}>{network?.pendingCount ?? 0}</Text>
              <View style={[styles.miniDot, { backgroundColor: "#ff3b5c" }]} />
              <Text style={styles.miniDotNum}>{network?.alertCount ?? 0}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={() => router.push("/(tabs)/nabiz")} activeOpacity={0.8}>
            <View style={[styles.statIcon, { backgroundColor: scoreColor + "20" }]}>
              <Feather name="activity" size={18} color={scoreColor} />
            </View>
            <Text style={[styles.statNum, { color: scoreColor }]}>{scoreLoading ? "—" : scoreVal}</Text>
            <Text style={styles.statLabel}>Nabız</Text>
            <Text style={styles.statSub}>Ağ skoru</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={() => router.push("/(tabs)/hayat-agi")} activeOpacity={0.8}>
            <View style={[styles.statIcon, { backgroundColor: "#ff9500" + "20" }]}>
              <Feather name="zap" size={18} color="#ff9500" />
            </View>
            <Text style={[styles.statNum, { color: "#ff9500" }]}>{streak?.streak ?? 0}</Text>
            <Text style={styles.statLabel}>Gün Serisi</Text>
            <Text style={styles.statSub}>Güvenli</Text>
          </TouchableOpacity>
        </View>

        {network && network.members.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Ağın</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/hayat-agi")}>
                <Text style={styles.seeAll}>Tümü</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {network.members.slice(0, 6).map(m => {
                  const sc = m.todayStatus === "ok" ? "#00ff88" : m.todayStatus === "alert" ? "#ff3b5c" : "#ff9500";
                  return (
                    <View key={m.id} style={styles.memberChip}>
                      <View style={[styles.memberAvatar, { borderColor: sc }]}>
                        <Text style={styles.memberInitial}>{m.name[0]?.toUpperCase() ?? "?"}</Text>
                        <View style={[styles.statusIndicator, { backgroundColor: sc }]} />
                      </View>
                      <Text style={styles.memberName} numberOfLines={1}>{m.name.split(" ")[0]}</Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {activeMission && (
          <TouchableOpacity style={styles.missionBanner} onPress={() => router.push("/(tabs)/astronomi")} activeOpacity={0.85}>
            <LinearGradient colors={["#ff9500" + "30", "#ff9500" + "10"]} style={styles.missionGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={styles.missionLeft}>
                <View style={styles.missionIcon}>
                  <Feather name="target" size={18} color="#ff9500" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.missionLabel}>Aktif Görev</Text>
                  <Text style={styles.missionTitle} numberOfLines={1}>{activeMission.title}</Text>
                  <Text style={styles.missionPart}>{activeMission.participantCount} katılımcı</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color="#ff9500" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Hızlı Erişim</Text>
          <View style={styles.actionGrid}>
            {[
              { icon: "radio" as const, label: "HayatAğı", route: "/(tabs)/hayat-agi" as const, color: "#00ff88" },
              { icon: "activity" as const, label: "Nabız", route: "/(tabs)/nabiz" as const, color: "#00d4ff" },
              { icon: "star" as const, label: "Astronomi", route: "/(tabs)/astronomi" as const, color: "#ff9500" },
              { icon: "zap" as const, label: "Manyetometre", route: "/magnetometer" as const, color: "#a855f7" },
            ].map((item) => (
              <TouchableOpacity
                key={item.route}
                style={styles.actionBtn}
                onPress={() => router.push(item.route as "/magnetometer")}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIcon, { backgroundColor: item.color + "20" }]}>
                  <Feather name={item.icon} size={22} color={item.color} />
                </View>
                <Text style={styles.actionLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 100 + insets.bottom + (insets.bottom === 0 ? 34 : 0) }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0e1a" },
  scroll: { padding: 16 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  greeting: { fontSize: 14, color: "#64748b", fontFamily: "Inter_400Regular" },
  userName: { fontSize: 24, fontWeight: "800", color: "#ffffff", fontFamily: "Inter_700Bold" },
  orbitBadge: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: "#00d4ff" + "60", alignItems: "center", justifyContent: "center" },
  orbitRingOuter: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: "#00d4ff", alignItems: "center", justifyContent: "center" },
  orbitRingInner: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: "#ff9500", borderStyle: "dashed" },
  statusCard: { marginBottom: 16, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "#1e2a3d" },
  statusGrad: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  statusLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusCardTitle: { fontSize: 12, color: "#94a3b8", fontFamily: "Inter_400Regular" },
  statusValue: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold", marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: "#111827", borderRadius: 14, padding: 14,
    alignItems: "center", gap: 4, borderWidth: 1, borderColor: "#1e2a3d",
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#00d4ff" + "20", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  statNum: { fontSize: 22, fontWeight: "900", color: "#ffffff", fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, color: "#94a3b8", fontFamily: "Inter_400Regular" },
  statSub: { fontSize: 11, color: "#374151", fontFamily: "Inter_400Regular" },
  miniStatusRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  miniDot: { width: 6, height: 6, borderRadius: 3 },
  miniDotNum: { fontSize: 10, color: "#64748b", fontFamily: "Inter_400Regular" },
  section: { marginBottom: 20 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#ffffff", fontFamily: "Inter_700Bold" },
  seeAll: { color: "#00d4ff", fontSize: 13, fontFamily: "Inter_500Medium" },
  memberChip: { alignItems: "center", gap: 6 },
  memberAvatar: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: "#1e2a3d",
    alignItems: "center", justifyContent: "center", borderWidth: 2,
  },
  memberInitial: { color: "#ffffff", fontWeight: "700", fontSize: 18, fontFamily: "Inter_700Bold" },
  statusIndicator: { position: "absolute", bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: "#0a0e1a" },
  memberName: { color: "#94a3b8", fontSize: 11, fontFamily: "Inter_400Regular", maxWidth: 52, textAlign: "center" },
  missionBanner: { marginBottom: 20, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "#ff9500" + "40" },
  missionGrad: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  missionLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  missionIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#ff9500" + "20", alignItems: "center", justifyContent: "center" },
  missionLabel: { fontSize: 11, color: "#ff9500", fontFamily: "Inter_500Medium" },
  missionTitle: { fontSize: 14, fontWeight: "700", color: "#ffffff", fontFamily: "Inter_700Bold" },
  missionPart: { fontSize: 11, color: "#64748b", fontFamily: "Inter_400Regular" },
  quickActions: { marginBottom: 20 },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  actionBtn: {
    width: "47%", backgroundColor: "#111827", borderRadius: 14, padding: 16,
    alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#1e2a3d",
  },
  actionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  actionLabel: { color: "#e2e8f0", fontFamily: "Inter_600SemiBold", fontSize: 13 },
});
