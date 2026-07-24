import { Feather } from "@expo/vector-icons";
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
import * as satellite from "satellite.js";

import { useColors } from "@/hooks/useColors";
import { BACKEND_URL } from "@/lib/env";

interface TurkishSatellite {
  id: string;
  name: string;
  shortName: string;
  norad: string;
  purpose: string;
  launched: string;
  operator: string;
  color: string;
}

interface TleData {
  norad: string;
  name?: string;
  line1: string;
  line2: string;
  fetchedAt: string;
}

interface SatellitePass {
  start: Date;
  maxElevation: number;
  durationMinutes: number;
}

interface SatelliteState {
  tle: TleData | null;
  loading: boolean;
  error: boolean;
  current: { lat: number; lon: number; alt: number } | null;
  nextPass: SatellitePass | null;
}

const TURKISH_SATELLITES: TurkishSatellite[] = [
  {
    id: "turksat-5a",
    name: "TÜRKSAT 5A",
    shortName: "T5A",
    norad: "47306",
    purpose: "Haberleşme uydusu",
    launched: "2021",
    operator: "Türksat",
    color: "#FF4560",
  },
  {
    id: "turksat-5b",
    name: "TÜRKSAT 5B",
    shortName: "T5B",
    norad: "50212",
    purpose: "Haberleşme uydusu",
    launched: "2022",
    operator: "Türksat",
    color: "#FF4560",
  },
  {
    id: "turksat-6a",
    name: "TÜRKSAT 6A",
    shortName: "T6A",
    norad: "60233",
    purpose: "Milli haberleşme uydusu",
    launched: "2024",
    operator: "Türksat / TAI",
    color: "#FF4560",
  },
  {
    id: "gokturk-1a",
    name: "GÖKTÜRK-1A",
    shortName: "G1A",
    norad: "41875",
    purpose: "Keşif/gözlem uydusu",
    launched: "2016",
    operator: "TAI / MSB",
    color: "#38C8FF",
  },
  {
    id: "gokturk-2",
    name: "GÖKTÜRK-2",
    shortName: "G2",
    norad: "39030",
    purpose: "Yer gözlem uydusu",
    launched: "2012",
    operator: "TAI / MSB",
    color: "#00E5B0",
  },
  {
    id: "rasat",
    name: "RASAT",
    shortName: "RASAT",
    norad: "37791",
    purpose: "Yer gözlem uydusu",
    launched: "2011",
    operator: "TÜBİTAK UZAY",
    color: "#8B5CF6",
  },
];

// Türkiye ortalaması (Konya / Ankara arası). Cihaz konumu yoksa kullanılır.
const DEFAULT_OBSERVER = { lat: 39.0, lon: 35.0, alt: 1000 };

function calculatePass(
  satrec: satellite.SatRec,
  observer: { lat: number; lon: number; alt: number },
  from: Date,
  hours = 72,
  stepMinutes = 2
): SatellitePass | null {
  const deg2rad = Math.PI / 180;
  const observerGeodetic = {
    latitude: observer.lat * deg2rad,
    longitude: observer.lon * deg2rad,
    height: observer.alt / 1000,
  };

  let start: Date | null = null;
  let maxEl = 0;

  for (let m = 0; m <= hours * 60; m += stepMinutes) {
    const time = new Date(from.getTime() + m * 60 * 1000);
    const pv = satellite.propagate(satrec, time);
    if (!pv || !pv.position) continue;

    const ecf = satellite.eciToEcf(pv.position, satellite.gstime(time));
    const look = satellite.ecfToLookAngles(observerGeodetic, ecf);
    const elevation = look.elevation * (180 / Math.PI);

    if (elevation > 0) {
      if (!start) start = time;
      if (elevation > maxEl) maxEl = elevation;
    } else if (start) {
      const duration = (time.getTime() - start.getTime()) / 60000;
      if (duration > 2) {
        return { start, maxElevation: maxEl, durationMinutes: Math.round(duration) };
      }
      start = null;
      maxEl = 0;
    }
  }
  return null;
}

function calculateCurrentPosition(
  satrec: satellite.SatRec,
  date = new Date()
): { lat: number; lon: number; alt: number } | null {
  const pv = satellite.propagate(satrec, date);
  if (!pv || !pv.position) return null;

  const gmst = satellite.gstime(date);
  const gd = satellite.eciToGeodetic(pv.position, gmst);
  return {
    lat: satellite.degreesLat(gd.latitude),
    lon: satellite.degreesLong(gd.longitude),
    alt: gd.height,
  };
}

export default function UydularScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<TurkishSatellite>(TURKISH_SATELLITES[0]);
  const [state, setState] = useState<SatelliteState>({
    tle: null,
    loading: true,
    error: false,
    current: null,
    nextPass: null,
  });
  const [observer, setObserver] = useState(DEFAULT_OBSERVER);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    void fetchTle(selected.norad);
  }, [selected]);

  useEffect(() => {
    if (state.tle) {
      try {
        const satrec = satellite.twoline2satrec(state.tle.line1, state.tle.line2);
        const current = calculateCurrentPosition(satrec);
        const nextPass = calculatePass(satrec, observer, new Date());
        setState(prev => ({ ...prev, current, nextPass }));
      } catch {
        setState(prev => ({ ...prev, error: true }));
      }
    }
  }, [state.tle, observer]);

  async function fetchTle(norad: string) {
    setState(prev => ({ ...prev, loading: true, error: false, tle: null, current: null, nextPass: null }));
    try {
      const res = await fetch(`${BACKEND_URL}/api/satellites/tle?norad=${norad}`);
      if (!res.ok) throw new Error("TLE alinamadi");
      const tle = (await res.json()) as TleData;
      setState(prev => ({ ...prev, tle, loading: false }));
    } catch (error) {
      setState(prev => ({ ...prev, loading: false, error: true }));
    }
  }

  const isOverTurkey = useMemo(() => {
    if (!state.current) return false;
    const { lat, lon } = state.current;
    return lat >= 36 && lat <= 42 && lon >= 26 && lon <= 45;
  }, [state.current]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="chevron-left" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>Türk Uyduları</Text>
          <View style={{ width: 32 }} />
        </View>

        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Gerçek TLE verisi ve SGP4 yörünge hesabıyla Türkiye'nin uydularını takip edin.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.satList}
        >
          {TURKISH_SATELLITES.map(sat => {
            const active = sat.id === selected.id;
            return (
              <Pressable
                key={sat.id}
                onPress={() => setSelected(sat)}
                style={[
                  styles.satChip,
                  {
                    backgroundColor: active ? sat.color + "22" : colors.card,
                    borderColor: active ? sat.color : colors.border,
                  },
                ]}
              >
                <View style={[styles.satDot, { backgroundColor: sat.color }]} />
                <Text style={[styles.satChipText, { color: active ? sat.color : colors.foreground }]}>
                  {sat.shortName}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: selected.color + "18" }]}>
              <Feather name="radio" size={20} color={selected.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.satName, { color: colors.foreground }]}>{selected.name}</Text>
              <Text style={[styles.satMeta, { color: colors.mutedForeground }]}>
                {selected.purpose} · NORAD {selected.norad}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailCell}>
              <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>İşletici</Text>
              <Text style={[styles.detailValue, { color: colors.foreground }]}>{selected.operator}</Text>
            </View>
            <View style={styles.detailCell}>
              <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Fırlatılma</Text>
              <Text style={[styles.detailValue, { color: colors.foreground }]}>{selected.launched}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Canlı Konum</Text>
          {state.loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
          ) : state.error || !state.current ? (
            <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
              Konum verisi hesaplanamadi — TLE proxy'sini kontrol edin.
            </Text>
          ) : (
            <>
              <View style={styles.posRow}>
                <View style={styles.posCell}>
                  <Text style={[styles.posValue, { color: colors.foreground }]}>
                    {state.current.lat.toFixed(2)}°
                  </Text>
                  <Text style={[styles.posLabel, { color: colors.mutedForeground }]}>Enlem</Text>
                </View>
                <View style={styles.posCell}>
                  <Text style={[styles.posValue, { color: colors.foreground }]}>
                    {state.current.lon.toFixed(2)}°
                  </Text>
                  <Text style={[styles.posLabel, { color: colors.mutedForeground }]}>Boylam</Text>
                </View>
                <View style={styles.posCell}>
                  <Text style={[styles.posValue, { color: colors.foreground }]}>
                    {state.current.alt.toFixed(0)} km
                  </Text>
                  <Text style={[styles.posLabel, { color: colors.mutedForeground }]}>Yükseklik</Text>
                </View>
              </View>

              <View
                style={[
                  styles.regionBadge,
                  {
                    backgroundColor: isOverTurkey ? colors.accent + "22" : colors.warning + "22",
                    borderColor: isOverTurkey ? colors.accent + "44" : colors.warning + "44",
                  },
                ]}
              >
                <Feather
                  name={isOverTurkey ? "check-circle" : "globe"}
                  size={14}
                  color={isOverTurkey ? colors.accent : colors.warning}
                />
                <Text style={[styles.regionText, { color: isOverTurkey ? colors.accent : colors.warning }]}>
                  {isOverTurkey ? "Şu an Türkiye üzerinde" : "Türkiye üzerinde değil"}
                </Text>
              </View>
            </>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Türkiye Üzerinden Sonraki Geçiş</Text>
          {state.loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
          ) : !state.nextPass ? (
            <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
              Sonraki 72 saat içinde geçiş bulunamadi veya TLE yüklenemedi.
            </Text>
          ) : (
            <>
              <View style={styles.passRow}>
                <Feather name="clock" size={18} color={colors.primary} />
                <Text style={[styles.passValue, { color: colors.foreground }]}>
                  {state.nextPass.start.toLocaleString("tr-TR", {
                    day: "2-digit",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
              <View style={styles.passRow}>
                <Feather name="arrow-up" size={18} color={colors.accent} />
                <Text style={[styles.passValue, { color: colors.foreground }]}>
                  Maksimum yükseklik: {state.nextPass.maxElevation.toFixed(1)}°
                </Text>
              </View>
              <View style={styles.passRow}>
                <Feather name="watch" size={18} color={colors.warning} />
                <Text style={[styles.passValue, { color: colors.foreground }]}>
                  Süre: ~{state.nextPass.durationMinutes} dk
                </Text>
              </View>
            </>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Gözlemci Konumu</Text>
          <Text style={[styles.cardText, { color: colors.mutedForeground }]}>
            Varsayılan: Türkiye merkezi ({observer.lat}°N, {observer.lon}°E). Gelecekte cihaz konumu
            entegrasyonu eklenebilir.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  satList: { paddingHorizontal: 20, gap: 10, paddingBottom: 8 },
  satChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  satDot: { width: 8, height: 8, borderRadius: 4 },
  satChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  card: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  satName: { fontSize: 17, fontFamily: "Inter_700Bold" },
  satMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  detailRow: { flexDirection: "row", gap: 16 },
  detailCell: { flex: 1 },
  detailLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginBottom: 2 },
  detailValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 12 },
  cardText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  posRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  posCell: { flex: 1, alignItems: "center", gap: 4 },
  posValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  posLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  regionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  regionText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  passRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  passValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 8 },
});
