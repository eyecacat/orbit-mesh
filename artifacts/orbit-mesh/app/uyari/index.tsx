// app/uyari/index.tsx
// ŞARTNAME UYUMLU: Kp vs BLE Anomali Uyumu paneli eklendi.

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { BACKEND_URL } from "@/lib/env";
import { useBle } from "@/context/BleContext";

interface SpaceWeatherData {
  kp: number | null;
  kpTime: string | null;
  alerts: Array<{ product_id: string; message: string; issue_datetime?: string }>;
  fetchedAt: string;
}
interface SolarEvent { id: string; type: "FLR" | "CME"; time: string; classOrNote: string; }

export default function UyariScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { anomalyScore } = useBle();

  const [weather, setWeather] = useState<SpaceWeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [solarEvents, setSolarEvents] = useState<SolarEvent[]>([]);
  const [loadingSolar, setLoadingSolar] = useState(true);
  const [solarError, setSolarError] = useState(false);
  const [translatedAlerts, setTranslatedAlerts] = useState<string[]>([]);
  const [translatedEvents, setTranslatedEvents] = useState<string[]>([]);
  const [translating, setTranslating] = useState(false);

  useEffect(() => { void fetchWeather(); void fetchSolarEvents(); }, []);

  async function fetchWeather() {
    try { setLoading(true); const res = await fetch(`${BACKEND_URL}/api/space-weather`); if (!res.ok) throw new Error(); setWeather(await res.json()); setError(false); } catch { setError(true); } finally { setLoading(false); }
  }
  async function fetchSolarEvents() {
    try {
      setLoadingSolar(true);
      const end = new Date().toISOString().split("T")[0];
      const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const [flaresRes, cmesRes] = await Promise.all([fetch(`${BACKEND_URL}/api/nasa?type=FLR&start=${start}&end=${end}`), fetch(`${BACKEND_URL}/api/nasa?type=CME&start=${start}&end=${end}`)]);
      const flares = flaresRes.ok ? await flaresRes.json() : [];
      const cmes = cmesRes.ok ? await cmesRes.json() : [];
      const events: SolarEvent[] = [
        ...(Array.isArray(flares) ? flares.slice(0, 5).map((f: any) => ({ id: f.flrID, type: "FLR" as const, time: f.beginTime, classOrNote: f.classType || "—" })) : []),
        ...(Array.isArray(cmes) ? cmes.slice(0, 3).map((c: any) => ({ id: c.activityID, type: "CME" as const, time: c.startTime, classOrNote: c.note?.slice(0, 60) || "—" })) : []),
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setSolarEvents(events); setSolarError(false);
    } catch { setSolarError(true); } finally { setLoadingSolar(false); }
  }

  async function translateToTurkish(alerts: string[], events: string[]) {
    const allTexts = [...alerts, ...events].filter(Boolean);
    if (allTexts.length === 0) return;
    setTranslating(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/openrouter`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "openai/gpt-4o-mini", messages: [{ role: "system", content: "Ortaokul öğrencisinin anlayacağı açık, doğal Türkçe ile aşağıdaki uzay hava durumu uyarı ve etkinlik metinlerini çevir. Teknik terimleri yalın tut. SADECE çevirileri içeren JSON dizisi döndür: [\"çeviri1\", \"çeviri2\", ...]. Başka açıklama ekleme." }, { role: "user", content: JSON.stringify(allTexts) }], temperature: 0.2 }) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content || "";
      let translations: string[] = [];
      try { translations = JSON.parse(content); } catch {}
      if (!Array.isArray(translations) || translations.length !== allTexts.length) translations = allTexts;
      setTranslatedAlerts(translations.slice(0, alerts.length));
      setTranslatedEvents(translations.slice(alerts.length));
    } catch { setTranslatedAlerts(alerts); setTranslatedEvents(events); } finally { setTranslating(false); }
  }

  useEffect(() => { if (weather && !loading && !loadingSolar) { const alertMessages = weather.alerts.map(a => a.message); const eventNotes = solarEvents.map(e => e.classOrNote); void translateToTurkish(alertMessages, eventNotes); } }, [weather, solarEvents, loading, loadingSolar]);

  const kpLevel = (kp: number | null) => {
    if (kp === null || kp === undefined) return { label: "Bilinmiyor", color: colors.mutedForeground };
    if (kp < 4) return { label: "Sakin", color: colors.accent };
    if (kp < 5) return { label: "Aktif", color: colors.warning };
    if (kp < 6) return { label: "Fırtına", color: colors.solar };
    return { label: "Güçlü Fırtına", color: colors.danger };
  };
  const currentKp = weather?.kp ?? null;
  const kpInfo = kpLevel(currentKp);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}><Feather name="chevron-left" size={24} color={colors.foreground} /></Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>Uzay Hava Uyarıları</Text><View style={{ width: 32 }} />
        </View>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>NOAA SWPC ve NASA DONKI'den gerçek zamanlı uzay hava durumu; OpenRouter AI ile otomatik Türkçe'ye çevrilir.</Text>

        <View style={[styles.kpCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: kpInfo.color, borderLeftWidth: 4 }]}>
          <View style={styles.kpHeader}><Feather name="activity" size={20} color={kpInfo.color} /><Text style={[styles.kpTitle, { color: colors.foreground }]}>Kp İndeksi</Text></View>
          {loading ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : error || currentKp === null ? <Text style={[styles.errorText, { color: colors.mutedForeground }]}>Kp verisi alınamadı.</Text> :
            <><View style={styles.kpRow}><Text style={[styles.kpValue, { color: kpInfo.color }]}>{currentKp.toFixed(1)}</Text><Text style={[styles.kpLabel, { color: kpInfo.color }]}>{kpInfo.label}</Text></View>{weather?.kpTime ? <Text style={[styles.kpTime, { color: colors.mutedForeground }]}>Son güncelleme: {new Date(weather.kpTime).toLocaleString("tr-TR")}</Text> : null}</>}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}><Text style={[styles.cardTitle, { color: colors.foreground }]}>NOAA Uyarıları</Text>{translating && <ActivityIndicator size="small" color={colors.primary} />}</View>
          {loading ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : error ? <Text style={[styles.errorText, { color: colors.mutedForeground }]}>Uyarı verisi alınamadı.</Text> :
            weather?.alerts && weather.alerts.length > 0 ? weather.alerts.map((alert, idx) => (
              <View key={alert.product_id || idx} style={[styles.alertRow, { borderColor: colors.border }]}>
                <Feather name="alert-triangle" size={16} color={colors.warning} />
                <View style={{ flex: 1 }}><Text style={[styles.alertText, { color: colors.foreground }]}>{translatedAlerts[idx] || alert.message}</Text>{alert.issue_datetime ? <Text style={[styles.alertTime, { color: colors.mutedForeground }]}>{new Date(alert.issue_datetime).toLocaleString("tr-TR")}</Text> : null}</View>
              </View>
            )) : <Text style={[styles.quietText, { color: colors.accent }]}>Aktif NOAA uzay hava uyarısı yok.</Text>}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}><Text style={[styles.cardTitle, { color: colors.foreground }]}>NASA Güneş Etkinlikleri</Text>{translating && <ActivityIndicator size="small" color={colors.primary} />}</View>
          {loadingSolar ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : solarError ? <Text style={[styles.errorText, { color: colors.mutedForeground }]}>NASA verisi alınamadı.</Text> :
            solarEvents.length > 0 ? solarEvents.map((event, idx) => (
              <View key={event.id} style={[styles.eventRow, { borderColor: colors.border }]}>
                <View style={[styles.eventBadge, { backgroundColor: event.type === "FLR" ? colors.solar + "33" : colors.primary + "33" }]}>
                  <Text style={[styles.eventType, { color: event.type === "FLR" ? colors.solar : colors.primary }]}>{event.type}</Text>
                </View>
                <View style={{ flex: 1 }}><Text style={[styles.eventNote, { color: colors.foreground }]}>{translatedEvents[idx] || event.classOrNote}</Text><Text style={[styles.eventTime, { color: colors.mutedForeground }]}>{new Date(event.time).toLocaleString("tr-TR")}</Text></View>
              </View>
            )) : <Text style={[styles.quietText, { color: colors.accent }]}>Son 7 günde kaydedilmiş güneş etkinliği yok.</Text>}
        </View>

        {/* 🔄 Kp vs BLE Anomali Uyumu */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Kp vs BLE Anomali Uyumu</Text>
          <View style={styles.comparisonRow}>
            <View style={styles.comparisonItem}>
              <Text style={[styles.comparisonLabel, { color: colors.mutedForeground }]}>NOAA Kp</Text>
              <Text style={[styles.comparisonValue, { color: currentKp !== null ? (currentKp >= 5 ? colors.danger : currentKp >= 4 ? colors.warning : colors.accent) : colors.mutedForeground }]}>{currentKp !== null ? currentKp.toFixed(1) : "—"}</Text>
            </View>
            <Feather name="arrow-right" size={20} color={colors.primary} />
            <View style={styles.comparisonItem}>
              <Text style={[styles.comparisonLabel, { color: colors.mutedForeground }]}>BLE Anomali Skoru</Text>
              <Text style={[styles.comparisonValue, { color: anomalyScore ? (anomalyScore.total >= 50 ? colors.danger : anomalyScore.total >= 30 ? colors.warning : colors.accent) : colors.mutedForeground }]}>{anomalyScore ? Math.round(anomalyScore.total) : "—"}</Text>
            </View>
          </View>
          <Text style={[styles.comparisonDesc, { color: colors.mutedForeground }]}>
            {(() => {
              if (!anomalyScore || currentKp === null) return "Veri bekleniyor…";
              const diff = Math.abs(currentKp - anomalyScore.total / 10);
              if (diff < 0.5) return "✅ Uyumlu: Uzay havası ve yerel gözlem örtüşüyor.";
              if (diff < 1.5) return "🟡 Kısmi uyum: Yerel etkenler (gürültü) olabilir.";
              return "🔴 Farklı: Yerel anomali, uzay havasından bağımsız olabilir.";
            })()}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>ORBIT-MESH Bağlantısı</Text>
          <Text style={[styles.cardText, { color: colors.mutedForeground }]}>Kp ≥ 5 (jeomanyetik fırtına) anlarında Dünya iyonosferi bozulur. ORBIT-MESH VLF düğümleri bu değişimleri yerel ölçekte gözlemleyerek öğrencilere uzay havasının günlük yaşamdaki etkisini somutlaştırır.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 8 },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, paddingHorizontal: 20, marginBottom: 16 },
  kpCard: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  kpHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  kpTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  kpRow: { flexDirection: "row", alignItems: "baseline", gap: 12 },
  kpValue: { fontSize: 42, fontFamily: "Inter_700Bold" },
  kpLabel: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  kpTime: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 8 },
  card: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 12 },
  cardText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  alertRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  alertText: { fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 18 },
  alertTime: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  eventRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  eventBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  eventType: { fontSize: 11, fontFamily: "Inter_700Bold" },
  eventNote: { fontSize: 13, fontFamily: "Inter_500Medium" },
  eventTime: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  quietText: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center", paddingVertical: 8 },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 8 },
  comparisonRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16, paddingVertical: 10 },
  comparisonItem: { alignItems: "center" },
  comparisonLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  comparisonValue: { fontSize: 28, fontFamily: "Inter_700Bold" },
  comparisonDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 6 },
});
