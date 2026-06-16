import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface SolarFlare {
  flrID: string;
  beginTime: string;
  peakTime?: string;
  endTime?: string;
  classType: string;
  sourceLocation?: string;
  activeRegionNum?: number;
  note?: string;
}

interface GST {
  gstID: string;
  startTime: string;
  allKpIndex?: Array<{ observedTime: string; kpIndex: number }>;
}

export default function HelioScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [flares, setFlares] = useState<SolarFlare[]>([]);
  const [gsts, setGsts] = useState<GST[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true); setError(false);
    try {
      const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const end = new Date().toISOString().split("T")[0];
      const [f, g] = await Promise.all([
        fetch(`https://api.nasa.gov/DONKI/FLR?startDate=${start}&endDate=${end}&api_key=DEMO_KEY`),
        fetch(`https://api.nasa.gov/DONKI/GST?startDate=${start}&endDate=${end}&api_key=DEMO_KEY`),
      ]);
      if (f.ok) setFlares(await f.json());
      if (g.ok) setGsts(await g.json());
    } catch { setError(true); }
    finally { setLoading(false); }
  }

  const flareClass = (c: string) => {
    if (c.startsWith("X")) return { bg: colors.danger + "33", text: colors.danger };
    if (c.startsWith("M")) return { bg: colors.warning + "33", text: colors.warning };
    return { bg: colors.primary + "22", text: colors.primary };
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>HELIO Gözlemevi</Text>
        <Pressable onPress={fetchData} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Feather name="refresh-cw" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* VLF Status */}
        <View style={[styles.vlfCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.vlfHeader}>
            <Feather name="radio" size={18} color={colors.primary} />
            <Text style={[styles.vlfTitle, { color: colors.foreground }]}>VLF Sinyal Durumu</Text>
          </View>
          <View style={[styles.vlfStatus, { backgroundColor: colors.warning + "22", borderColor: colors.warning + "44" }]}>
            <Feather name="clock" size={14} color={colors.warning} />
            <Text style={[styles.vlfStatusText, { color: colors.warning }]}>Donanım Bekleniyor — Deneyap Kart Bağlantısı Gerekli</Text>
          </View>
          <Text style={[styles.vlfDesc, { color: colors.mutedForeground }]}>
            Gerçek VLF sinyal verisi için Deneyap Kart'ı BLE üzerinden bağlayın.
            Schumann rezonansı (7.83 Hz) ve atmosferik VLF sinyalleri izlenecek.
          </Text>
        </View>

        {/* NASA Solar Flares */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Güneş Patlamaları (Son 30 Gün)</Text>
          <Text style={[styles.sourceLabel, { color: colors.primary }]}>NASA DONKI</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
        ) : error ? (
          <View style={[styles.errorCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="wifi-off" size={24} color={colors.mutedForeground} />
            <Text style={[styles.errorText, { color: colors.mutedForeground }]}>NASA DONKI verisi alınamadı</Text>
            <Pressable style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={fetchData}>
              <Text style={[styles.retryText, { color: colors.background }]}>Tekrar Dene</Text>
            </Pressable>
          </View>
        ) : flares.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="sun" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Bu dönemde patlama kaydedilmedi</Text>
          </View>
        ) : (
          flares.map(f => {
            const cls = flareClass(f.classType);
            return (
              <View key={f.flrID} style={[styles.flareCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.flareTop}>
                  <View style={[styles.classBadge, { backgroundColor: cls.bg }]}>
                    <Text style={[styles.classText, { color: cls.text }]}>{f.classType}</Text>
                  </View>
                  {f.sourceLocation && (
                    <Text style={[styles.location, { color: colors.mutedForeground }]}>{f.sourceLocation}</Text>
                  )}
                </View>
                <View style={styles.flareRow}>
                  <Feather name="clock" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.flareTime, { color: colors.mutedForeground }]}>
                    {new Date(f.beginTime).toLocaleString("tr-TR")}
                  </Text>
                </View>
                {f.activeRegionNum && (
                  <Text style={[styles.region, { color: colors.primary }]}>Aktif Bölge: AR{f.activeRegionNum}</Text>
                )}
              </View>
            );
          })
        )}

        {/* Geomagnetic Storms */}
        {!loading && !error && gsts.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 24 }]}>Jeomanyetik Fırtınalar</Text>
            {gsts.map(g => (
              <View key={g.gstID} style={[styles.gstCard, { backgroundColor: colors.card, borderColor: colors.danger + "44" }]}>
                <View style={styles.gstTop}>
                  <Feather name="zap" size={16} color={colors.danger} />
                  <Text style={[styles.gstTime, { color: colors.foreground }]}>
                    {new Date(g.startTime).toLocaleDateString("tr-TR")}
                  </Text>
                </View>
                {g.allKpIndex && g.allKpIndex.length > 0 && (
                  <Text style={[styles.kp, { color: colors.warning }]}>
                    Maks Kp: {Math.max(...g.allKpIndex.map(k => k.kpIndex))}
                  </Text>
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  vlfCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 24, gap: 12 },
  vlfHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  vlfTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  vlfStatus: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, padding: 10 },
  vlfStatusText: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  vlfDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  sourceLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  flareCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, gap: 6 },
  flareTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  classBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  classText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  location: { fontSize: 12, fontFamily: "Inter_500Medium" },
  flareRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  flareTime: { fontSize: 12, fontFamily: "Inter_400Regular" },
  region: { fontSize: 12, fontFamily: "Inter_500Medium" },
  gstCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  gstTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  gstTime: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  kp: { fontSize: 13, fontFamily: "Inter_500Medium" },
  errorCard: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: "center", gap: 12 },
  errorText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  retryText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  emptyCard: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: "center", gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
