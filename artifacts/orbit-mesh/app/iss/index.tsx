import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
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

interface Pass {
  start: Date;
  max: Date;
  end: Date;
  maxElevation: number;
  direction: string;
}

const ISS_NORAD = "25544";
// Türkiye ortalaması (Ankara) – cihaz konumu alınamazsa kullanılır
const DEFAULT_LAT = 39.92;
const DEFAULT_LON = 32.85;

export default function IssScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [passes, setPasses] = useState<Pass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [location, setLocation] = useState({ lat: DEFAULT_LAT, lon: DEFAULT_LON });
  const [tle, setTle] = useState<{ line1: string; line2: string; name?: string } | null>(null);

  useEffect(() => {
    void loadLocationAndPasses();
  }, []);

  async function loadLocationAndPasses() {
    try {
      setLoading(true);
      let lat = DEFAULT_LAT;
      let lon = DEFAULT_LON;
      try {
        const LocationModule = await import("expo-location");
        const Location = LocationModule.default;
        const { PermissionStatus } = LocationModule;
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === PermissionStatus.GRANTED) {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
          lat = pos.coords.latitude;
          lon = pos.coords.longitude;
        }
      } catch {
        // Konum izni yoksa varsayılan konum kullan
      }
      setLocation({ lat, lon });

      const res = await fetch(`${BACKEND_URL}/api/satellites/tle?norad=${ISS_NORAD}`);
      if (!res.ok) throw new Error("TLE alınamadı");
      const tleData = await res.json();
      if (!tleData.line1 || !tleData.line2) throw new Error("TLE eksik");
      setTle(tleData);

      const computed = computePasses(tleData.line1, tleData.line2, lat, lon);
      setPasses(computed);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  function computePasses(line1: string, line2: string, lat: number, lon: number): Pass[] {
    const satrec = satellite.twoline2satrec(line1, line2);
    const observerGd = {
      latitude: lat * Math.PI / 180,
      longitude: lon * Math.PI / 180,
      height: 0.05,
    };

    const passes: Pass[] = [];
    const now = new Date();
    const stepMs = 30 * 1000;
    let inPass = false;
    let current: Partial<Pass> = {};

    for (let offset = 0; offset < 7 * 24 * 60 * 60 * 1000; offset += stepMs) {
      const time = new Date(now.getTime() + offset);
      const positionAndVelocity = satellite.propagate(satrec, time);
      if (!positionAndVelocity || typeof positionAndVelocity.position === "boolean") continue;

      const gmst = satellite.gstime(time);
      const positionEci = positionAndVelocity.position as satellite.EciVec3<number>;
      const positionEcf = satellite.eciToEcf(positionEci, gmst);
      const lookAngles = satellite.ecfToLookAngles(observerGd, positionEcf);
      const elevation = (lookAngles.elevation * 180) / Math.PI;

      if (elevation > 10) {
        if (!inPass) {
          inPass = true;
          current = { start: time };
        }
        if (!current.max || elevation > (current.maxElevation || 0)) {
          current.max = time;
          current.maxElevation = elevation;
        }
        current.end = time;
      } else if (inPass) {
        passes.push({
          start: current.start!,
          max: current.max || current.start!,
          end: current.end!,
          maxElevation: Math.round(current.maxElevation || 0),
          direction: "—",
        });
        inPass = false;
        current = {};
        if (passes.length >= 10) break;
      }
    }
    return passes;
  }

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
          <Text style={[styles.title, { color: colors.foreground }]}>ISS Geçiş Takibi</Text>
          <Pressable onPress={loadLocationAndPasses} style={styles.backBtn}>
            <Feather name="refresh-cw" size={20} color={colors.primary} />
          </Pressable>
        </View>

        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Uluslararası Uzay İstasyonu’nun gökyüzünde görünür geçişleri gerçek zamanlı hesaplanır.
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.konumRow}>
            <Feather name="map-pin" size={16} color={colors.primary} />
            <Text style={[styles.konumText, { color: colors.mutedForeground }]}>
              Konum: {location.lat.toFixed(2)}°, {location.lon.toFixed(2)}°
            </Text>
          </View>
          {tle?.name && (
            <Text style={[styles.tleName, { color: colors.foreground }]}>{tle.name}</Text>
          )}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 40 }} />
        ) : error ? (
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
            ISS verisi alınamadı. Konum izni ve internet bağlantınızı kontrol edin.
          </Text>
        ) : passes.length === 0 ? (
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
            Önümüzdeki 7 günde görünür ISS geçişi bulunamadı.
          </Text>
        ) : (
          passes.map((pass, idx) => (
            <View key={idx} style={[styles.passCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.passHeader}>
                <Feather name="activity" size={18} color={colors.primary} />
                <Text style={[styles.passTitle, { color: colors.foreground }]}>
                  Geçiş #{idx + 1}
                </Text>
              </View>
              <Text style={[styles.passDetail, { color: colors.mutedForeground }]}>
                Başlangıç: {pass.start.toLocaleString("tr-TR")}
              </Text>
              <Text style={[styles.passDetail, { color: colors.mutedForeground }]}>
                Zirve: {pass.max.toLocaleString("tr-TR")} – {pass.maxElevation}° yükseklik
              </Text>
              <Text style={[styles.passDetail, { color: colors.mutedForeground }]}>
                Bitiş: {pass.end.toLocaleString("tr-TR")}
              </Text>
            </View>
          ))
        )}
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
    marginBottom: 20,
  },
  card: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  konumRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  konumText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  tleName: { fontSize: 13, fontFamily: "Inter_700Bold", marginTop: 8 },
  passCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  passHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  passTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  passDetail: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 4 },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 40,
    paddingHorizontal: 20,
  },
});
