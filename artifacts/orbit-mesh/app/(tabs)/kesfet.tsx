import { NASA_API_KEY } from "@/lib/env";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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

import { useColors } from "@/hooks/useColors";

interface Notification {
  messageType: string;
  messageIssueTime: string;
  messageBody: string;
}

const QUICK_LINKS = [
  {
    id: "atlas",
    title: "Gökyüzü Atlası",
    desc: "Gezegenler, yıldızlar, galaksiler",
    icon: "globe",
    color: "#4CC9F0",
    route: "/atlas",
  },
  {
    id: "missions",
    title: "Uzay Görevleri",
    desc: "Apollo, Voyager, Webb, Mars",
    icon: "navigation",
    color: "#F97316",
    route: "/missions",
  },
  {
    id: "helio",
    title: "HELIO",
    desc: "Güneş hava durumu",
    icon: "sun",
    color: "#FFA500",
    route: "/helio",
  },
  {
    id: "orbit-ai",
    title: "ORBIT AI",
    desc: "Astronomi sorularına hızlı yanıt",
    icon: "message-circle",
    color: "#7C3AED",
    route: "/sohbet",
  },
  {
    id: "sky-coach",
    title: "Gökyüzü Koçu",
    desc: "Bu gece neyi gözlemlemelisin",
    icon: "compass",
    color: "#22C55E",
    route: "/gokyuzu-kocu",
  },
  {
    id: "hab-lab",
    title: "Yaşanabilirlik Lab",
    desc: "Gezegen yaşam skoru simülatörü",
    icon: "cpu",
    color: "#0EA5E9",
    route: "/yasanabilirlik-lab",
  },
] as const;

const MODULES = [
  {
    id: "auet",
    title: "AUET",
    desc: "Akustik yeraltı olay takibi",
    icon: "activity",
    color: "#00E5B0",
    route: "/auet",
  },
  {
    id: "earthsign",
    title: "EarthSign",
    desc: "Medya ve olay kayıt sistemi",
    icon: "shield",
    color: "#8B5CF6",
    route: "/earthsign",
  },
  {
    id: "ble",
    title: "BLE Ağı",
    desc: "Deneyap Kart düğüm yönetimi",
    icon: "bluetooth",
    color: "#38C8FF",
    route: "/ble",
  },
  {
    id: "quiz",
    title: "Astronomi Quiz",
    desc: "50 soruluk rekabetçi test",
    icon: "book-open",
    color: "#FFB800",
    route: "/quiz",
  },
  {
    id: "oyun",
    title: "Uzay Oyunu",
    desc: "Yıldız avı mini-oyunu",
    icon: "star",
    color: "#FF6B6B",
    route: "/oyun",
  },
  {
    id: "liderlik",
    title: "Liderlik Tablosu",
    desc: "Global sıralamalar",
    icon: "trending-up",
    color: "#00E5B0",
    route: "/liderlik",
  },
] as const;

function detectNotificationCode(rawType: string) {
  const t = rawType.toUpperCase();

  if (t.includes("RADIATION BELT") || t === "RBE") return "RBE";
  if (t.includes("CORONAL MASS EJECTION") || t === "CME") return "CME";
  if (t.includes("SOLAR FLARE") || t === "FLR") return "FLR";
  if (t.includes("GEOMAGNETIC STORM") || t === "GST") return "GST";
  if (t.includes("PARTICLE") || t === "SEP") return "SEP";
  if (t.includes("MAGNETOPAUSE") || t === "MPC") return "MPC";
  if (t.includes("HIGH SPEED STREAM") || t === "HSS") return "HSS";

  return t.replace(/[^A-Z]/g, "").slice(0, 4) || "NASA";
}

function getNotificationTitle(code: string) {
  switch (code) {
    case "RBE":
      return "Radyasyon Kuşağı Artışı";
    case "CME":
      return "Koronal Kütle Atımı";
    case "FLR":
      return "Güneş Patlaması";
    case "GST":
      return "Jeomanyetik Fırtına";
    case "SEP":
      return "Yüksek Enerjili Parçacık Olayı";
    case "MPC":
      return "Manyetosfer Sınırı Geçişi";
    case "HSS":
      return "Yüksek Hızlı Güneş Rüzgârı";
    default:
      return "Uzay Hava Durumu Bildirimi";
  }
}

function getNotificationSummary(code: string) {
  switch (code) {
    case "RBE":
      return "Dünya'nın radyasyon kuşağında yüksek enerjili elektron akışı arttı. Uydu sistemleri etkilenebilir.";
    case "CME":
      return "Güneş'ten uzaya büyük miktarda plazma püskürdü. Dünya yakınındaki uzay ortamı etkilenebilir.";
    case "FLR":
      return "Güneş yüzeyinde ani enerji boşalması kaydedildi. Radyo ve uydu iletişimini etkileyebilir.";
    case "GST":
      return "Jeomanyetik etkinlik yükseldi. Kutup ışıkları ve manyetik alan etkileri gözlenebilir.";
    case "SEP":
      return "Yüksek enerjili parçacık akışı tespit edildi. Uzay araçları için risk oluşturabilir.";
    case "MPC":
      return "Dünya manyetosferinin sınır bölgesinde geçiş gözlendi.";
    case "HSS":
      return "Koronal delikten gelen hızlı güneş rüzgârı tespit edildi.";
    default:
      return "Yeni bir uzay hava durumu bildirimi yayımlandı.";
  }
}

export default function KesfetScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(true);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    void fetchNotifications();
  }, []);

  async function fetchNotifications() {
    try {
      const start = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const end = new Date().toISOString().split("T")[0];

      const res = await fetch(
        `https://api.nasa.gov/DONKI/notifications?startDate=${start}&endDate=${end}&type=all&api_key=${NASA_API_KEY}`
      );

      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data.slice(0, 5) : []);
      } else {
        setNotifications([]);
      }
    } catch {
      setNotifications([]);
    } finally {
      setLoadingNotifs(false);
    }
  }

  const badge = useMemo(() => {
    const count = notifications.length;
    if (count === 0) return { label: "Sakin", color: "#22C55E" };
    if (count < 3) return { label: "Orta", color: "#F59E0B" };
    return { label: "Aktif", color: "#EF4444" };
  }, [notifications.length]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad + 16,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Keşfet</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          ORBIT-MESH Astronomi Merkezi
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.heroCard,
            { opacity: pressed ? 0.9 : 1 },
          ]}
          onPress={() => router.push("/atlas" as any)}
        >
          <LinearGradient
            colors={["#1D4ED8", "#7C3AED", "#0F172A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroTopRow}>
              <View style={styles.heroBadge}>
                <Feather name="star" size={14} color="white" />
                <Text style={styles.heroBadgeText}>Astronomi Merkezi</Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: "rgba(255,255,255,0.12)" },
                ]}
              >
                <View style={[styles.statusDot, { backgroundColor: badge.color }]} />
                <Text style={styles.statusText}>{badge.label}</Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>Evreni verilerle keşfet.</Text>
            <Text style={styles.heroDesc}>
              Gezegenleri, uzay görevlerini, güneş olaylarını ve öğrenme modüllerini tek yerden aç.
            </Text>

            <View style={styles.heroActions}>
              <View style={styles.heroPill}>
                <Feather name="globe" size={14} color="#4CC9F0" />
                <Text style={styles.heroPillText}>Atlas</Text>
              </View>
              <View style={styles.heroPill}>
                <Feather name="navigation" size={14} color="#F97316" />
                <Text style={styles.heroPillText}>Görevler</Text>
              </View>
              <View style={styles.heroPill}>
                <Feather name="sun" size={14} color="#FFA500" />
                <Text style={styles.heroPillText}>HELIO</Text>
              </View>
              <View style={styles.heroPill}>
                <Feather name="message-circle" size={14} color="#C084FC" />
                <Text style={styles.heroPillText}>ORBIT AI</Text>
              </View>
            </View>
          </LinearGradient>
        </Pressable>

        <View
          style={[
            styles.spaceNewsCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.spaceNewsHeader}>
            <Feather name="radio" size={16} color={colors.primary} />
            <Text style={[styles.spaceNewsTitle, { color: colors.primary }]}>
              Uzay Hava Durumu Özeti
            </Text>
          </View>

          {loadingNotifs ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
          ) : notifications.length === 0 ? (
            <Text style={[styles.noData, { color: colors.mutedForeground }]}>
              Son günlerde yeni uzay hava durumu bildirimi yok
            </Text>
          ) : (
            notifications.map((n, i) => {
              const code = detectNotificationCode(n.messageType);
              const title = getNotificationTitle(code);
              const summary = getNotificationSummary(code);

              return (
                <View
                  key={`${n.messageIssueTime}-${i}`}
                  style={[styles.notifCard, { borderColor: colors.border }]}
                >
                  <View style={styles.notifTopRow}>
                    <View style={[styles.notifBadge, { backgroundColor: colors.primary + "22" }]}>
                      <Text style={[styles.notifType, { color: colors.primary }]}>
                        {code}
                      </Text>
                    </View>
                    <Text style={[styles.notifTime, { color: colors.mutedForeground }]}>
                      {new Date(n.messageIssueTime).toLocaleDateString("tr-TR")}
                    </Text>
                  </View>

                  <Text style={[styles.notifTitle, { color: colors.foreground }]}>
                    {title}
                  </Text>
                  <Text style={[styles.notifBody, { color: colors.mutedForeground }]}>
                    {summary}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Astronomi Kısa Yolları
        </Text>
        <View style={styles.quickGrid}>
          {QUICK_LINKS.map(item => (
            <Pressable
              key={item.id}
              onPress={() => router.push(item.route as any)}
              style={({ pressed }) => [
                styles.quickCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.78 : 1,
                },
              ]}
            >
              <View style={[styles.quickIcon, { backgroundColor: item.color + "18" }]}>
                <Feather name={item.icon as any} size={22} color={item.color} />
              </View>
              <Text style={[styles.quickTitle, { color: colors.foreground }]}>
                {item.title}
              </Text>
              <Text style={[styles.quickDesc, { color: colors.mutedForeground }]}>
                {item.desc}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Tüm Modüller
        </Text>
        {MODULES.map(mod => (
          <Pressable
            key={mod.id}
            style={({ pressed }) => [
              styles.moduleRow,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed ? 0.72 : 1,
              },
            ]}
            onPress={() => router.push(mod.route as any)}
          >
            <View style={[styles.moduleIcon, { backgroundColor: mod.color + "22" }]}>
              <Feather name={mod.icon as any} size={22} color={mod.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.moduleName, { color: colors.foreground }]}>
                {mod.title}
              </Text>
              <Text style={[styles.moduleDesc, { color: colors.mutedForeground }]}>
                {mod.desc}
              </Text>
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
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  heroCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 24,
    overflow: "hidden",
  },
  heroGradient: {
    padding: 20,
    minHeight: 190,
    justifyContent: "space-between",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  heroBadgeText: {
    color: "white",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: "white",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  heroTitle: {
    color: "white",
    fontSize: 22,
    lineHeight: 28,
    fontFamily: "Inter_700Bold",
    marginTop: 12,
  },
  heroDesc: {
    color: "rgba(255,255,255,0.84)",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    marginTop: 8,
  },
  heroActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  heroPillText: {
    color: "white",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  spaceNewsCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  spaceNewsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  spaceNewsTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  notifCard: {
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  notifTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  notifBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  notifType: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  notifTime: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  notifTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    lineHeight: 20,
  },
  notifBody: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Inter_400Regular",
  },
  noData: {
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 8,
    fontFamily: "Inter_400Regular",
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  quickCard: {
    width: "48%",
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    minHeight: 150,
  },
  quickIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  quickTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  quickDesc: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
  },
  moduleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  moduleIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  moduleName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  moduleDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});