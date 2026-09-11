// ORBIT-MESH — Bilimsel Analiz İstasyonu
// Gerçek BLE telemetrisi + NOAA uzay havası ile öğrenci araştırma ekranı.

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBle } from "@/context/BleContext";
import { useColors } from "@/hooks/useColors";
import { useSpaceWeather } from "@/hooks/useSpaceWeather";
import type { OrbitMeshTelemetry } from "@/utils/telemetryParser";

const chartWidth = Dimensions.get("window").width - 64;
const HISTORY_LIMIT = 24;

type AnalysisMode = "earth" | "signal" | "space";

const modeMeta: Record<
  AnalysisMode,
  { label: string; icon: keyof typeof Feather.glyphMap; description: string }
> = {
  earth: {
    label: "Dünya & İyonosfer",
    icon: "globe",
    description: "Yerel VLF ve Schumann ölçümünü incele",
  },
  signal: {
    label: "Sinyal & Mesh",
    icon: "activity",
    description: "Anomaliyi ve düğüm güvenilirliğini araştır",
  },
  space: {
    label: "Uzay Havası",
    icon: "sun",
    description: "NOAA verisini yerel ölçümle bağlama oturt",
  },
};

const studyTools: {
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  route: string;
  colorKey: "primary" | "accent" | "secondary" | "solar";
}[] = [
  {
    title: "İyonosfer Laboratuvarı",
    description: "Gerçek VLF bantlarını karşılaştır ve hipotez kur",
    icon: "radio",
    route: "/iyonosfer",
    colorKey: "primary",
  },
  {
    title: "Yörünge Gözlemi",
    description: "Uydu geçişlerini ve gözlem pencerelerini incele",
    icon: "crosshair",
    route: "/uydular",
    colorKey: "accent",
  },
  {
    title: "Uzay Havası Günlüğü",
    description: "Kp, güneş rüzgârı ve X-ışını verilerini izle",
    icon: "sun",
    route: "/space-weather-integration",
    colorKey: "solar",
  },
  {
    title: "Gözlem Koçu",
    description: "Teleskop veya çıplak göz gözlemi için plan oluştur",
    icon: "eye",
    route: "/gokyuzu-kocu",
    colorKey: "secondary",
  },
];

function valueOrDash(value: number | null | undefined, digits = 1, suffix = "") {
  return typeof value === "number" && Number.isFinite(value)
    ? `${value.toFixed(digits)}${suffix}`
    : "—";
}

function statusColor(
  state: string | undefined,
  colors: ReturnType<typeof useColors>
) {
  switch (state) {
    case "QUIET":
    case "Normal":
      return colors.accent;
    case "WATCH":
    case "Şüpheli":
      return colors.primary;
    case "ACTIVE":
    case "DISTURBED":
    case "Yüksek":
      return colors.warning;
    case "Kritik":
      return colors.danger;
    default:
      return colors.mutedForeground;
  }
}

function SectionHeading({
  icon,
  title,
  description,
  colors,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description?: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={[styles.sectionIcon, { backgroundColor: colors.primary + "1c" }]}>
        <Feather name={icon} size={17} color={colors.primary} />
      </View>
      <View style={styles.sectionHeadingText}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
        {description ? (
          <Text style={[styles.sectionDescription, { color: colors.mutedForeground }]}>
            {description}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function MetricTile({
  label,
  value,
  detail,
  color,
  colors,
}: {
  label: string;
  value: string;
  detail?: string;
  color?: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.metricTile, { backgroundColor: colors.cardBright, borderColor: colors.border }]}>
      <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: color ?? colors.foreground }]}>{value}</Text>
      {detail ? <Text style={[styles.metricDetail, { color: colors.mutedForeground }]}>{detail}</Text> : null}
    </View>
  );
}

function ProgressRow({
  label,
  value,
  color,
  colors,
}: {
  label: string;
  value: number;
  color: string;
  colors: ReturnType<typeof useColors>;
}) {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.progressRow}>
      <View style={styles.progressLabelRow}>
        <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.progressValue, { color: colors.foreground }]}>{Math.round(safeValue)}</Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
        <View style={[styles.progressFill, { width: `${safeValue}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export default function DiagnosticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [mode, setMode] = useState<AnalysisMode>("earth");

  const {
    connectedDevices,
    latestTelemetry,
    telemetry,
    anomalyScore,
    consensus,
    pqcStatus,
    meshNodes,
  } = useBle();
  const { data: spaceWeather, loading: spaceWeatherLoading, error: spaceWeatherError } = useSpaceWeather();

  const tele = latestTelemetry as OrbitMeshTelemetry | null;
  const isConnected = connectedDevices.length > 0;
  const hasTelemetry = !!tele;
  const history = useMemo(
    () => telemetry.slice(0, HISTORY_LIMIT).reverse() as OrbitMeshTelemetry[],
    [telemetry]
  );

  const chartSeries = useMemo(() => {
    const labels = history.map((item) =>
      new Date(item.receivedAt).toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
    return {
      vlf: { labels, data: history.map((item) => item.vlf_amp) },
      schumann: { labels, data: history.map((item) => item.sch_hz) },
      bands: { labels, data: history.map((item) => item.b6_10) },
    };
  }, [history]);

  const activeChart =
    mode === "earth"
      ? chartSeries.vlf
      : mode === "signal"
      ? chartSeries.bands
      : chartSeries.schumann;
  const activeChartLabel =
    mode === "earth" ? "VLF genlik geçmişi" : mode === "signal" ? "6–10 Hz bant enerjisi" : "Schumann frekans geçmişi";
  const activeChartUnit = mode === "earth" ? " ADC" : mode === "signal" ? "" : " Hz";

  const signalFinding = !tele
    ? "Gerçek ölçüm bekleniyor."
    : tele.fault
    ? "ADC girişinde arıza işareti var. Önce bağlantı ve elektrot yerleşimini kontrol edin."
    : tele.mains
    ? "50 Hz şebeke etkisi görülüyor. Aynı deneyi güç kaynağı ve ortam değiştirerek tekrarlayın."
    : tele.sch_active
    ? `Schumann bandı aktif (${tele.sch_hz.toFixed(2)} Hz). VLF genliğini zaman ve ortam notlarıyla karşılaştırın.`
    : "Schumann bandı bu örnekte aktif değil. Daha uzun bir gözlem serisi toplayın.";

  const teleAge = tele ? Math.max(0, Math.round((Date.now() - tele.receivedAt) / 1000)) : null;
  const stateTone = statusColor(tele?.state, colors);

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 96 : 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.eyebrowRow}>
            <View style={[styles.liveDot, { backgroundColor: hasTelemetry ? colors.accent : colors.warning }]} />
            <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>
              ASTRONOMİ VE UZAY TEKNOLOJİLERİ
            </Text>
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Bilimsel Analiz</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Ölç, karşılaştır, açıkla: Dünya’yı ve uzayla ilişkisini gerçek verilerle araştır.
          </Text>
        </View>

        <View
          style={[
            styles.connectionBanner,
            {
              backgroundColor: isConnected ? colors.accent + "16" : colors.warning + "16",
              borderColor: isConnected ? colors.accent + "70" : colors.warning + "70",
            },
          ]}
        >
          <View style={[styles.connectionIcon, { backgroundColor: isConnected ? colors.accent + "22" : colors.warning + "22" }]}>
            <Feather name="bluetooth" size={18} color={isConnected ? colors.accent : colors.warning} />
          </View>
          <View style={styles.connectionCopy}>
            <Text style={[styles.connectionTitle, { color: colors.foreground }]}>
              {isConnected ? "BLE gözlem düğümü bağlı" : "BLE gözlem düğümü bağlı değil"}
            </Text>
            <Text style={[styles.connectionDetail, { color: colors.mutedForeground }]}>
              {hasTelemetry
                ? `${tele?.nodeId ?? "ORBIT-MESH"} · son paket ${teleAge} sn önce`
                : "Grafikler ve bulgular yalnızca gerçek telemetri geldiğinde açılır."}
            </Text>
          </View>
          {!isConnected ? (
            <Pressable
              testID="diagnostics-connect-ble"
              onPress={() => router.push("/ble" as any)}
              style={({ pressed }) => [styles.smallAction, { backgroundColor: colors.primary, opacity: pressed ? 0.75 : 1 }]}
            >
              <Text style={[styles.smallActionText, { color: colors.primaryForeground }]}>Bağlan</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.modeScroller}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modeContent}>
            {(Object.keys(modeMeta) as AnalysisMode[]).map((key) => {
              const item = modeMeta[key];
              const selected = mode === key;
              return (
                <Pressable
                  key={key}
                  testID={`diagnostics-mode-${key}`}
                  onPress={() => setMode(key)}
                  style={[
                    styles.modePill,
                    {
                      backgroundColor: selected ? colors.primary + "22" : colors.card,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Feather name={item.icon} size={15} color={selected ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.modeLabel, { color: selected ? colors.primary : colors.mutedForeground }]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {!hasTelemetry ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primary + "1c" }]}>
              <Feather name="bar-chart-2" size={26} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Bilimsel ölçüm alanı hazır</Text>
            <Text style={[styles.emptyDescription, { color: colors.mutedForeground }]}>
              ORBIT-MESH düğümünü bağladığınızda VLF, Schumann rezonansı, bant enerjisi,
              iyonosferik hareket ve sinyal kalitesi burada gerçek zamanlı analiz edilir.
            </Text>
            <View style={styles.emptyList}>
              {[
                "Dünya’nın doğal elektromanyetik ortamını gözlemle",
                "Açık NOAA verisini yerel ölçümle karşılaştır",
                "Hipotez kur, gözlemi tekrarla ve bulguyu açıkla",
              ].map((item) => (
                <View key={item} style={styles.emptyListRow}>
                  <Feather name="check" size={14} color={colors.accent} />
                  <Text style={[styles.emptyListText, { color: colors.foreground }]}>{item}</Text>
                </View>
              ))}
            </View>
            <Pressable
              testID="diagnostics-empty-ble"
              onPress={() => router.push("/ble" as any)}
              style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary, opacity: pressed ? 0.78 : 1 }]}
            >
              <Feather name="bluetooth" size={16} color={colors.primaryForeground} />
              <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>BLE bağlantısını aç</Text>
            </Pressable>
          </View>
        ) : null}

        {hasTelemetry && tele ? (
          <>
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <SectionHeading
                icon={modeMeta[mode].icon}
                title={modeMeta[mode].label}
                description={modeMeta[mode].description}
                colors={colors}
              />

              {mode === "earth" ? (
                <>
                  <View style={styles.metricGrid}>
                    <MetricTile label="VLF frekansı" value={valueOrDash(tele.vlf_hz, 2, " Hz")} colors={colors} />
                    <MetricTile label="VLF genliği" value={valueOrDash(tele.vlf_amp, 1, " ADC")} color={colors.primary} colors={colors} />
                    <MetricTile
                      label="Schumann"
                      value={valueOrDash(tele.sch_hz, 2, " Hz")}
                      detail={tele.sch_active ? "Aktif" : "Pasif"}
                      color={tele.sch_active ? colors.accent : colors.warning}
                      colors={colors}
                    />
                    <MetricTile label="Schumann oranı" value={valueOrDash(tele.sch_ratio, 3)} colors={colors} />
                    <MetricTile label="6–10 Hz bant" value={valueOrDash(tele.b6_10, 3)} colors={colors} />
                    <MetricTile label="Şebeke bandı" value={valueOrDash(tele.b45_55, 3)} detail={tele.mains ? "Dikkat" : "Düşük"} color={tele.mains ? colors.warning : colors.accent} colors={colors} />
                  </View>
                  <Text style={[styles.findingLabel, { color: colors.primary }]}>GÖZLEM NOTU</Text>
                  <Text style={[styles.findingText, { color: colors.foreground }]}>{signalFinding}</Text>
                </>
              ) : null}

              {mode === "signal" ? (
                <>
                  <View style={styles.metricGrid}>
                    <MetricTile label="Uzay durumu" value={tele.state} color={stateTone} colors={colors} />
                    <MetricTile label="Sinyal kalitesi" value={valueOrDash(tele.sq, 0, " / 100")} color={tele.sq >= 40 ? colors.accent : colors.warning} colors={colors} />
                    <MetricTile label="İyonosferik hız" value={valueOrDash(tele.mot_vel, 2, " km/s")} colors={colors} />
                    <MetricTile label="Hareket güveni" value={valueOrDash(tele.mot_conf, 0, " %")} colors={colors} />
                    <MetricTile label="Dalga kaynağı" value={tele.wave_src || "UNKNOWN"} colors={colors} />
                    <MetricTile label="Tutarlılık" value={valueOrDash(tele.wave_coh, 2)} colors={colors} />
                  </View>
                  {anomalyScore ? (
                    <View style={styles.analysisBlock}>
                      <View style={styles.scoreHeader}>
                        <Text style={[styles.scoreTitle, { color: colors.foreground }]}>Anomali bileşenleri</Text>
                        <Text style={[styles.scoreValue, { color: statusColor(anomalyScore.level, colors) }]}>
                          {Math.round(anomalyScore.total)} · {anomalyScore.level}
                        </Text>
                      </View>
                      <ProgressRow label="VLF" value={anomalyScore.vlfScore} color={colors.primary} colors={colors} />
                      <ProgressRow label="Schumann" value={anomalyScore.schumannScore} color={colors.accent} colors={colors} />
                      <ProgressRow label="Hareket" value={anomalyScore.motionScore} color={colors.secondary} colors={colors} />
                      <ProgressRow label="Gürültü / hata" value={anomalyScore.noiseScore} color={colors.warning} colors={colors} />
                    </View>
                  ) : null}
                  <Text style={[styles.findingLabel, { color: colors.primary }]}>ARAŞTIRMA SORUSU</Text>
                  <Text style={[styles.findingText, { color: colors.foreground }]}>
                    {tele.anomaly
                      ? "Anomali işareti hangi bantta belirginleşiyor? Aynı koşullarda tekrarlı ölçüm alıp kaynak ile sonucu ayırın."
                      : "Aynı gözlem koşullarında farklı zamanlarda ölçüm alarak sinyal kalitesinin bulguyu nasıl etkilediğini inceleyin."}
                  </Text>
                </>
              ) : null}

              {mode === "space" ? (
                <View>
                  {spaceWeatherLoading && !spaceWeather ? (
                    <View style={styles.inlineState}>
                      <Feather name="loader" size={16} color={colors.primary} />
                      <Text style={[styles.inlineStateText, { color: colors.mutedForeground }]}>NOAA SWPC verisi alınıyor…</Text>
                    </View>
                  ) : spaceWeatherError && !spaceWeather ? (
                    <View style={[styles.inlineState, { backgroundColor: colors.warning + "12" }]}>
                      <Feather name="wifi-off" size={16} color={colors.warning} />
                      <Text style={[styles.inlineStateText, { color: colors.warning }]}>{spaceWeatherError}</Text>
                    </View>
                  ) : spaceWeather ? (
                    <>
                      <View style={styles.metricGrid}>
                        <MetricTile label="NOAA Kp" value={valueOrDash(spaceWeather.kpIndex, 1)} detail={spaceWeather.kpStatus} color={spaceWeather.kpIndex >= 5 ? colors.warning : colors.accent} colors={colors} />
                        <MetricTile label="Güneş rüzgârı" value={valueOrDash(spaceWeather.solarWind?.speed, 0, " km/s")} colors={colors} />
                        <MetricTile label="Yoğunluk" value={valueOrDash(spaceWeather.solarWind?.density, 1, " p/cm³")} colors={colors} />
                        <MetricTile label="Bz" value={valueOrDash(spaceWeather.solarWind?.bz, 2, " nT")} color={(spaceWeather.solarWind?.bz ?? 0) < 0 ? colors.warning : colors.accent} colors={colors} />
                        <MetricTile label="GOES X-ray" value={spaceWeather.xray?.class ?? "—"} detail={spaceWeather.xray ? valueOrDash(spaceWeather.xray.flux, 2) : undefined} colors={colors} />
                        <MetricTile label="Proton akısı" value={valueOrDash(spaceWeather.proton?.flux, 2)} detail={spaceWeather.proton?.status ?? "—"} colors={colors} />
                      </View>
                      <View style={[styles.contextCallout, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "40" }]}>
                        <Feather name="link" size={16} color={colors.primary} />
                        <Text style={[styles.contextCalloutText, { color: colors.foreground }]}>
                          NOAA Kp küresel uzay havasını, BLE ölçümü ise bulunduğunuz istasyondaki yerel elektromanyetik koşulları gösterir. Aynı zaman aralığında ikisini kaydetmek karşılaştırmalı araştırma için başlangıçtır.
                        </Text>
                      </View>
                    </>
                  ) : null}
                </View>
              ) : null}
            </View>

            {mode !== "space" && history.length >= 2 ? (
              <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.chartTitleRow}>
                  <View>
                    <Text style={[styles.chartTitle, { color: colors.foreground }]}>{activeChartLabel}</Text>
                    <Text style={[styles.chartSubtitle, { color: colors.mutedForeground }]}>
                      Son {history.length} gerçek BLE paketi
                    </Text>
                  </View>
                  <View style={[styles.chartBadge, { backgroundColor: colors.accent + "18" }]}>
                    <Feather name="radio" size={13} color={colors.accent} />
                    <Text style={[styles.chartBadgeText, { color: colors.accent }]}>CANLI</Text>
                  </View>
                </View>
                <LineChart
                  data={{ labels: activeChart.labels, datasets: [{ data: activeChart.data }] }}
                  width={chartWidth}
                  height={190}
                  yAxisSuffix={activeChartUnit}
                  chartConfig={{
                    backgroundColor: colors.card,
                    backgroundGradientFrom: colors.card,
                    backgroundGradientTo: colors.card,
                    decimalPlaces: 1,
                    color: () => mode === "signal" ? colors.accent : colors.primary,
                    labelColor: () => colors.mutedForeground,
                    strokeWidth: 2,
                    propsForDots: { r: "3", strokeWidth: "1", stroke: colors.card },
                    propsForBackgroundLines: { stroke: colors.border },
                  }}
                  bezier
                  style={styles.chart}
                />
              </View>
            ) : mode !== "space" ? (
              <View style={[styles.chartEmpty, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="trending-up" size={22} color={colors.mutedForeground} />
                <Text style={[styles.chartEmptyTitle, { color: colors.foreground }]}>Grafik için seri toplanıyor</Text>
                <Text style={[styles.chartEmptyText, { color: colors.mutedForeground }]}>
                  En az iki gerçek telemetri paketi geldiğinde ölçüm geçmişi burada görselleştirilecek.
                </Text>
              </View>
            ) : null}

            <View style={[styles.healthCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <SectionHeading icon="check-circle" title="Gözlem güvenilirliği" description="Ölçümün ve mesh ağının mevcut durumu" colors={colors} />
              <View style={styles.healthRows}>
                {[
                  { label: "ADC girişi", ok: !tele.fault, detail: tele.fault ? "INPUT_FAULT" : "Hazır" },
                  { label: "Şebeke gürültüsü", ok: !tele.mains, detail: tele.mains ? "50 Hz etkisi" : "Düşük" },
                  { label: "Sinyal kalitesi", ok: tele.sq >= 40, detail: `${Math.round(tele.sq)} / 100` },
                  { label: "Mesh doğrulaması", ok: consensus.status === "Doğrulanmış" || consensus.totalNodes <= 1, detail: `${consensus.anomalyCount}/${consensus.totalNodes} düğüm` },
                ].map((item) => (
                  <View key={item.label} style={styles.healthRow}>
                    <Feather name={item.ok ? "check-circle" : "alert-circle"} size={16} color={item.ok ? colors.accent : colors.warning} />
                    <Text style={[styles.healthLabel, { color: colors.foreground }]}>{item.label}</Text>
                    <Text style={[styles.healthDetail, { color: item.ok ? colors.accent : colors.warning }]}>{item.detail}</Text>
                  </View>
                ))}
              </View>
              <Text style={[styles.pqcNote, { color: colors.mutedForeground }]}>
                PQC durum kartı PoC seviyesindedir; üretim kriptografisi olarak yorumlanmamalıdır. Doğrulanan paket: {pqcStatus?.recentVerifications ?? 0}.
              </Text>
            </View>
          </>
        ) : null}

        <View style={styles.toolsSection}>
          <SectionHeading
            icon="book-open"
            title="Uzay çalışmaları"
            description="Araştırma, gözlem ve modelleme için hazır çalışma alanları"
            colors={colors}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolScroller}>
            {studyTools.map((tool) => {
              const accent = colors[tool.colorKey];
              return (
                <Pressable
                  key={tool.title}
                  testID={`diagnostics-tool-${tool.route.replace(/\W/g, "")}`}
                  onPress={() => router.push(tool.route as any)}
                  style={({ pressed }) => [
                    styles.toolCard,
                    { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.76 : 1 },
                  ]}
                >
                  <View style={[styles.toolIcon, { backgroundColor: accent + "1c" }]}>
                    <Feather name={tool.icon} size={19} color={accent} />
                  </View>
                  <Text style={[styles.toolTitle, { color: colors.foreground }]}>{tool.title}</Text>
                  <Text style={[styles.toolDescription, { color: colors.mutedForeground }]}>{tool.description}</Text>
                  <View style={styles.toolFooter}>
                    <Text style={[styles.toolAction, { color: accent }]}>Çalışmayı aç</Text>
                    <Feather name="arrow-up-right" size={14} color={accent} />
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {meshNodes.length > 0 ? (
          <View style={[styles.meshCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SectionHeading icon="share-2" title="Mesh gözlem ağı" description="Aynı olayı birden fazla düğümle doğrula" colors={colors} />
            {meshNodes.slice(0, 4).map((node) => (
                <View key={node.id} style={[styles.meshRow, { borderTopColor: colors.border }]}>
                <View style={[styles.meshNodeDot, { backgroundColor: node.isConnected ? colors.accent : colors.mutedForeground }]} />
                <Text style={[styles.meshNodeName, { color: colors.foreground }]} numberOfLines={1}>
                  {node.name ?? node.id}
                </Text>
                <Text style={[styles.meshNodeStatus, { color: node.isConnected ? colors.accent : colors.mutedForeground }]}>
                  {node.health}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, marginBottom: 16 },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  eyebrow: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  subtitle: { fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular", marginTop: 6, maxWidth: 360 },
  connectionBanner: { flexDirection: "row", alignItems: "center", marginHorizontal: 20, borderRadius: 16, borderWidth: 1, padding: 12, gap: 10, marginBottom: 16 },
  connectionIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  connectionCopy: { flex: 1, gap: 3 },
  connectionTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  connectionDetail: { fontSize: 11, lineHeight: 15, fontFamily: "Inter_400Regular" },
  smallAction: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  smallActionText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  modeScroller: { marginBottom: 16 },
  modeContent: { paddingHorizontal: 20, gap: 8 },
  modePill: { flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  modeLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  emptyCard: { marginHorizontal: 20, borderRadius: 20, borderWidth: 1, padding: 22, alignItems: "center", marginBottom: 24 },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptyDescription: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 8 },
  emptyList: { width: "100%", gap: 10, marginTop: 18, marginBottom: 18 },
  emptyListRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  emptyListText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  primaryButton: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12 },
  primaryButtonText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  sectionCard: { marginHorizontal: 20, borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 16 },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 15 },
  sectionIcon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  sectionHeadingText: { flex: 1, gap: 2 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  sectionDescription: { fontSize: 11, lineHeight: 15, fontFamily: "Inter_400Regular" },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  metricTile: { width: "31.8%", minHeight: 76, borderRadius: 13, borderWidth: 1, padding: 10, justifyContent: "center" },
  metricLabel: { fontSize: 10, fontFamily: "Inter_500Medium", marginBottom: 4 },
  metricValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  metricDetail: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 3 },
  findingLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1, marginTop: 17, marginBottom: 5 },
  findingText: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_500Medium" },
  analysisBlock: { marginTop: 17, gap: 11 },
  scoreHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  scoreTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  scoreValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
  progressRow: { gap: 5 },
  progressLabelRow: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  progressValue: { fontSize: 11, fontFamily: "Inter_700Bold" },
  progressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  inlineState: { flexDirection: "row", alignItems: "center", gap: 9, borderRadius: 12, padding: 13 },
  inlineStateText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  contextCallout: { flexDirection: "row", gap: 9, borderRadius: 13, borderWidth: 1, padding: 12, marginTop: 15 },
  contextCalloutText: { flex: 1, fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
  chartCard: { marginHorizontal: 20, borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 16 },
  chartTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  chartTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  chartSubtitle: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 3 },
  chartBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  chartBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  chart: { marginTop: 8, borderRadius: 12, marginLeft: -8 },
  chartEmpty: { marginHorizontal: 20, borderRadius: 18, borderWidth: 1, padding: 22, alignItems: "center", marginBottom: 16 },
  chartEmptyTitle: { fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 9 },
  chartEmptyText: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 5 },
  healthCard: { marginHorizontal: 20, borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 24 },
  healthRows: { gap: 12 },
  healthRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  healthLabel: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  healthDetail: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  pqcNote: { fontSize: 10, lineHeight: 15, fontFamily: "Inter_400Regular", marginTop: 15 },
  toolsSection: { marginBottom: 24 },
  toolScroller: { paddingHorizontal: 20, gap: 10 },
  toolCard: { width: 188, minHeight: 168, borderRadius: 16, borderWidth: 1, padding: 14 },
  toolIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 11 },
  toolTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  toolDescription: { fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular", marginTop: 5, flex: 1 },
  toolFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 13 },
  toolAction: { fontSize: 11, fontFamily: "Inter_700Bold" },
  meshCard: { marginHorizontal: 20, borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 20 },
  meshRow: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
  meshNodeDot: { width: 8, height: 8, borderRadius: 4 },
  meshNodeName: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  meshNodeStatus: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});