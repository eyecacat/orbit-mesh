import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const MENU_ITEMS = [
  { id: "ayarlar", title: "Uygulama Ayarları", icon: "settings", route: "/ayarlar", color: "#38C8FF" },
  { id: "ble", title: "Cihaz Yönetimi", icon: "bluetooth", route: "/ble", color: "#8B5CF6" },
  { id: "aile", title: "Aile Üyeleri", icon: "users", route: "/aile", color: "#00E5B0" },
  { id: "acil", title: "Acil Durum Kişisi", icon: "alert-circle", route: "/acil", color: "#FF4560" },
  { id: "liderlik", title: "Liderlik Tablosu", icon: "trending-up", route: "/liderlik", color: "#FFB800" },
];

export default function ProfilScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  function handleLogout() {
    Alert.alert("Çıkış", "Oturumu kapatmak istediğinize emin misiniz?", [
      { text: "İptal", style: "cancel" },
      { text: "Çıkış Yap", style: "destructive", onPress: logout },
    ]);
  }

  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <LinearGradient colors={[colors.primary + "33", colors.secondary + "33"]} style={styles.avatarBg}>
            <Text style={[styles.initials, { color: colors.primary }]}>{initials}</Text>
          </LinearGradient>
          <Text style={[styles.userName, { color: colors.foreground }]}>{user?.name ?? "Kullanıcı"}</Text>
          <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>{user?.email}</Text>
          <Text style={[styles.joinDate, { color: colors.mutedForeground }]}>
            Katılım: {user?.joinedAt ? new Date(user.joinedAt).toLocaleDateString("tr-TR", { year: "numeric", month: "long" }) : ""}
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{user?.quizScore ?? 0}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Quiz Puanı</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: colors.warning }]}>#{user?.rank ?? 1}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Sıralama</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: colors.accent }]}>{user?.quizAttempts ?? 0}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Deneme</Text>
          </View>
        </View>

        {/* Menu */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Hızlı Erişim</Text>
        <View style={styles.menuList}>
          {MENU_ITEMS.map(item => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [styles.menuRow, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.color + "22" }]}>
                <Feather name={item.icon as any} size={20} color={item.color} />
              </View>
              <Text style={[styles.menuTitle, { color: colors.foreground }]}>{item.title}</Text>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </View>

        {/* Logout */}
        <Pressable
          style={({ pressed }) => [styles.logoutBtn, { backgroundColor: colors.card, borderColor: colors.danger + "66", opacity: pressed ? 0.7 : 1 }]}
          onPress={handleLogout}
        >
          <Feather name="log-out" size={18} color={colors.danger} />
          <Text style={[styles.logoutText, { color: colors.danger }]}>Oturumu Kapat</Text>
        </Pressable>

        <Text style={[styles.version, { color: colors.mutedForeground }]}>ORBIT-MESH v1.0.0 · TEKNOFEST 2025</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  profileHeader: { alignItems: "center", paddingHorizontal: 20, marginBottom: 24, gap: 6 },
  avatarBg: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  initials: { fontSize: 32, fontFamily: "Inter_700Bold" },
  userName: { fontSize: 22, fontFamily: "Inter_700Bold" },
  userEmail: { fontSize: 14, fontFamily: "Inter_400Regular" },
  joinDate: { fontSize: 12, fontFamily: "Inter_400Regular" },
  statsGrid: { flexDirection: "row", paddingHorizontal: 20, gap: 12, marginBottom: 28 },
  statBox: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: "center", gap: 4 },
  statNumber: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", paddingHorizontal: 20, marginBottom: 12 },
  menuList: { paddingHorizontal: 20, gap: 10, marginBottom: 24 },
  menuRow: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, padding: 14 },
  menuIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 14 },
  menuTitle: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  logoutBtn: { flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 20, borderRadius: 14, borderWidth: 1, padding: 16, justifyContent: "center", marginBottom: 20 },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  version: { textAlign: "center", fontSize: 12, fontFamily: "Inter_400Regular", paddingBottom: 8 },
});
