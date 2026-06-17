import { NASA_API_KEY } from "@/lib/env";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface Notification {
  messageType: string;
  messageIssueTime: string;
  messageBody: string;
}

const MODULES = [
  { id: "helio", title: "HELIO Gözlemevi", desc: "VLF sinyal analizi ve güneş olayları", icon: "sun", color: "#FFA500", route: "/helio" },
  { id: "auet", title: "AUET", desc: "Akustik yeraltı olay takibi", icon: "activity", color: "#00E5B0", route: "/auet" },
  { id: "earthsign", title: "EarthSign", desc: "Medya ve olay kayıt sistemi", icon: "shield", color: "#8B5CF6", route: "/earthsign" },
  { id: "ble", title: "BLE Ağı", desc: "Deneyap Kart düğüm yönetimi", icon: "bluetooth", color: "#38C8FF", route: "/ble" },
  { id: "quiz", title: "Astronomi Quiz", desc: "50 soruluk rekabetçi test", icon: "book-open", color: "#FFB800", route: "/quiz" },
  { id: "oyun", title: "Uzay Oyunu", desc: "Yıldız avı mini-oyunu", icon: "star", color: "#FF6B6B", route: "/oyun" },
  { id: "liderlik", title: "Liderlik Tablosu", desc: "Global sıralamalar", icon: "trending-up", color: "#00E5B0", route: "/liderlik" },
];

export default function KesfetScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(true);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    try {
      const start = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const end = new Date().toISOString().split("T")[0];
      const res = await fetch(`https://api.nasa.gov/DONKI/notifications?startDate=${start}&endDate=${end}&type=all&api_key=${NASA_API_KEY}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.slice(0, 5));
      }
    } catch {
    } finally {
      setLoadingNotifs(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.foreground }]}>Keşfet</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>ORBIT-MESH Modülleri</Text>

        {/* NASA Notifications */}
        <View style={[styles.spaceNewsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.spaceNewsHeader}>
            <Feather name="radio" size={16} color={colors.primary} />
            <Text style={[styles.spaceNewsTitle, { color: colors.primary }]}>NASA Uzay Haberleri</Text>
          </View>
          {loadingNotifs ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
          ) : notifications.length === 0 ? (
            <Text style={[styles.noData, { color: colors.mutedForeground }]}>Güncel bildirim yok</Text>
          ) : (
            notifications.map((n, i) => (
              <View key={i} style={[styles.notifRow, { borderColor: colors.border }]}>
                <View style={[styles.notifBadge, { backgroundColor: colors.primary + "22" }]}>
                  <Text style={[styles.notifType, { color: colors.primary }]}>{n.messageType.replace("Report", "")}</Text>
                </View>
                <Text style={[styles.notifTime, { color: colors.mutedForeground }]}>
                  {new Date(n.messageIssueTime).toLocaleDateString("tr-TR")}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Featured: HELIO */}
        <Pressable
          style={({ pressed }) => [styles.featuredCard, { opacity: pressed ? 0.85 : 1 }]}
          onPress={() => router.push("/helio")}
        >
          <LinearGradient colors={["#FFA500", "#FF6B00"]} style={styles.featuredGradient}>
            <View style={styles.featuredContent}>
              <Feather name="sun" size={36} color="white" />
              <Text style={styles.featuredTitle}>HELIO Gözlemevi</Text>
              <Text style={styles.featuredDesc}>Gerçek zamanlı VLF sinyal analizi ve güneş olayları takibi</Text>
              <View style={styles.featuredBtn}>
                <Text style={styles.featuredBtnText}>Gözlemleri İncele</Text>
                <Feather name="arrow-right" size={14} color="#FFA500" />
              </View>
            </View>
          </LinearGradient>
        </Pressable>

        {/* Module Grid */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Tüm Modüller</Text>
        {MODULES.filter(m => m.id !== "helio").map(mod => (
          <Pressable
            key={mod.id}
            style={({ pressed }) => [styles.moduleRow, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
            onPress={() => router.push(mod.route as any)}
          >
            <View style={[styles.moduleIcon, { backgroundColor: mod.color + "22" }]}>
              <Feather name={mod.icon as any} size={22} color={mod.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.moduleName, { color: colors.foreground }]}>{mod.title}</Text>
              <Text style={[styles.moduleDesc, { color: colors.mutedForeground }]}>{mod.desc}</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", paddingHorizontal: 20, marginBottom: 4 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", paddingHorizontal: 20, marginBottom: 20 },
  spaceNewsCard: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 20 },
  spaceNewsHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  spaceNewsTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  notifRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6, borderBottomWidth: 1 },
  notifBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  notifType: { fontSize: 11, fontFamily: "Inter_700Bold" },
  notifTime: { fontSize: 12, fontFamily: "Inter_400Regular" },
  noData: { fontSize: 13, textAlign: "center", paddingVertical: 8, fontFamily: "Inter_400Regular" },
  featuredCard: { marginHorizontal: 20, marginBottom: 24, borderRadius: 20, overflow: "hidden" },
  featuredGradient: { padding: 24 },
  featuredContent: { gap: 8 },
  featuredTitle: { color: "white", fontSize: 22, fontFamily: "Inter_700Bold" },
  featuredDesc: { color: "rgba(255,255,255,0.85)", fontSize: 14, fontFamily: "Inter_400Regular" },
  featuredBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "white", alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginTop: 8 },
  featuredBtnText: { color: "#FFA500", fontSize: 13, fontFamily: "Inter_700Bold" },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", paddingHorizontal: 20, marginBottom: 12 },
  moduleRow: { flexDirection: "row", alignItems: "center", marginHorizontal: 20, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  moduleIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 14 },
  moduleName: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  moduleDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
