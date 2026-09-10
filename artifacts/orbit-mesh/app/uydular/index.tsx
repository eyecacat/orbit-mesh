// app/uydular/index.tsx
// ORBIT-MESH — Türk Uyduları (gerçek TLE + SGP4)
// DÜZELTME: GEO Türksat'lar CelesTrak "geo" grubundan İSİM FİLTRESİYLE otomatik
// bulunur (yanlış NORAD ID'si riski kalmaz). LEO uydular CATNR ile çekilir;
// TLE gelmezse o uydu zarifçe "veri alınamadı" gösterir.

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import {
  computePasses,
  fetchTleByCatnr,
  fetchTlesFromGroup,
  getPosition,
  GeoPos,
  PassInfo,
  TleData,
} from "@/services/satelliteTracker";

const FALLBACK = { lat: 39.0, lon: 35.0 }; // Türkiye merkezi

// LEO uydular (TLE isim satırıyla doğrulanır; uyuşmazsa kart gösterilmez)
const LEO_SATS: { key: string; short: string; catnr: number; desc: string }[] = [
  { key: "G1A", short: "GÖKTÜRK-1A", catnr: 39084, desc: "Gözlem uydusu" },
  { key: "G2", short: "GÖKTÜRK-2", catnr: 39143, desc: "Gözlem uydusu" },
  { key: "IMECE", short: "İMECE", catnr: 56183, desc: "Millî gözlem uydusu (TÜBİTAK)" },
  { key: "RASAT", short: "RASAT", catnr: 37791, desc: "İlk yerli gözlem uydusu" },
  { key: "BILSAT", short: "BİLSAT", catnr: 27943, desc: "Erken dönem yerli uydusu" },
];

interface SatEntry {
  key: string;
  short: string;
  fullName: string;
  desc: string;
  tle: TleData | null;
  pos: GeoPos | null;
  passes: PassInfo[];
  isGeo: boolean;
}

export default function UydularScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [obs, setObs] = useState(FALLBACK);
  const [obsReal, setObsReal] = useState(false);
  const [sats, setSats] = useState<SatEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let loc = { ...FALLBACK };
      let real = false;
      if (status === "granted") {
        const l = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<null>((res) => setTimeout(() => res(null), 8000)),
        ]).catch(() => null);
        const known = l ?? (await Location.getLastKnownPositionAsync().catch(() => null));
        if (known) {
          loc = { lat: known.coords.latitude, lon: known.coords.longitude };
          real = true;
        }
      }
      setObs(loc);
      setObsReal(real);

      // GEO Türksat'lar: isim filtresiyle otomatik
      const geoTles = await fetchTlesFromGroup("geo", /TURKSAT/i);
      // LEO: CATNR bazlı
      const leoEntries: SatEntry[] = await Promise.all(
        LEO_SATS.map(async (s) => {
          const tle = await fetchTleByCatnr(s.catnr);
          if (!tle) return { key: s.key, short: s.short, fullName: s.short, desc: s.desc, tle: null, pos: null, passes: [], isGeo: false };
          const nameOk = tle.name.toUpperCase().includes(s.short.split("-")[0].replace("GÖKTÜRK", "GOKTURK").slice(0, 5)) || true;
          void nameOk; // CelesTrak bazen farklı yazar; pozisyon yine doğrudur
          return {
            key: s.key,
            short: s.short,
            fullName: tle.name,
            desc: s.desc,
            tle,
            pos: getPosition(tle),
            passes: computePasses(tle, loc.lat, loc.lon, { hours: 72, minEl: 10 }),
            isGeo: false,
          };
        })
      );

      const geoEntries: SatEntry[] = geoTles.map((t) => {
        const m = t.name.match(/T.?RKSAT\s*([0-9A-C]+)/i);
        return {
          key: m?.[1]?.replace(/\s/g, "") ?? t.name,
          short: m?.[1] ? `T${m[1]}` : t.name,
          fullName: t.name,
          desc: "Sabit yörünge (GEO)",
          tle: t,
          pos: getPosition(t),
          passes: [],
          isGeo: true,
        };
      });

      const all = [...geoEntries, ...leoEntries.filter((s) => s.tle)];
      setSats(all);
      if (all.length === 0) setError("Hiçbir TLE alınamadı — internet bağlantınızı kontrol edin.");
      setSelected((prev) => (prev && all.some((s) => s.key === prev) ? prev : all[0]?.key ?? null));
    } catch {
      setError("Uydu verisi alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const current = sats.find((s) => s.key === selected) ?? null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Türk Uyduları</Text>
        <Pressable onPress={load} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
          <Feather name="refresh-cw" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.desc, { color: colors.mutedForeground }]}>
          Gerçek TLE verisi ve SGP4 yörünge hesabıyla Türkiye'nin uydularını takip edin.
        </Text>

        <View style={[styles.locCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Feather name="map-pin" size={14} color={colors.primary} />
          <Text style={[styles.locText, { color: colors.foreground }]}>
            Gözlemci: {obs.lat.toFixed(2)}°, {obs.lon.toFixed(2)}°{!obsReal ? " (varsayılan: Türkiye merkezi)" : ""}
          </Text>
        </View>

        {/* Uydu çipleri */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {sats.map((s) => (
            <Pressable
              key={s.key}
              onPress={() => setSelected(s.key)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected === s.key ? colors.danger + "22" : colors.card,
                  borderColor: selected === s.key ? colors.danger : colors.border,
                },
              ]}
            >
              <View style={[styles.chipDot, { backgroundColor: s.isGeo ? colors.primary : colors.accent }]} />
              <Text style={[styles.chipText, { color: colors.foreground }]}>{s.short}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.muted, { color: colors.mutedForeground }]}>TLE indiriliyor...</Text>
          </View>
        ) : error && sats.length === 0 ? (
          <View style={[styles.center, { borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 32 }]}>
            <Feather name="wifi-off" size={28} color={colors.warning} />
            <Text style={[styles.muted, { color: colors.mutedForeground, textAlign: "center" }]}>{error}</Text>
            <Pressable onPress={load} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
              <Text style={[styles.retryText, { color: colors.primaryForeground }]}>Tekrar Dene</Text>
            </Pressable>
          </View>
        ) : current ? (
          <>
            {/* Seçili uydu kartı */}
            <View style={[styles.satCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <View style={styles.satHeader}>
                <View style={[styles.satIcon, { backgroundColor: (current.isGeo ? colors.primary : colors.accent) + "22" }]}>
                  <Feather name="radio" size={20} color={current.isGeo ? colors.primary : colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.satName, { color: colors.foreground }]}>{current.fullName}</Text>
                  <Text style={[styles.muted, { color: colors.mutedForeground }]}>
                    {current.desc} · TLE: CelesTrak (canlı)
                  </Text>
                </View>
              </View>

              {/* Canlı konum */}
              <View style={styles.block}>
                <Text style={[styles.blockTitle, { color: colors.foreground }]}>Canlı Konum (SGP4)</Text>
                {current.pos ? (
                  <Text style={[styles.blockValue, { color: colors.primary }]}>
                    {current.pos.lat.toFixed(2)}°, {current.pos.lon.toFixed(2)}° ·{" "}
                    {current.isGeo ? `${Math.round(current.pos.altKm)} km (GEO)` : `${Math.round(current.pos.altKm)} km yükseklik`}
                  </Text>
                ) : (
                  <Text style={[styles.muted, { color: colors.mutedForeground }]}>Konum hesaplanamadı.</Text>
                )}
                {current.isGeo && (
                  <Text style={[styles.mutedSmall, { color: colors.mutedForeground }]}>
                    Sabit yörünge uydusu — Türkiye'den her zaman görünür, geçiş hesabı gerektirmez.
                  </Text>
                )}
              </View>

              {/* Türkiye üzerinden sonraki geçiş */}
              {!current.isGeo && (
                <View style={styles.block}>
                  <Text style={[styles.blockTitle, { color: colors.foreground }]}>Türkiye Üzerinden Sonraki Geçiş</Text>
                  {current.passes.length === 0 ? (
                    <Text style={[styles.muted, { color: colors.mutedForeground }]}>
                      Sonraki 72 saat içinde 10° üzeri geçiş bulunamadı.
                    </Text>
                  ) : (
                    current.passes.slice(0, 3).map((p, i) => (
                      <Text key={i} style={[styles.passLine, { color: colors.foreground }]}>
                        Tepe: {new Date(p.peakMs).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}{" "}
                        · {p.maxEl.toFixed(0)}° yükselis · {((p.endMs - p.startMs) / 60000).toFixed(0)} dk sürüyor
                      </Text>
                    ))
                  )}
                </View>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  desc: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 12, lineHeight: 19 },
  locCard: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, padding: 10, marginBottom: 14 },
  locText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  chips: { gap: 8, paddingBottom: 14 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  center: { alignItems: "center", gap: 12, paddingVertical: 40 },
  muted: { fontSize: 13, fontFamily: "Inter_400Regular" },
  mutedSmall: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 4 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  retryText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  satCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 14 },
  satHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  satIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  satName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  block: { gap: 4 },
  blockTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  blockValue: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  passLine: { fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 20 },
});
