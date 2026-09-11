import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { User } from "@/context/AuthContext";

export default function LiderlikScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const data = await AsyncStorage.getItem("@orbit-mesh/users");
      if (data) {
        const all = JSON.parse(data) as Array<User & { password: string }>;
        const sorted = all.map(({ password: _, ...u }) => u).sort((a, b) => b.quizScore - a.quizScore);
        setUsers(sorted);
      }
    } catch {}
  }

  const myRank = users.findIndex(u => u.id === user?.id) + 1;
  const podium = users.slice(0, 3);
  const rest = users.slice(3);

  const medalColors = ["#FFD700", "#C0C0C0", "#CD7F32"];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Liderlik Tablosu</Text>
        <Pressable onPress={loadUsers} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Feather name="refresh-cw" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* My Rank Banner */}
        {user && myRank > 0 && (
          <View style={[styles.myRankCard, { backgroundColor: colors.card, borderColor: colors.warning + "66" }]}>
            <LinearGradient colors={[colors.warning + "22", "transparent"]} style={StyleSheet.absoluteFill} />
            <Text style={[styles.myRankLabel, { color: colors.mutedForeground }]}>Benim Sıralamaım</Text>
            <Text style={[styles.myRankNum, { color: colors.warning }]}>#{myRank}</Text>
            <Text style={[styles.myRankScore, { color: colors.foreground }]}>{user.quizScore} puan</Text>
          </View>
        )}

        {users.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="users" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Henüz Sıralama Yok</Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              Quiz tamamlandıkça kullanıcılar burada görünecek
            </Text>
          </View>
        ) : (
          <>
            {/* Podium */}
            {podium.length > 0 && (
              <View style={styles.podiumSection}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Podiyum</Text>
                <View style={styles.podium}>
                  {podium.map((u, i) => (
                    <View key={u.id} style={styles.podiumItem}>
                      <Text style={[styles.podiumMedal, { color: medalColors[i] }]}>
                        {i === 0 ? "1" : i === 1 ? "2" : "3"}
                      </Text>
                      <View style={[styles.podiumAvatar, { backgroundColor: medalColors[i] + "33", borderColor: medalColors[i] }]}>
                        <Text style={[styles.podiumInitials, { color: medalColors[i] }]}>
                          {u.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                        </Text>
                      </View>
                      <Text style={[styles.podiumName, { color: colors.foreground }]} numberOfLines={1}>{u.name.split(" ")[0]}</Text>
                      <Text style={[styles.podiumScore, { color: colors.mutedForeground }]}>{u.quizScore}p</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Rest */}
            <Text style={[styles.sectionTitle, { color: colors.foreground, paddingHorizontal: 20, marginBottom: 12 }]}>Tüm Sıralama</Text>
            {users.map((u, i) => (
              <View
                key={u.id}
                style={[
                  styles.rankRow,
                  { backgroundColor: u.id === user?.id ? colors.primary + "22" : colors.card, borderColor: u.id === user?.id ? colors.primary + "66" : colors.border },
                ]}
              >
                <Text style={[styles.rankNum, { color: i < 3 ? medalColors[i] : colors.mutedForeground }]}>#{i + 1}</Text>
                <View style={[styles.rankAvatar, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.rankInitials, { color: colors.foreground }]}>
                    {u.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rankName, { color: colors.foreground }]}>{u.name}</Text>
                  <Text style={[styles.rankAttempts, { color: colors.mutedForeground }]}>{u.quizAttempts} deneme</Text>
                </View>
                <Text style={[styles.rankScore, { color: colors.warning }]}>{u.quizScore}p</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  myRankCard: { margin: 20, borderRadius: 16, borderWidth: 1, padding: 16, overflow: "hidden", flexDirection: "row", alignItems: "center", gap: 16 },
  myRankLabel: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  myRankNum: { fontSize: 28, fontFamily: "Inter_700Bold" },
  myRankScore: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyCard: { margin: 20, borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  podiumSection: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 16 },
  podium: { flexDirection: "row", justifyContent: "center", gap: 16 },
  podiumItem: { alignItems: "center", gap: 6, width: 80 },
  podiumMedal: { fontSize: 20, fontFamily: "Inter_700Bold" },
  podiumAvatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  podiumInitials: { fontSize: 18, fontFamily: "Inter_700Bold" },
  podiumName: { fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  podiumScore: { fontSize: 11, fontFamily: "Inter_400Regular" },
  rankRow: { flexDirection: "row", alignItems: "center", marginHorizontal: 20, borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 8, gap: 12 },
  rankNum: { width: 32, fontSize: 14, fontFamily: "Inter_700Bold", textAlign: "center" },
  rankAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  rankInitials: { fontSize: 14, fontFamily: "Inter_700Bold" },
  rankName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  rankAttempts: { fontSize: 11, fontFamily: "Inter_400Regular" },
  rankScore: { fontSize: 16, fontFamily: "Inter_700Bold" },
});
