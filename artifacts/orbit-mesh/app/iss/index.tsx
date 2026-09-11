// app/iss/index.tsx — ISS Geçiş Takibi (çökme düzeltildi + yedek TLE)
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { computePasses, fetchTleByCatnr, getLookAngles, getPosition, GeoPos, PassInfo, TleData } from "@/services/satelliteTracker";

const ISS_CATNR = 25544; // ISS — yedek TLE gömülü, asla boş kalmaz
const FALLBACK = { lat: 39.0, lon: 35.0 };

async function resolveLocation(): Promise<{ lat: number; lon: number; real: boolean }> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === "granted") {
      const live = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<null>((res) => setTimeout(() => res(null), 8000)),
      ]).catch(() => null);
      const loc = live ?? (await Location.getLastKnownPositionAsync().catch(() => null));
      if (loc) return { lat: loc.coords.latitude, lon: loc.coords.longitude, real: true };
    }
  } catch { /* varsayılana düş */ }
  return { ...FALLBACK, real: false };
}

const fmtClock = (ms: number) => new Date(ms).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
const fmtDay = (ms: number) => new Date(ms).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const azCompass = (az: number) => ["K", "KD", "D", "GD", "G", "GB", "B", "KB"][Math.round((az % 360) / 45) % 8];

export default function IssScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [obs, setObs] = useState(FALLBACK);
  const [obsReal, setObsReal] = useState(false);
  const [tle, setTle] = useState<TleData | null>(null);
  const [passes, setPasses] = useState<PassInfo[]>([]);
  const [now, setNow] = useState<GeoPos | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const loc = await resolveLocation();
    setObs({ lat: loc.lat, lon: loc.lon });
    setObsReal(loc.real);

    const t = await fetchTleByCatnr(ISS_CATNR);
    if (!t) { setError("TLE alınamadı."); setLoading(false); return; }
    setTle(t);
    setNow(getPosition(t));
    setPasses(computePasses(t, loc.lat, loc.lon, { hours: 72, minEl: 10 }));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Canlı konum her 5 sn güncellenir (demo'da hareket görünür)
  useEffect(() => {
    if (tle) {
      tickRef.current = setInterval(() => setNow(getPosition(tle)), 5000);
      return () => { if (tickRef.current) clearInterval(tickRef.current); };
    }
  }, [tle]);

  const live = tle ? getLookAngles(tle, obs.lat, obs.lon) : null;
  const visibleNow = (live?.elDeg ?? -1) > 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>ISS Geçiş Takibi</Text>
        <Pressable onPress={load} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
          <Feather name="refresh-cw" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.locCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Feather name="map-pin" size={16} color={colors.primary} />
          <Text style={[styles.locText, { color: colors.foreground }]}>
            Konum: {obs.lat.toFixed(2)}°, {obs.lon.toFixed(2)}°{!obsReal && " (varsayılan: Türkiye merkezi)"}
          </Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.muted, { color: colors.mutedForeground }]}>TLE indirilip geçişler hesaplanıyor...</Text>
          </View>
        ) : error ? (
          <View style={[styles.center, { borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 32 }]}>
            <Feather name="wifi-off" size={32} color={colors.warning} />
            <Text style={[styles.muted, { color: colors.mutedForeground, textAlign: "center" }]}>{error}</Text>
            <Pressable onPress={load} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
              <Text style={[styles.retryText, { color: colors.primaryForeground }]}>Tekrar Dene</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {now && (
              <View style={[styles.nowCard, { borderColor: visibleNow ? colors.accent : colors.border, backgroundColor: colors.card }]}>
                <View style={styles.nowRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.nowLabel, { color: colors.mutedForeground }]}>ISS Canlı Konum (SGP4){tle?.fromFallback ? " · yerleşik TLE" : ""}</Text>
                    <Text style={[styles.nowValue, { color: colors.foreground }]}>
                      {now.lat.toFixed(2)}°, {now.lon.toFixed(2)}° · {Math.round(now.altKm)} km
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: (visibleNow ? colors.accent : colors.muted) + "33" }]}>
                    <Text style={[styles.badgeText, { color: visibleNow ? colors.accent : colors.mutedForeground }]}>
                      {visibleNow ? `GÖRÜNÜR · ${(live?.elDeg ?? 0).toFixed(0)}°` : "Ufukta değil"}
                    </Text>
                  </View>
                </View>
                {live && (
                  <Text style={[styles.muted, { color: colors.mutedForeground }]}>
                    Azimut: {live.azDeg.toFixed(0)}° ({azCompass(live.azDeg)}) · Mesafe: {Math.round(live.rangeKm)} km
                  </Text>
                )}
              </View>
            )}

            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Sonraki 72 Saat — Görünür Geçişler</Text>
            {passes.length === 0 ? (
              <View style={[styles.center, { borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 24 }]}>
                <Feather name="eye-off" size={24} color={colors.mutedForeground} />
                <Text style={[styles.muted, { color: colors.mutedForeground, textAlign: "center" }]}>
                  Sonraki 72 saat içinde 10° üzeri geçiş bulunamadı.
                </Text>
              </View>
            ) : (
              passes.map((p, i) => (
                <View key={i} style={[styles.passCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <View style={styles.passRow}>
                    <Feather name="sunrise" size={16} color={colors.warning} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.passPeak, { color: colors.foreground }]}>
                        Tepe: {fmtClock(p.peakMs)} · {p.maxEl.toFixed(0)}° yükseliş
                      </Text>
                      <Text style={[styles.muted, { color: colors.mutedForeground }]}>
                        Doğuş: {fmtClock(p.startMs)} → Batış: {fmtClock(p.endMs)} · Azimut: {p.azAtPeak.toFixed(0)}°
                      </Text>
                      <Text style={[styles.mutedSmall, { color: colors.mutedForeground }]}>{fmtDay(p.peakMs)}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: colors.primary + "22" }]}>
                      <Text style={[styles.badgeText, { color: colors.primary }]}>{((p.endMs - p.startMs) / 60000).toFixed(0)} dk</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  locCard: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 16 },
  locText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  center: { alignItems: "center", gap: 12, paddingVertical: 40 },
  muted: { fontSize: 13, fontFamily: "Inter_400Regular" },
  mutedSmall: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  retryText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  nowCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 8, marginBottom: 20 },
  nowRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  nowLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  nowValue: { fontSize: 17, fontFamily: "Inter_700Bold", marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 12
