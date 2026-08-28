// app/(tabs)/index.tsx
// ORBIT-MESH — ANA SAYFA
// Mesh ağı durumu, bağlı cihaz sayısı, anomali özeti ve PQC (Kuantum Sonrası Kriptografi) durumu.

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
import { useAuth } from "@/context/AuthContext";
import { useSafety } from "@/context/SafetyContext";
import { useColors } from "@/hooks/useColors";
import { BACKEND_URL } from "@/lib/env";
import { useBle } from "@/context/BleContext";

interface SolarFlare { flrID: string; beginTime: string; classType: string; sourceLocation?: string; note?: string; }
interface CME { activityID: string; startTime: string; note?: string; }

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

// NOT: PQC artık burada, diğer büyük kısayollar (Atlas, Missions) ile aynı
// seviyede gerçek bir tıklanabilir kısayol kartı. /pqc ekranına yönlendirir.
const FEATURE_TILES: FeatureTile[] = [
  {
    id: "atlas",
    title: "Gökyüzü Atlası",
    subtitle: "Gezegenler, yıldızlar ve galaksiler",
    description: "Güneş Sistemi'ni ve evren yapılarını keşfet.",
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
  { id: "helio", title: "HELIO", subtitle: "Güneş Hava Durumu", icon: "sun", color: "#FFA500", route: "/helio" },
  { id: "pqc", title: "PQC Güvenlik", subtitle: "Kuantum Sonrası Kriptografi", icon: "shield", color: "#8B5CF6", route: "/pqc" },
  { id: "ble", title: "BLE Ağı", subtitle: "Deneyap Kart", icon: "bluetooth", color: "#38C8FF", route: "/ble" },
  { id: "earthsign", title: "EarthSign", subtitle: "Kayıt Sistemi", icon: "shield", color: "#8B5CF6", route: "/earthsign" },
  { id: "uydular", title: "Türk Uyduları", subtitle: "TÜRKSAT / GÖKTÜRK / RASAT", icon: "radio", color: "#FF4560", route: "/uydular" },
  { id: "uyari", title: "Uyarı Merkezi", subtitle: "Kp İndeksi / NOAA", icon: "alert-triangle", color: "#FFB800", route: "/uyari" },
  { id: "meb", title: "MEB Modülleri", subtitle: "Müfredat Uyumlu", icon: "book-open", color: "#38C8FF", route: "/meb" },
  { id: "auet", title: "AUET", subtitle: "Akustik İzleme", icon: "activity", color: "#00E5B0", route: "/auet" },
  { id: "quiz", title: "Quiz", subtitle: "50 Soru", icon: "book-open", color: "#FFB800", route: "/quiz" },
  { id: "oyun", title: "Uzay Oyunu", subtitle: "Yıldız Avı", icon: "star", color: "#FF6B6B", route: "/oyun" },
  { id: "apod", title: "Günün Fotoğrafı", subtitle: "NASA APOD + Türkçe", icon: "image", color: "#7C3AED", route: "/apod" },
  { id: "iss", title: "ISS Geçişleri", subtitle: "Canlı uydu geçişi", icon: "navigation", color: "#0EA5E9", route: "/iss" },
  { id: "meteor", title: "Meteor Takvimi", subtitle: "Yağmur ve tutulmalar", icon: "star", color: "#F59E0B", route: "/meteor" },
  { id: "deneyler", title: "Deneyler", subtitle: "MEB uyumlu deneyler", icon: "activity", color: "#22C55E", route: "/deneyler" },
  { id: "ekosistem", title: "Yerli Ekosistem", subtitle: "TUA, TÜBİTAK, Türksat", icon: "flag", color: "#E11D48", route: "/ekosistem" },
  { id: "ay", title: "Ay Takvimi", subtitle: "Evreler ve gözlem", icon: "moon", color: "#A5B4FC", route: "/ay" },
  { id: "mesh", title: "Mesh Ağı", subtitle: "Çoklu düğüm yönetimi", icon: "server", color: "#3ECF8E", route: "/mesh" },
];

const DAILY_TASKS: DailyTask[] = [
  { id: "read-atlas", title: "Bir gezegen incele", description: "Gökyüzü Atlası'nda bir gezegen kartını aç.", xp: 10, icon: "globe" },
  { id: "open-mission", title: "Bir görev oku", description: "Uzay Görevleri bölümünden bir görevi aç.", xp: 15, icon: "navigation" },
  { id: "view-solar", title: "Güneş raporuna bak", description: "HELIO bölümünde bugünün uzay havasını kontrol et.", xp: 5, icon: "sun" },
  { id: "solve-quiz", title: "Mini quiz çöz", description: "En az 1 soru cevapla.", xp: 20, icon: "book-open" },
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
  const { connectedDevices, latestTelemetry, meshNodes, anomalyScore, consensus, pqcStatus } = useBle();

  const [flares, setFlares] = useState<SolarFlare[]>([]);
  const [cmes, setCmes] = useState<CME[]>([]);
  const [dailyTasksDone, setDailyTasksDone] = useState<string[]>([]);
  const [loadingNasa, setLoadingNasa] = useState(true);
  const [nasaError, setNasaError] = useState(false);

  useEffect(() => { void fetchNasaData(); }, []);

  async function fetchNasaData() {
    try {
      setLoadingNasa(true);
      const end = new Date().toISOString().split("T")[0];
      const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const [flaresRes, cmesRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/nasa?type=FLR&start=${start}&end=${end}`),
        fetch(`${BACKEND_URL}/api/nasa?type=CME&start=${start}&end=${end}`),
      ]);
      const flaresData = flaresRes.ok ? await flaresRes.json() : null;
      const cmesData = cmesRes.ok ? await cmesRes.json() : null;
      setFlares(Array.isArray(flaresData) ? flaresData.slice(0, 3) : []);
      setCmes(Array.isArray(cmesData) ? cmesData.slice(0, 2) : []);
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
  }, [myStatus, colors]);

  const dayNote = ASTRO_NOTES[new Date().getDate() % ASTRO_NOTES.length];
  const completedTaskXp = useMemo(
    () => DAILY_TASKS.reduce((sum, task) => dailyTasksDone.includes(task.id) ? sum + task.xp : sum, 0),
    [dailyTasksDone]
  );
  const derivedXp = useMemo(
    () => (user?.quizScore ?? 0) * 10 + flares.length * 5 + cmes.length * 7 + streak * 15 + completedTaskXp,
    [user?.quizScore, flares.length, cmes.length, streak, completedTaskXp]
  );
  const level = Math.max(1, Math.floor(derivedXp / 250) + 1);
  const taskCompletion = Math.round((dailyTasksDone.length / DAILY_TASKS.length) * 100);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  function toggleTask(taskId: string) {
    setDailyTasksDone(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  }

  // ── PQC güvenlik durumu ─────────────────────────────────────────────────
  // pqcEngine.ts (PQCSessionManager.getSecurityStatus) alanlarıyla birebir
  // eşleşir: totalNodes, pqcActiveNodes, recentVerifications, recentFailures,
  // failureRate. Kart artık koşulsuz gösterilir — bağlantı yoksa "Bekleniyor"
  // durumunda görünür, diğer modüller gibi her zaman orada durur.
  const pqcTotalNodes = pqcStatus?.totalNodes ?? 0;
  const pqcActiveCount = pqcStatus?.pqcActiveNodes?.length ?? 0;
  const pqcVerifications = pqcStatus?.recentVerifications ?? 0;
  const pqcFailures = pqcStatus?.recentFailures ?? 0;
  const pqcFailureRate = ((pqcStatus?.failureRate ?? 0) * 100).toFixed(0);
  const pqcIsLive = pqcTotalNodes > 0;
  // Aktif oturumun kimliği (pqcEngine.ts'deki sessionId) — "her sinyalde
  // değişen, tekrarlanmayan" oturumun somut, gösterilebilir kanıtı.
  const pqcSessionId: string | null = pqcStatus?.pqcActiveNodes?.[0]
    ? (latestTelemetry?.pqcSessionId ?? null)
    : null;

  // Mesh durumu
  const nodeCount = connectedDevices.length;
  const anomalyNodeCount = meshNodes.filter(n => n.anomalyScore && n.anomalyScore.total >= 50).length;
  const consensusStatus = consensus.status;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>{greetingTime()},</Text>
            <Text style={[styles.userName, { color: colors.foreground }]}>{user?.name ?? "Astronot"}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: colors.primary + "18" }]}>
            <Feather name="star" size={14} color={colors.primary} />
            <Text style={[styles.badgeText, { color: colors.primary }]}>ORBIT</Text>
          </View>
        </View>

        {/* Astronomi Notu */}
        <View style={[styles.noteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.noteRow}>
            <Feather name="info" size={16} color={colors.primary} />
            <Text style={[styles.noteTitle, { color: colors.foreground }]}>Bugünün Astronomi Notu</Text>
          </View>
          <Text style={[styles.noteText, { color: colors.mutedForeground }]}>{dayNote}</Text>
        </View>

        {/* Mesh Ağı Durumu Widget */}
        <View style={[styles.meshWidget, { backgroundColor: colors.card, borderColor: colors.primary + "44" }]}>
          <View style={styles.meshHeader}>
            <Feather name="server" size={18} color={colors.primary} />
            <Text style={[styles.meshTitle, { color: colors.foreground }]}>Mesh Ağı</Text>
            <View style={[styles.meshBadge, { backgroundColor: nodeCount > 0 ? colors.accent + "33" : colors.muted + "33" }]}>
              <Text style={[styles.meshBadgeText, { color: nodeCount > 0 ? colors.accent : colors.mutedForeground }]}>
                {nodeCount > 0 ? `${nodeCount} düğüm` : "Bağlantı yok"}
              </Text>
            </View>
          </View>
          <View style={styles.meshStats}>
            <View style={styles.meshStat}>
              <Text style={[styles.meshStatValue, { color: colors.foreground }]}>{nodeCount}</Text>
              <Text style={[styles.meshStatLabel, { color: colors.mutedForeground }]}>Bağlı</Text>
            </View>
            <View style={styles.meshStat}>
              <Text style={[styles.meshStatValue, { color: anomalyNodeCount > 0 ? colors.danger : colors.accent }]}>
                {anomalyNodeCount}
              </Text>
              <Text style={[styles.meshStatLabel, { color: colors.mutedForeground }]}>Anomalili</Text>
            </View>
            <View style={styles.meshStat}>
              <Text style={[styles.meshStatValue, { color: consensusStatus === "Normal" ? colors.accent : colors.warning }]}>
                {consensusStatus}
              </Text>
              <Text style={[styles.meshStatLabel, { color: colors.mutedForeground }]}>Konsensus</Text>
            </View>
          </View>
          {nodeCount > 0 && (
            <Pressable
              style={[styles.meshDetailBtn, { backgroundColor: colors.primary + "22" }]}
              onPress={() => router.push("/mesh" as any)}
            >
              <Text style={[styles.meshDetailText, { color: colors.primary }]}>Düğümleri görüntüle</Text>
              <Feather name="chevron-right" size={14} color={colors.primary} />
            </Pressable>
          )}
        </View>

        {/* Günün Gözlem Önerisi */}
        <View style={[styles.obsAdviceCard, { backgroundColor: colors.card, borderColor: colors.primary + "44" }]}>
          <View style={styles.obsAdviceHeader}>
            <Feather name="compass" size={16} color={colors.primary} />
            <Text style={[styles.obsAdviceTitle, { color: colors.foreground }]}>Günün Gözlem Önerisi</Text>
          </View>
          <Text style={[styles.obsAdviceText, { color: colors.mutedForeground }]}>
            {(() => {
              const state = latestTelemetry?.state || "QUIET";
              const sq = latestTelemetry?.sq || 0;
              if (state === "EXTREME" || state === "DISTURBED")
                return "İyonosfer kararsız — Teleskopla derin gözlem yerine uzay havası izleyin (HELIO).";
              if (state === "ACTIVE" || sq > 40)
                return "Uygun koşullar — Bugün Ay ve gezegen gözlemi ideal (Atlas).";
              if (state === "WATCH")
                return "Sakin gökyüzü — Yıldız kümeleri ve galaksiler için uygun (Missions).";
              return "Gözlem için uygun — ISS geçişini kaçırma! (ISS).";
            })()}
          </Text>
          <Pressable style={[styles.obsAdviceBtn, { backgroundColor: colors.primary + "22" }]} onPress={() => router.push("/gokyuzu-kocu" as any)}>
            <Text style={[styles.obsAdviceBtnText, { color: colors.primary }]}>Gökyüzü Koçu'na git</Text>
            <Feather name="chevron-right" size={14} color={colors.primary} />
          </Pressable>
        </View>

        {/* Seviye Kartı */}
        <View style={[styles.levelCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.levelTopRow}>
            <View style={[styles.levelBadge, { backgroundColor: colors.primary + "18" }]}>
              <Feather name="award" size={16} color={colors.primary} />
              <Text style={[styles.levelBadgeText, { color: colors.primary }]}>Seviye {level}</Text>
            </View>
            <Text style={[styles.xpText, { color: colors.foreground }]}>{derivedXp} XP</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.background }]}>
            <View style={[styles.progressFill, { width: `${Math.min((derivedXp % 250) / 250, 1) * 100}%`, backgroundColor: colors.primary }]} />
          </View>
          <Text style={[styles.progressText, { color: colors.mutedForeground }]}>Astronomi yolculuğun ilerliyor.</Text>
        </View>

        {/* Uzayı Dinle Kartı */}
        <Pressable
          style={({ pressed }) => [
            styles.listenCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.primary + "66",
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          onPress={() => router.push("/ble" as any)}
        >
          <LinearGradient
            colors={[colors.primary + "22", "transparent"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.listenRow}>
            <View style={[styles.listenIconWrap, { backgroundColor: colors.primary + "18" }]}>
              <Feather name="radio" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.listenTitle, { color: colors.foreground }]}>Uzayı Dinlemek İçin Bir Kart Yeter</Text>
              <Text style={[styles.listenDesc, { color: colors.mutedForeground }]}>
                Deneyap Kart ile VLF sinyallerini ve uzay havası etkilerini gerçek zamanlı izle.
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </View>
        </Pressable>

        {/* İstatistikler */}
        <View style={styles.statsRow}>
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
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="sun" size={16} color={colors.warning} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{flares.length}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Güneş Patlaması</Text>
          </View>
        </View>

        {/* ORBIT AI */}
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

        {/* Günlük Görevler */}
        <View style={styles.tasksCard}>
          <View style={styles.tasksHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Bugünkü Görevler</Text>
            <Text style={[styles.tasksCompletion, { color: colors.primary }]}>%{taskCompletion}</Text>
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
                <Feather name={task.icon} size={18} color={done ? colors.primary : colors.mutedForeground} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.taskTitle, { color: colors.foreground }]}>
                    {done ? "✓ " : ""}{task.title}
                  </Text>
                  <Text style={[styles.taskDesc, { color: colors.mutedForeground }]}>{task.description}</Text>
                </View>
                <Text style={[styles.taskXp, { color: colors.primary }]}>+{task.xp}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Güneş Hava Durumu */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Güneş Hava Durumu</Text>
        <View style={[styles.nasaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.nasaHeader}>
            <Feather name="sun" size={18} color={colors.solar} />
            <Text style={[styles.nasaTitle, { color: colors.solar }]}>NASA DONKI — Son 7 Gün</Text>
          </View>
          {loadingNasa ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
          ) : nasaError ? (
            <Text style={[styles.errorText, { color: colors.mutedForeground }]}>Veri alınamadı — internet bağlantısını kontrol edin</Text>
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
                  {f.sourceLocation ? (
                    <Text style={[styles.flareLocation, { color: colors.primary }]}>{f.sourceLocation}</Text>
                  ) : null}
                </View>
              ))}
              {flares.length === 0 && cmes.length === 0 && (
                <Text style={[styles.quietText, { color: colors.accent }]}>Güneş sakin — aktif etkinlik yok</Text>
              )}
            </>
          )}
        </View>

        {/* 🔐 PQC Güvenlik Kartı — HER ZAMAN GÖRÜNÜR, koşula bağlı değil */}
        <View style={[styles.pqcCard, { backgroundColor: colors.card, borderColor: colors.primary + "44" }]}>
          <View style={styles.pqcHeader}>
            <Feather name="shield" size={18} color={colors.primary} />
            <Text style={[styles.pqcTitle, { color: colors.foreground }]}>Kuantum Sonrası Güvenlik (PQC)</Text>
            <View style={[styles.pqcBadge, { backgroundColor: pqcFailures > 0 ? colors.danger + "33" : pqcIsLive ? colors.accent + "33" : colors.muted + "33" }]}>
              <Text style={[styles.pqcBadgeText, { color: pqcFailures > 0 ? colors.danger : pqcIsLive ? colors.accent : colors.mutedForeground }]}>
                {pqcFailures > 0 ? "Saldırı Engellendi" : pqcIsLive ? "Aktif" : "Bekleniyor"}
              </Text>
            </View>
          </View>

          <Text style={[styles.pqcDesc, { color: colors.mutedForeground }]}>
            VLF anteninden BLE ile gelen her paket, kafes tabanlı (LWE) bir imza ile doğrulanır. Her yeni oturumda anahtar
            çifti sıfırdan üretilir — bu yüzden hiçbir imza bir öncekiyle aynı olmaz ve klasik ya da kuantum bilgisayarla
            geriye doğru tahmin edilemez.
          </Text>

          <View style={styles.pqcGrid}>
            <View style={styles.pqcCell}>
              <Text style={[styles.pqcLabel, { color: colors.mutedForeground }]}>Aktif Düğüm</Text>
              <Text style={[styles.pqcValue, { color: colors.foreground }]}>
                {pqcActiveCount}/{Math.max(pqcTotalNodes, pqcActiveCount)}
              </Text>
            </View>
            <View style={styles.pqcCell}>
              <Text style={[styles.pqcLabel, { color: colors.mutedForeground }]}>Doğrulanan Paket (60sn)</Text>
              <Text style={[styles.pqcValue, { color: colors.accent }]}>{pqcVerifications}</Text>
            </View>
            <View style={styles.pqcCell}>
              <Text style={[styles.pqcLabel, { color: colors.mutedForeground }]}>Hata Oranı</Text>
              <Text style={[styles.pqcValue, { color: parseFloat(pqcFailureRate) > 10 ? colors.danger : colors.accent }]}>
                {pqcFailureRate}%
              </Text>
            </View>
          </View>

          {pqcSessionId && (
            <Text style={[styles.pqcSeed, { color: colors.mutedForeground }]}>
              Oturum: {pqcSessionId.substring(0, 16)}…
            </Text>
          )}

          {pqcFailures > 0 && (
            <View style={[styles.pqcAlert, { backgroundColor: colors.danger + "22", borderColor: colors.danger + "44" }]}>
              <Feather name="alert-triangle" size={14} color={colors.danger} />
              <Text style={[styles.pqcAlertText, { color: colors.danger }]}>
                Geçersiz paket imzası tespit edildi — manipüle edilmiş veri reddedildi.
              </Text>
            </View>
          )}

          <Pressable
            style={[styles.pqcDetailBtn, { backgroundColor: colors.primary + "22" }]}
            onPress={() => router.push("/pqc" as any)}
          >
            <Text style={[styles.pqcDetailText, { color: colors.primary }]}>Güvenlik katmanını incele</Text>
            <Feather name="chevron-right" size={14} color={colors.primary} />
          </Pressable>
        </View>

        {/* Astronomi Kısa Yolları */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Astronomi Kısa Yolları</Text>
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
              <Text style={[styles.featureTitle, { color: colors.foreground }]}>{tile.title}</Text>
              <Text style={[styles.featureSubtitle, { color: colors.mutedForeground }]}>{tile.subtitle}</Text>
              <Text style={[styles.featureDesc, { color: colors.foreground }]}>{tile.description}</Text>
            </Pressable>
          ))}
        </View>

        {/* Modüller */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Modüller</Text>
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
              <Text style={[styles.tileTitle, { color: colors.foreground }]}>{tile.title}</Text>
              <Text style={[styles.tileSubtitle, { color: colors.mutedForeground }]}>{tile.subtitle}</Text>
            </Pressable>
          ))}
        </View>

        {/* HayatAğı */}
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
            <Text style={[styles.hayatagiTitle, { color: colors.foreground }]}>HayatAğı Durumum</Text>
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
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  greeting: { fontSize: 14, fontFamily: "Inter_400Regular" },
  userName: { fontSize: 24, fontFamily: "Inter_700Bold" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  badgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  noteCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  noteRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  noteTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  noteText: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },
  meshWidget: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  meshHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  meshTitle: { fontSize: 15, fontFamily: "Inter_700Bold", flex: 1 },
  meshBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  meshBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  meshStats: { flexDirection: "row", justifyContent: "space-around", marginBottom: 10 },
  meshStat: { alignItems: "center" },
  meshStatValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  meshStatLabel: { fontSize: 10, fontFamily: "Inter_500Medium", marginTop: 2 },
  meshDetailBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  meshDetailText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  obsAdviceCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  obsAdviceHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  obsAdviceTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  obsAdviceText: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular", marginBottom: 10 },
  obsAdviceBtn: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  obsAdviceBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  levelCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  levelTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  levelBadge: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  levelBadgeText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  xpText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  progressTrack: { height: 10, borderRadius: 999, marginTop: 14, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999 },
  progressText: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 8 },
  listenCard: {
    marginHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
    overflow: "hidden",
  },
  listenRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  listenIconWrap: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  listenTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  listenDesc: { marginTop: 2, fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
  statsRow: { flexDirection: "row", paddingHorizontal: 20, gap: 10, marginBottom: 18 },
  statCard: { flex: 1, padding: 12, borderRadius: 14, borderWidth: 1, alignItems: "center", gap: 4 },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  aiCard: {
    marginHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
    overflow: "hidden",
  },
  aiRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  aiIconWrap: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  aiTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  aiDesc: { marginTop: 2, fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
  aiPills: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  aiPill: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999 },
  aiPillText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  tasksCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  tasksHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  tasksCompletion: { fontSize: 13, fontFamily: "Inter_700Bold" },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  taskTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  taskDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  taskXp: { fontSize: 13, fontFamily: "Inter_700Bold" },
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
  pqcCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
    gap: 10,
  },
  pqcHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  pqcTitle: { flex: 1, fontSize: 14, fontFamily: "Inter_700Bold" },
  pqcBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  pqcBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  pqcDesc: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
  pqcGrid: { flexDirection: "row", gap: 10 },
  pqcCell: { flex: 1, gap: 2 },
  pqcLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },
  pqcValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  pqcSeed: { fontSize: 11, fontFamily: "Inter_400Regular" },
  pqcAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  pqcAlertText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  pqcDetailBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pqcDetailText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
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
  featureIconWrap: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  featureTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  featureSubtitle: { fontSize: 11, fontFamily: "Inter_500Medium" },
  featureDesc: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular", marginTop: 2 },
  tileGradient: { ...StyleSheet.absoluteFillObject, borderRadius: 16 },
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
  tileTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  tileSubtitle: { fontSize: 11, fontFamily: "Inter_400Regular" },
  hayatagiCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    overflow: "hidden",
  },
  hayatagiRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  hayatagiTitle: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  hayatagiStatus: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 4 },
  hayatagiCheckin: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
