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

import { NASA_API_KEY } from "@/lib/env";
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

type FeatureTile = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  route: string;
};

type ModuleTile = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  route: string;
};

type DailyTask = {
  id: string;
  title: string;
  description: string;
  xp: number;
  icon: keyof typeof Feather.glyphMap;
};

const FEATURE_TILES: FeatureTile[] = [
  {
    id: "atlas",
    title: "Gökyüzü Atlası",
    subtitle: "Gezegenler, yıldızlar ve galaksiler",
    description: "Güneş Sistemi’ni ve evren yapılarını keşfet.",
    icon: "globe",
    color: "#4CC9F0",
    route: "/atlas",
  },
  {
    id: "missions",
    title: "Uzay Görevleri",
    subtitle: "Apollo, Voyager, Webb ve Mars araçları",
    description: "Uzay araçlarını ve keşif sistemlerini öğren.",
    icon: "navigation",
    color: "#F97316",
    route: "/missions",
  },
];

const MODULE_TILES: ModuleTile[] = [
  {
    id: "helio",
    title: "HELIO",
    subtitle: "Güneş Hava Durumu",
    icon: "sun",
    color: "#FFA500",
    route: "/helio",
  },
  {
    id: "ble",
    title: "BLE Ağı",
    subtitle: "Deneyap Kart",
    icon: "bluetooth",
    color: "#38C8FF",
    route: "/ble",
  },
  {
    id: "earthsign",
    title: "EarthSign",
    subtitle: "Kayıt Sistemi",
    icon: "shield",
    color: "#8B5CF6",
    route: "/earthsign",
  },
  {
    id: "auet",
    title: "AUET",
    subtitle: "Akustik İzleme",
    icon: "activity",
    color: "#00E5B0",
    route: "/auet",
  },
  {
    id: "quiz",
    title: "Quiz",
    subtitle: "50 Soru",
    icon: "book-open",
    color: "#FFB800",
    route: "/quiz",
  },
  {
    id: "oyun",
    title: "Uzay Oyunu",
    subtitle: "Yıldız Avı",
    icon: "star",
    color: "#FF6B6B",
    route: "/oyun",
  },
];

const DAILY_TASKS: DailyTask[] = [
  {
    id: "read-atlas",
    title: "Bir gezegen incele",
    description: "Gökyüzü Atlası'nda bir gezegen kartını aç.",
    xp: 10,
    icon: "globe",
  },
  {
    id: "open-mission",
    title: "Bir görev oku",
    description: "Uzay Görevleri bölümünden bir görevi aç.",
    xp: 15,
    icon: "navigation",
  },
  {
    id: "view-solar",
    title: "Güneş raporuna bak",
    description: "HELIO bölümünde bugünün uzay havasını kontrol et.",
    xp: 5,
    icon: "sun",
  },
  {
    id: "solve-quiz",
    title: "Mini quiz çöz",
    description: "En az 1 soru cevapla.",
    xp: 20,
    icon: "book-open",
  },
];

const ASTRO_NOTES = [
  "Jüpiter, Güneş Sistemi'ndeki en büyük gezegendir.",
  "Satürn'ün halkaları buz ve kaya parçalarından oluşur.",
  "James Webb, evreni kızılötesi ışıkta gözlemler.",
  "Güneş ışığı Dünya'ya yaklaşık 8 dakika 20 saniyede ulaşır.",
];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { myStatus, streak, lastCheckin } = useSafety();

  const [flares, setFlares] = useState<SolarFlare[]>([]);
  const [cmes, setCmes] = useState<CME[]>([]);
  const [dailyTasksDone, setDailyTasksDone] = useState<string[]>([]);
  const [loadingNasa, setLoadingNasa] = useState(true);
  const [nasaError, setNasaError] = useState(false);

  useEffect(() => {
    void fetchNasaData();
  }, []);

  async function fetchNasaData() {
    try {
      setLoadingNasa(true);

      const end = new Date().toISOString().split("T")[0];
      const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const [flaresRes, cmesRes] = await Promise.all([
        fetch(
          `https://api.nasa.gov/DONKI/FLR?startDate=${start}&endDate=${end}&api_key=${NASA_API_KEY}`
        ),
        fetch(
          `https://api.nasa.gov/DONKI/CME?startDate=${start}&endDate=${end}&api_key=${NASA_API_KEY}`
        ),
      ]);

      if (flaresRes.ok) {
        const flaresJson = await flaresRes.json();
        setFlares(Array.isArray(flaresJson) ? flaresJson.slice(0, 3) : []);
      } else {
        setFlares([]);
      }

      if (cmesRes.ok) {
        const cmesJson = await cmesRes.json();
        setCmes(Array.isArray(cmesJson) ? cmesJson.slice(0, 2) : []);
      } else {
        setCmes([]);
      }

      setNasaError(false);
    } catch {
      setNasaError(true);
      setFlares([]);
      setCmes([]);
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

  const currentStatusColor = useMemo(() => {
    if (myStatus === "green") return colors.green;
    if (myStatus === "yellow") return colors.yellow;
    return colors.red;
  }, [myStatus, colors.green, colors.yellow, colors.red]);

  const dayNote = ASTRO_NOTES[new Date().getDate() % ASTRO_NOTES.length];
  const completedTaskXp = useMemo(
    () =>
      DAILY_TASKS.reduce((sum, task) => {
        return dailyTasksDone.includes(task.id) ? sum + task.xp : sum;
      }, 0),
    [dailyTasksDone]
  );

  const derivedXp = useMemo(() => {
    const base = (user?.quizScore ?? 0) * 10;
    const solarBoost = flares.length * 5 + cmes.length * 7;
    const attendance = streak * 15;
    return base + solarBoost + attendance + completedTaskXp;
  }, [user?.quizScore, flares.length, cmes.length, streak, completedTaskXp]);

  const level = Math.max(1, Math.floor(derivedXp / 250) + 1);
  const taskCompletion = Math.round((dailyTasksDone.length / DAILY_TASKS.length) * 100);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  function toggleTask(taskId: string) {
    setDailyTasksDone(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
              {greetingTime()},
            </Text>
            <Text style={[styles.userName, { color: colors.foreground }]}>
              {user?.name ?? "Astronot"}
            </Text>
          </View>

          <View style={[styles.badge, { backgroundColor: colors.primary + "18" }]}>
            <Feather name="star" size={14} color={colors.primary} />
            <Text style={[styles.badgeText, { color: colors.primary }]}>ORBIT</Text>
          </View>
        </View>

        <View style={[styles.noteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.noteRow}>
            <Feather name="info" size={16} color={colors.primary} />
            <Text style={[styles.noteTitle, { color: colors.foreground }]}>
              Bugünün Astronomi Notu
            </Text>
          </View>
          <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
            {dayNote}
          </Text>
        </View>

        <View style={[styles.levelCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.levelTopRow}>
            <View style={[styles.levelBadge, { backgroundColor: colors.primary + "18" }]}>
              <Feather name="award" size={16} color={colors.primary} />
              <Text style={[styles.levelBadgeText, { color: colors.primary }]}>
                Seviye {level}
              </Text>
            </View>
            <Text style={[styles.xpText, { color: colors.foreground }]}>
              {derivedXp} XP
            </Text>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: colors.background }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min((derivedXp % 250) / 250, 1) * 100}%`,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          </View>

          <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
            Astronomi yolculuğun ilerliyor.
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="award" size={16} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              #{user?.rank ?? 1}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Sıralama
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="check-circle" size={16} color={colors.accent} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {user?.quizScore ?? 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Quiz Puanı
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="sun" size={16} color={colors.warning} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {flares.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Güneş Patlaması
            </Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.aiCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          onPress={() => router.push("/sohbet" as any)}
        >
          <LinearGradient
            colors={[colors.primary + "18", "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.aiRow}>
            <View style={[styles.aiIconWrap, { backgroundColor: colors.primary + "18" }]}>
              <Feather name="message-circle" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.aiTitle, { color: colors.foreground }]}>ORBIT AI</Text>
              <Text style={[styles.aiDesc, { color: colors.mutedForeground }]}>
                Astronomi, uzay görevleri ve ORBIT sistemleri hakkında sor.
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </View>
          <View style={styles.aiPills}>
            <View style={[styles.aiPill, { backgroundColor: colors.background }]}>
              <Text style={[styles.aiPillText, { color: colors.foreground }]}>Gezegenler</Text>
            </View>
            <View style={[styles.aiPill, { backgroundColor: colors.background }]}>
              <Text style={[styles.aiPillText, { color: colors.foreground }]}>Görevler</Text>
            </View>
            <View style={[styles.aiPill, { backgroundColor: colors.background }]}>
              <Text style={[styles.aiPillText, { color: colors.foreground }]}>Güneş Havası</Text>
            </View>
          </View>
        </Pressable>

        <View style={styles.tasksCard}>
          <View style={styles.tasksHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Bugünkü Görevler
            </Text>
            <Text style={[styles.tasksCompletion, { color: colors.primary }]}>
              %{taskCompletion}
            </Text>
          </View>

          {DAILY_TASKS.map(task => {
            const done = dailyTasksDone.includes(task.id);

            return (
              <Pressable
                key={task.id}
                onPress={() => toggleTask(task.id)}
                style={({ pressed }) => [
                  styles.taskRow,
                  {
                    borderColor: colors.border,
                    opacity: pressed ? 0.75 : 1,
                    backgroundColor: done ? colors.primary + "12" : "transparent",
                  },
                ]}
              >
                <Feather
                  name={task.icon}
                  size={18}
                  color={done ? colors.primary : colors.mutedForeground}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.taskTitle, { color: colors.foreground }]}>
                    {done ? "✓ " : ""}
                    {task.title}
                  </Text>
                  <Text style={[styles.taskDesc, { color: colors.mutedForeground }]}>
                    {task.description}
                  </Text>
                </View>
                <Text style={[styles.taskXp, { color: colors.primary }]}>
                  +{task.xp}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Güneş Hava Durumu
        </Text>
        <View style={[styles.nasaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.nasaHeader}>
            <Feather name="sun" size={18} color={colors.solar} />
            <Text style={[styles.nasaTitle, { color: colors.solar }]}>
              NASA DONKI — Son 7 Gün
            </Text>
          </View>

          {loadingNasa ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
          ) : nasaError ? (
            <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
              Veri alınamadı — internet bağlantısını kontrol edin
            </Text>
          ) : (
            <>
              <Text style={[styles.nasaSubtitle, { color: colors.mutedForeground }]}>
                {flares.length} Güneş Patlaması · {cmes.length} CME
              </Text>

              {flares.map(f => (
                <View key={f.flrID} style={[styles.flareRow, { borderColor: colors.border }]}>
                  <View style={[styles.flareBadge, { backgroundColor: colors.solar + "33" }]}>
                    <Text style={[styles.flareClass, { color: colors.solar }]}>
                      {f.classType}
                    </Text>
                  </View>
                  <Text style={[styles.flareTime, { color: colors.mutedForeground }]}>
                    {new Date(f.beginTime).toLocaleDateString("tr-TR")}
                  </Text>
                  {f.sourceLocation ? (
                    <Text style={[styles.flareLocation, { color: colors.primary }]}>
                      {f.sourceLocation}
                    </Text>
                  ) : null}
                </View>
              ))}

              {flares.length === 0 && cmes.length === 0 ? (
                <Text style={[styles.quietText, { color: colors.accent }]}>
                  Güneş sakin — aktif etkinlik yok
                </Text>
              ) : null}
            </>
          )}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Astronomi Kısa Yolları
        </Text>
        <View style={styles.featureGrid}>
          {FEATURE_TILES.map(tile => (
            <Pressable
              key={tile.id}
              onPress={() => router.push(tile.route as any)}
              style={({ pressed }) => [
                styles.featureTile,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <LinearGradient
                colors={[tile.color + "30", "transparent"]}
                style={styles.tileGradient}
              />
              <View style={[styles.featureIconWrap, { backgroundColor: tile.color + "18" }]}>
                <Feather name={tile.icon} size={22} color={tile.color} />
              </View>
              <Text style={[styles.featureTitle, { color: colors.foreground }]}>
                {tile.title}
              </Text>
              <Text style={[styles.featureSubtitle, { color: colors.mutedForeground }]}>
                {tile.subtitle}
              </Text>
              <Text style={[styles.featureDesc, { color: colors.foreground }]}>
                {tile.description}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Modüller
        </Text>
        <View style={styles.grid}>
          {MODULE_TILES.map(tile => (
            <Pressable
              key={tile.id}
              style={({ pressed }) => [
                styles.tile,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              onPress={() => router.push(tile.route as any)}
            >
              <LinearGradient
                colors={[tile.color + "33", "transparent"]}
                style={styles.tileGradient}
              />
              <Feather name={tile.icon} size={24} color={tile.color} />
              <Text style={[styles.tileTitle, { color: colors.foreground }]}>
                {tile.title}
              </Text>
              <Text style={[styles.tileSubtitle, { color: colors.mutedForeground }]}>
                {tile.subtitle}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[
            styles.hayatagiCard,
            {
              backgroundColor: colors.card,
              borderColor: currentStatusColor + "66",
            },
          ]}
          onPress={() => router.push("/hayatagi" as any)}
        >
          <LinearGradient
            colors={[currentStatusColor + "22", "transparent"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.hayatagiRow}>
            <Feather name="heart" size={20} color={currentStatusColor} />
            <Text style={[styles.hayatagiTitle, { color: colors.foreground }]}>
              HayatAğı Durumum
            </Text>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </View>

          <Text style={[styles.hayatagiStatus, { color: currentStatusColor }]}>
            {myStatus === "green" ? "İyiyim" : myStatus === "yellow" ? "Dikkat" : "Yardım Lazım"}
          </Text>

          <Text style={[styles.hayatagiCheckin, { color: colors.mutedForeground }]}>
            {lastCheckin
              ? `Son check-in: ${new Date(lastCheckin).toLocaleDateString("tr-TR")}`
              : "Henüz check-in yapılmadı"}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  greeting: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  userName: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  noteCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  noteText: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Inter_400Regular",
  },
  levelCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  levelTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  levelBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  xpText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    marginTop: 14,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  progressText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 8,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  aiCard: {
    marginHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
    overflow: "hidden",
  },
  aiRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  aiIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  aiTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  aiDesc: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
  },
  aiPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  aiPill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  aiPillText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  tasksCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  tasksHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  tasksCompletion: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  taskTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  taskDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  taskXp: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  nasaCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  nasaHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  nasaTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  nasaSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
  },
  flareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  flareBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  flareClass: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  flareTime: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  flareLocation: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  quietText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    paddingVertical: 8,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingVertical: 8,
  },
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  featureTile: {
    width: "48%",
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    overflow: "hidden",
    gap: 6,
    minHeight: 170,
  },
  featureIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  featureTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  featureSubtitle: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  tile: {
    width: "47%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    overflow: "hidden",
    gap: 8,
  },
  tileGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  tileTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  tileSubtitle: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  hayatagiCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    overflow: "hidden",
  },
  hayatagiRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  hayatagiTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  hayatagiStatus: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  hayatagiCheckin: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});