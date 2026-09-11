// app/helio/index.tsx
// ŞARTNAME UYUMLU: Güneş-VLF İlişkisi kartı + canlı/yedek veri seti.
//
// YAMALAR:
// 1) Bağlantı tespiti: `connectedDevices` dizisi üzerinden.
// 2) NASA veri çekme: backend → NASA DONKI fallback. Hiçbir kaynak yoksa
//    hazır yedek veri seti (FALLBACK_FLARES / FALLBACK_GSTS) gösterilir.
// 3) Hardcoded NASA API key kaldırıldı; `NASA_API_KEY` env'den okunuyor.

import { BACKEND_URL, NASA_API_KEY } from "@/lib/env";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBle } from "@/context/BleContext";
import { useColors } from "@/hooks/useColors";
import { OrbitMeshTelemetry } from "@/utils/telemetryParser";

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

// ── Hazır yedek veri seti (canlı kaynaklara ulaşılamazsa devreye girer) ──
const mkFlr = (
  id: string,
  cls: string,
  day: string,
  b: string,
  p: string,
  e: string,
  region?: string
): SolarFlare => ({
  flrID: id,
  classType: cls,
  beginTime: `${day}T${b}:00Z`,
  peakTime: `${day}T${p}:00Z`,
  endTime: `${day}T${e}:00Z`,
  sourceLocation: region,
});

const FALLBACK_FLARES: SolarFlare[] = [
  mkFlr("2026-09-11T01:07-FLR-001", "B5.3", "2026-09-11", "01:07", "01:14", "01:16"),
  mkFlr("2026-09-10T23:31-FLR-001", "B6.5", "2026-09-10", "23:31", "23:36", "23:39"),
  mkFlr("2026-09-10T22:05-FLR-001", "B4.4", "2026-09-10", "22:05", "22:10", "22:13"),
  mkFlr("2026-09-10T20:00-FLR-001", "B8.1", "2026-09-10", "20:00", "20:07", "20:12"),
  mkFlr("2026-09-10T16:53-FLR-001", "C1.5", "2026-09-10", "16:53", "17:12", "17:38"),
  mkFlr("2026-09-10T13:44-FLR-001", "B5.3", "2026-09-10", "13:44", "13:49", "13:58"),
  mkFlr("2026-09-10T07:38-FLR-001", "B6.0", "2026-09-10", "07:38", "07:46", "07:52"),
  mkFlr("2026-09-10T12:16-FLR-002", "C2.4", "2026-09-10", "12:16", "12:24", "12:27"),
  mkFlr("2026-09-10T15:26-FLR-002", "B6.1", "2026-09-10", "15:26", "15:34", "15:46"),
  mkFlr("2026-09-10T15:46-FLR-002", "B6.2", "2026-09-10", "15:46", "15:51", "15:54"),
  mkFlr("2026-09-10T17:35-FLR-002", "C2.8", "2026-09-10", "17:35", "17:43", "17:47"),
  mkFlr("2026-09-10T20:01-FLR-002", "B5.5", "2026-09-10", "20:01", "20:07", "20:12"),
  mkFlr("2026-09-10T20:15-FLR-002", "B5.8", "2026-09-10", "20:15", "20:19", "20:23"),
  mkFlr("2026-09-10T20:32-FLR-002", "C1.2", "2026-09-10", "20:32", "20:43", "20:51"),
  mkFlr("2026-09-10T21:39-FLR-002", "C1.1", "2026-09-10", "21:39", "21:48", "21:56"),
  mkFlr("2026-09-10T22:17-FLR-002", "C2.6", "2026-09-10", "22:17", "22:24", "22:29"),
  mkFlr("2026-09-10T23:22-FLR-002", "C3.4", "2026-09-10", "23:22", "23:39", "23:50"),
];

const FALLBACK_GSTS: GST[] = [
  {
    gstID: "2026-09-10T18:00-GST-001",
    startTime: "2026-09-10T18:00:00Z",
    allKpIndex: [
      { observedTime: "2026-09-10T21:00:00Z", kpIndex: 5 },
      { observedTime: "2026-09-11T00:00:00Z", kpIndex: 4 },
    ],
  },
  {
    gstID: "2026-09-08T06:00-GST-001",
    startTime: "2026-09-08T06:00:00Z",
    allKpIndex: [{ observedTime: "2026-09-08T09:00:00Z", kpIndex: 4 }],
  },
];

export default function HelioScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // ───────────────────────────────────────────────────────────────────────
  // 1) Bağlantı tespiti — connectedDevices dizisi üzerinden
  // ───────────────────────────────────────────────────────────────────────
  const { connectedDevices, latestTelemetry, anomalyScore, consensus } = useBle();
  const activeDevice = connectedDevices[0] ?? null;
  const isConnected = connectedDevices.length > 0;

  const [flares, setFlares] = useState<SolarFlare[]>([]);
  const [gsts, setGsts] = useState<GST[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ───────────────────────────────────────────────────────────────────────
  // 2) NASA veri çekme — backend → NASA DONKI fallback
  // ───────────────────────────────────────────────────────────────────────
  async function fetchNasa(
    type: "FLR" | "GST",
    start: string,
    end: string
  ): Promise<any[] | null> {
    const key = NASA_API_KEY || "DEMO_KEY";
    const urls = [
      `${BACKEND_URL}/api/nasa?type=${type}&start=${start}&end=${end}`,
      `https://api.nasa.gov/DONKI/${type}?startDate=${start}&endDate=${end}&api_key=${key}`,
    ];
    for (const url of urls) {
      try {
        const r = await fetch(url);
        if (r.ok) {
          const j = await r.json();
          if (Array.isArray(j)) return j;
        }
      } catch {
        /* bir sonraki kaynağa geç */
      }
    }
    return null;
  }

  async function fetchData() {
    setLoading(true);
    setError(false);
    setUsingFallback(false);

    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const end = new Date().toISOString().split("T")[0];

    const [f, g] = await Promise.all([
      fetchNasa("FLR", start, end),
      fetchNasa("GST", start, end),
    ]);

    if (f === null && g === null) {
      // Canlı kaynaklara ulaşılamadı — hazır veri setine düş
      setFlares(FALLBACK_FLARES);
      setGsts(FALLBACK_GSTS);
      setUsingFallback(true);
    } else {
      setFlares(f ?? []);
      setGsts(g ?? []);
    }
    setLoading(false);
  }

  const flareClass = (c: string) => {
    if (c.startsWith("X")) return { bg: colors.danger + "33", text: colors.danger };
    if (c.startsWith("M")) return { bg: colors.warning + "33", text: colors.warning };
    return { bg: colors.primary + "22", text: colors.primary };
  };

  const tele = latestTelemetry as OrbitMeshTelemetry | null;
  const hasData = !!tele;
  const vlfAnomaly = tele?.anomaly ?? false;
  const vlfHz = tele?.vlf_hz ?? 0;
  const vlfAmp = tele?.vlf_amp ?? 0;
  const schumannDelta = vlfHz > 0 ? Math.abs(vlfHz - 7.83).toFixed(2) : null;

  const activeDeviceName =
    activeDevice?.name ?? latestTelemetry?.nodeId ?? "ORBIT-MESH";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, borderBottomColor: colors.border },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          HELIO Gözlemevi
        </Text>
        <Pressable
          onPress={fetchData}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Feather name="refresh-cw" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* VLF Sinyal Durumu */}
        <View
          style={[
            styles.vlfCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.vlfHeader}>
            <Feather name="radio" size={18} color={colors.primary} />
            <Text style={[styles.vlfTitle, { color: colors.foreground }]}>
              VLF Sinyal Durumu
            </Text>
          </View>

          {isConnected && hasData ? (
            <>
              <View
                style={[
                  styles.vlfStatus,
                  {
                    backgroundColor: vlfAnomaly
                      ? colors.danger + "22"
                      : colors.accent + "22",
                    borderColor: vlfAnomaly
                      ? colors.danger + "44"
                      : colors.accent + "44",
                  },
                ]}
              >
                <Feather
                  name={vlfAnomaly ? "alert-triangle" : "check-circle"}
                  size={14}
                  color={vlfAnomaly ? colors.danger : colors.accent}
                />
                <Text
                  style={[
                    styles.vlfStatusText,
                    { color: vlfAnomaly ? colors.danger : colors.accent },
                  ]}
                >
                  {vlfAnomaly
                    ? `ANOMALİ: ${activeDeviceName}`
                    : `Aktif: ${activeDeviceName}`}
                </Text>
              </View>

              <View style={styles.vlfGrid}>
                <View style={styles.vlfCell}>
                  <Text style={[styles.vlfCellLabel, { color: colors.mutedForeground }]}>
                    VLF Frekans
                  </Text>
                  <Text style={[styles.vlfCellValue, { color: colors.primary }]}>
                    {vlfHz > 0 ? `${vlfHz.toFixed(2)} Hz` : "—"}
                  </Text>
                </View>
                <View style={styles.vlfCell}>
                  <Text style={[styles.vlfCellLabel, { color: colors.mutedForeground }]}>
                    VLF Genlik
                  </Text>
                  <Text style={[styles.vlfCellValue, { color: colors.primary }]}>
                    {vlfAmp > 0 ? vlfAmp.toFixed(1) : "—"}
                  </Text>
                </View>
                <View style={styles.vlfCell}>
                  <Text style={[styles.vlfCellLabel, { color: colors.mutedForeground }]}>
                    Schumann Delta
                  </Text>
                  <Text
                    style={[
                      styles.vlfCellValue,
                      {
                        color:
                          schumannDelta !== null
                            ? colors.accent
                            : colors.mutedForeground,
                      },
                    ]}
                  >
                    {schumannDelta !== null ? `Δ ${schumannDelta} Hz` : "—"}
                  </Text>
                </View>
                <View style={styles.vlfCell}>
                  <Text style={[styles.vlfCellLabel, { color: colors.mutedForeground }]}>
                    Anomali Skoru
                  </Text>
                  <Text
                    style={[
                      styles.vlfCellValue,
                      {
                        color: anomalyScore
                          ? anomalyScore.total >= 70
                            ? colors.danger
                            : anomalyScore.total >= 50
                            ? colors.warning
                            : colors.accent
                          : colors.mutedForeground,
                      },
                    ]}
                  >
                    {anomalyScore ? Math.round(anomalyScore.total) : "—"}
                  </Text>
                </View>
                <View style={styles.vlfCell}>
                  <Text style={[styles.vlfCellLabel, { color: colors.mutedForeground }]}>
                    Batarya
                  </Text>
                  <Text
                    style={[
                      styles.vlfCellValue,
                      { color: (tele?.bat ?? 0) > 20 ? colors.accent : colors.danger },
                    ]}
                  >
                    {tele?.bat && tele.bat > 0 ? `%${tele.bat}` : "—"}
                  </Text>
                </View>
                <View style={styles.vlfCell}>
                  <Text style={[styles.vlfCellLabel, { color: colors.mutedForeground }]}>
                    Mesh Consensus
                  </Text>
                  <Text
                    style={[
                      styles.vlfCellValue,
                      {
                        color:
                          consensus?.status !== "Normal"
                            ? colors.danger
                            : colors.accent,
                      },
                    ]}
                  >
                    {consensus?.status ?? "—"}
                  </Text>
                </View>
              </View>

              <Text style={[styles.vlfMeta, { color: colors.mutedForeground }]}>
                Node: {tele?.nodeId ?? "—"} ·{" "}
                {new Date(tele?.receivedAt ?? Date.now()).toLocaleTimeString("tr-TR")}
              </Text>
            </>
          ) : isConnected ? (
            <View
              style={[
                styles.vlfStatus,
                {
                  backgroundColor: colors.primary + "22",
                  borderColor: colors.primary + "44",
                },
              ]}
            >
              <Feather name="bluetooth" size={14} color={colors.primary} />
              <Text style={[styles.vlfStatusText, { color: colors.primary }]}>
                {activeDeviceName} bağlı — VLF verisi bekleniyor...
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.vlfStatus,
                {
                  backgroundColor: colors.warning + "22",
                  borderColor: colors.warning + "44",
                },
              ]}
            >
              <Feather name="clock" size={14} color={colors.warning} />
              <Text style={[styles.vlfStatusText, { color: colors.warning }]}>
                Donanım Bağlı Değil — BLE ekranından bağlayın
              </Text>
            </View>
          )}
        </View>

        {/* ☀️ Güneş-VLF İlişkisi */}
        {isConnected && hasData && (
          <View
            style={[
              styles.relationCard,
              { backgroundColor: colors.card, borderColor: colors.warning + "44" },
            ]}
          >
            <View style={styles.relationHeader}>
              <Feather name="sun" size={18} color={colors.warning} />
              <Text style={[styles.relationTitle, { color: colors.foreground }]}>
                Güneş Aktivitesi & VLF
              </Text>
            </View>
            <View style={styles.relationRow}>
              <View style={styles.relationItem}>
                <Text style={[styles.relationLabel, { color: colors.mutedForeground }]}>
                  VLF Aktivite
                </Text>
                <Text
                  style={[
                    styles.relationValue,
                    {
                      color:
                        tele?.act !== undefined
                          ? tele.act > 50
                            ? colors.danger
                            : tele.act > 25
                            ? colors.warning
                            : colors.accent
                          : colors.mutedForeground,
                    },
                  ]}
                >
                  {tele?.act !== undefined ? tele.act.toFixed(1) : "—"}
                </Text>
              </View>
              <Feather name="arrow-right" size={16} color={colors.mutedForeground} />
              <View style={styles.relationItem}>
                <Text style={[styles.relationLabel, { color: colors.mutedForeground }]}>
                  Schumann
                </Text>
                <Text
                  style={[
                    styles.relationValue,
                    { color: tele?.sch_active ? colors.accent : colors.danger },
                  ]}
                >
                  {tele?.sch_hz !== undefined ? tele.sch_hz.toFixed(2) + " Hz" : "—"}
                </Text>
              </View>
            </View>
            <Text style={[styles.relationDesc, { color: colors.mutedForeground }]}>
              {tele?.act !== undefined && tele.sch_active
                ? tele.act > 50
                  ? "🌪️ Yüksek aktivite — Güneş rüzgârı iyonosferi etkiliyor olabilir."
                  : tele.act > 25
                  ? "🌤️ Orta aktivite — Normal uzay havası koşulları."
                  : "🌱 Sakin — İyonosfer kararlı, gözlem için uygun."
                : "Veri bekleniyor…"}
            </Text>
          </View>
        )}

        {/* Güneş Patlamaları */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Güneş Patlamaları (Son 30 Gün)
          </Text>
          <Text
            style={[
              styles.sourceLabel,
              { color: usingFallback ? colors.warning : colors.primary },
            ]}
          >
            {usingFallback ? "YEDEK VERİ" : "NASA DONKI"}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
        ) : error ? (
          <View
            style={[
              styles.errorCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="wifi-off" size={24} color={colors.mutedForeground} />
            <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
              NASA DONKI verisi alınamadı
            </Text>
            <Pressable
              style={[styles.retryBtn, { backgroundColor: colors.primary }]}
              onPress={fetchData}
            >
              <Text style={[styles.retryText, { color: colors.background }]}>
                Tekrar Dene
              </Text>
            </Pressable>
          </View>
        ) : flares.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="sun" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Bu dönemde patlama kaydedilmedi
            </Text>
          </View>
        ) : (
          flares.map((f) => {
            const cls = flareClass(f.classType);
            return (
              <View
                key={f.flrID}
                style={[
                  styles.flareCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.flareTop}>
                  <View style={[styles.classBadge, { backgroundColor: cls.bg }]}>
                    <Text style={[styles.classText, { color: cls.text }]}>
                      {f.classType}
                    </Text>
                  </View>
                  {f.sourceLocation && (
                    <Text style={[styles.location, { color: colors.mutedForeground }]}>
                      {f.sourceLocation}
                    </Text>
                  )}
                </View>
                <View style={styles.flareRow}>
                  <Feather name="clock" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.flareTime, { color: colors.mutedForeground }]}>
                    {new Date(f.beginTime).toLocaleString("tr-TR")}
                  </Text>
                </View>
                {f.activeRegionNum && (
                  <Text style={[styles.region, { color: colors.primary }]}>
                    Aktif Bölge: AR{f.activeRegionNum}
                  </Text>
                )}
              </View>
            );
          })
        )}

        {/* Jeomanyetik Fırtınalar */}
        {!loading && !error && gsts.length > 0 && (
          <>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.foreground, marginTop: 24 },
              ]}
            >
              Jeomanyetik Fırtınalar
            </Text>
            {gsts.map((g) => (
              <View
                key={g.gstID}
                style={[
                  styles.gstCard,
                  { backgroundColor: colors.card, borderColor: colors.danger + "44" },
                ]}
              >
                <View style={styles.gstTop}>
                  <Feather name="zap" size={16} color={colors.danger} />
                  <Text style={[styles.gstTime, { color: colors.foreground }]}>
                    {new Date(g.startTime).toLocaleDateString("tr-TR")}
                  </Text>
                </View>
                {g.allKpIndex && g.allKpIndex.length > 0 && (
                  <Text style={[styles.kp, { color: colors.warning }]}>
                    Maks Kp: {Math.max(...g.allKpIndex.map((k) => k.kpIndex))}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  vlfCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 24, gap: 12 },
  vlfHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  vlfTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  vlfStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  vlfStatusText: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  vlfGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  vlfCell: { width: "45%", gap: 2 },
  vlfCellLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  vlfCellValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  vlfMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  relationCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  relationHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  relationTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  relationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 6,
  },
  relationItem: { alignItems: "center" },
  relationLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  relationValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  relationDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
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
  errorCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  errorText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  retryText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
