import { NASA_API_KEY } from "@/lib/env";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useSafety } from "@/context/SafetyContext";
import { useColors } from "@/hooks/useColors";

interface SolarFlare {
  flrID: string;
  beginTime: string;
  classType: string;
  sourceLocation?: string;
  note?: string;
}

interface CME {
  activityID: string;
  startTime: string;
  note?: string;
}

const MODULE_TILES = [
  { id: "helio", title: "HELIO", subtitle: "VLF Gözlem", icon: "sun", color: "#FFA500", route: "/helio" },
  { id: "ble", title: "BLE Ağı", subtitle: "Deneyap Kart", icon: "bluetooth", color: "#38C8FF", route: "/ble" },
  { id: "earthsign", title: "EarthSign", subtitle: "Kayıt Sistemi", icon: "shield", color: "#8B5CF6", route: "/earthsign" },
  { id: "auet", title: "AUET", subtitle: "Akustik İzleme", icon: "activity", color: "#00E5B0", route: "/auet" },
  { id: "quiz", title: "Quiz", subtitle: "50 Soru", icon: "book-open", color: "#FFB800", route: "/quiz" },
  { id: "oyun", title: "Uzay Oyunu", subtitle: "Yıldız Avı", icon: "star", color: "#FF6B6B", route: "/oyun" },
];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { myStatus, streak, lastCheckin } = useSafety();
  const [flares, setFlares] = useState<SolarFlare[]>([]);
  const [cmes, setCmes] = useState<CME[]>([]);
  const [loadingNasa, setLoadingNasa] = useState(true);
  const [nasaError, setNasaError] = useState(false);

  useEffect(() => {
    fetchNasaData();
  }, []);

  async function fetchNasaData() {
    try {
      setLoadingNasa(true);
      const end = new Date().toISOString().split("T")[0];
      const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const [flaresRes, cmesRes] = await Promise.all([
        fetch(`https://api.nasa.gov/DONKI/FLR?startDate=${start}&endDate=${end}&api_key=${NASA_API_KEY}`),
        fetch(`https://api.nasa.gov/DONKI/CME?startDate=${start}&endDate=${end}&api_key=${NASA_API_KEY}`),
      ]);
      if (flaresRes.ok) setFlares((await flaresRes.json()).slice(0, 3));
      if (cmesRes.ok) setCmes((await cmesRes.json()).slice(0, 2));
      setNasaError(false);
    } catch {
      setNasaError(true);
    } finally {
      setLoadingNasa(false);
    }
  }

  const greetingTime = () => {
    const h = new Date().getHours();
    if (h < 12) return "Günaydın";
    if (h < 18) return "İyi günler";
    return "İyi akşamlar";
  };

  const statusColors = { green: colors.green, yellow: colors.yellow, red: colors.red };
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>{greetingTime()},</Text>
            <Text style={[styles.userName, { color: colors.foreground }]}>{user?.name ?? "Astronot"}</Text>
          </View>
          <View style={[styles.statusDot, { backgroundColor: statusColors[myStatus] }]} />
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="zap" size={16} color={colors.warning} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{streak}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Gün Serisi</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="award" size={16} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>#{user?.rank ?? 1}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Sıralama</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="check-circle" size={16} color={colors.accent} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{user?.quizScore ?? 0}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Quiz Puanı</Text>
          </View>
        </View>

        {/* Solar Weather */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Güneş Hava Durumu</Text>
        <View style={[styles.nasaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.nasaHeader}>
            <Feather name="sun" size={18} color={colors.solar} />
            <Text style={[styles.nasaTitle, { color: colors.solar }]}>NASA DONKI — Son 7 Gün</Text>
          </View>
          {loadingNasa ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
          ) : nasaError ? (
            <Text style={[styles.errorText, { color: colors.mutedForeground }]}>Veri alınamadı — İnternet bağlantısını kontrol edin</Text>
          ) : (
            <>
              <Text style={[styles.nasaSubtitle, { color: colors.mutedForeground }]}>
                {flares.length} Güneş Patlaması · {cmes.length} CME
              </Text>
              {flares.map(f => (
                <View key={f.flrID} style={[styles.flareRow, { borderColor: colors.border }]}>
                  <View style={[styles.flareBadge, { backgroundColor: colors.solar + "33" }]}>
                    <Text style={[styles.flareClass, { color: colors.solar }]}>{f.classType}</Text>
                  </View>
                  <Text style={[styles.flareTime, { color: colors.mutedForeground }]}>
                    {new Date(f.beginTime).toLocaleDateString("tr-TR")}
                  </Text>
                  {f.sourceLocation && (
                    <Text style={[styles.flareLocation, { color: colors.primary }]}>{f.sourceLocation}</Text>
                  )}
                </View>
              ))}
              {flares.length === 0 && cmes.length === 0 && (
                <Text style={[styles.quietText, { color: colors.accent }]}>Güneş sakin — Aktif etkinlik yok</Text>
              )}
            </>
          )}
        </View>

        {/* Modules */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Modüller</Text>
        <View style={styles.grid}>
          {MODULE_TILES.map(tile => (
            <Pressable
              key={tile.id}
              style={({ pressed }) => [styles.tile, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
              onPress={() => router.push(tile.route as any)}
            >
              <LinearGradient
                colors={[tile.color + "33", "transparent"]}
                style={styles.tileGradient}
              />
              <Feather name={tile.icon as any} size={24} color={tile.color} />
              <Text style={[styles.tileTitle, { color: colors.foreground }]}>{tile.title}</Text>
              <Text style={[styles.tileSubtitle, { color: colors.mutedForeground }]}>{tile.subtitle}</Text>
            </Pressable>
          ))}
        </View>

        {/* HayatAğı status */}
        <Pressable
          style={[styles.hayatagiCard, { backgroundColor: colors.card, borderColor: statusColors[myStatus] + "66" }]}
          onPress={() => router.push("/(tabs)/hayatagi")}
        >
          <LinearGradient colors={[statusColors[myStatus] + "22", "transparent"]} style={StyleSheet.absoluteFill} />
          <View style={styles.hayatagiRow}>
            <Feather name="heart" size={20} color={statusColors[myStatus]} />
            <Text style={[styles.hayatagiTitle, { color: colors.foreground }]}>HayatAğı Durumum</Text>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.hayatagiStatus, { color: statusColors[myStatus] }]}>
            {myStatus === "green" ? "İyiyim" : myStatus === "yellow" ? "Dikkat" : "Yardım Lazım"}
          </Text>
          <Text style={[styles.hayatagiCheckin, { color: colors.mutedForeground }]}>
            {lastCheckin ? `Son check-in: ${new Date(lastCheckin).toLocaleDateString("tr-TR")}` : "Henüz check-in yapılmadı"}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 20 },
  greeting: { fontSize: 14, fontFamily: "Inter_400Regular" },
  userName: { fontSize: 24, fontFamily: "Inter_700Bold" },
  statusDot: { width: 14, height: 14, borderRadius: 7 },
  statsRow: { flexDirection: "row", paddingHorizontal: 20, gap: 10, marginBottom: 24 },
  statCard: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: "center", gap: 4 },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", paddingHorizontal: 20, marginBottom: 12 },
  nasaCard: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 24 },
  nasaHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  nasaTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  nasaSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 12 },
  flareRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, borderBottomWidth: 1 },
  flareBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  flareClass: { fontSize: 12, fontFamily: "Inter_700Bold" },
  flareTime: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  flareLocation: { fontSize: 12, fontFamily: "Inter_500Medium" },
  quietText: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center", paddingVertical: 8 },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 20, gap: 12, marginBottom: 24 },
  tile: { width: "47%", borderRadius: 16, borderWidth: 1, padding: 16, overflow: "hidden", gap: 8 },
  tileGradient: { ...StyleSheet.absoluteFillObject, borderRadius: 16 },
  tileTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  tileSubtitle: { fontSize: 11, fontFamily: "Inter_400Regular" },
  hayatagiCard: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, padding: 16, overflow: "hidden" },
  hayatagiRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  hayatagiTitle: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  hayatagiStatus: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 4 },
  hayatagiCheckin: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
