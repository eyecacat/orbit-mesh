import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function QuizIndexScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Astronomi Quiz</Text>
        <Pressable onPress={() => router.push("/liderlik")} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Feather name="trending-up" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <Pressable
          style={({ pressed }) => [styles.heroCard, { opacity: pressed ? 0.9 : 1 }]}
          onPress={() => router.push("/quiz/oyna")}
        >
          <LinearGradient colors={["#FFB800", "#FF8C00"]} style={styles.heroGradient}>
            <Feather name="book-open" size={44} color="white" />
            <Text style={styles.heroTitle}>50 Soruluk Şampiyonluk Testi</Text>
            <Text style={styles.heroDesc}>Astronomi bilgini ölç, global sıralamada yerini al</Text>
            <View style={styles.startBtn}>
              <Text style={styles.startBtnText}>Hemen Başla</Text>
              <Feather name="arrow-right" size={16} color="#FF8C00" />
            </View>
          </LinearGradient>
        </Pressable>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNum, { color: colors.warning }]}>{user?.quizScore ?? 0}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>En İyi Puan</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNum, { color: colors.primary }]}>{user?.quizAttempts ?? 0}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Deneme</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNum, { color: colors.accent }]}>
              {user && user.quizAttempts > 0 ? Math.round((user.quizScore / (user.quizAttempts * 50)) * 100) + "%" : "—"}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Doğruluk</Text>
          </View>
        </View>

        {/* Quiz Info */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quiz Kuralları</Text>
        {[
          { icon: "clock", text: "Her soru için 20 saniye" },
          { icon: "list", text: "50 rastgele seçilmiş soru" },
          { icon: "star", text: "Her doğru cevap 2 puan" },
          { icon: "trending-up", text: "Sonuçlar global sıralamaya yansır" },
          { icon: "shuffle", text: "Her denemede farklı soru sırası" },
        ].map((item, i) => (
          <View key={i} style={[styles.ruleRow, { borderColor: colors.border }]}>
            <Feather name={item.icon as any} size={16} color={colors.primary} />
            <Text style={[styles.ruleText, { color: colors.mutedForeground }]}>{item.text}</Text>
          </View>
        ))}

        <Pressable
          style={({ pressed }) => [styles.bigStartBtn, { backgroundColor: colors.warning, opacity: pressed ? 0.85 : 1 }]}
          onPress={() => router.push("/quiz/oyna")}
        >
          <Text style={[styles.bigStartText, { color: colors.background }]}>Quiz Başlat</Text>
          <Feather name="play" size={20} color={colors.background} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  heroCard: { borderRadius: 20, overflow: "hidden", marginBottom: 24 },
  heroGradient: { padding: 28, gap: 10, alignItems: "center" },
  heroTitle: { color: "white", fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  heroDesc: { color: "rgba(255,255,255,0.85)", fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  startBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "white", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 8 },
  startBtnText: { color: "#FF8C00", fontSize: 14, fontFamily: "Inter_700Bold" },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  statCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center", gap: 4 },
  statNum: { fontSize: 24, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 14 },
  ruleRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  ruleText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  bigStartBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 16, marginTop: 24 },
  bigStartText: { fontSize: 18, fontFamily: "Inter_700Bold" },
});
