import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

type LabPreset = "earth" | "mars" | "venus" | "ice" | "custom";

type Metrics = {
  temperature: number;
  water: number;
  atmosphere: number;
  gravity: number;
  radiation: number;
};

const PRESETS: { id: LabPreset; label: string; metrics: Metrics }[] = [
  {
    id: "earth",
    label: "Dünya-benzeri",
    metrics: {
      temperature: 15,
      water: 80,
      atmosphere: 75,
      gravity: 100,
      radiation: 15,
    },
  },
  {
    id: "mars",
    label: "Mars-benzeri",
    metrics: {
      temperature: -63,
      water: 20,
      atmosphere: 12,
      gravity: 38,
      radiation: 78,
    },
  },
  {
    id: "venus",
    label: "Venüs-benzeri",
    metrics: {
      temperature: 465,
      water: 5,
      atmosphere: 98,
      gravity: 90,
      radiation: 55,
    },
  },
  {
    id: "ice",
    label: "Buz-Dünya",
    metrics: {
      temperature: -120,
      water: 55,
      atmosphere: 35,
      gravity: 80,
      radiation: 25,
    },
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function scoreMetrics(m: Metrics) {
  const tempScore = 100 - Math.min(Math.abs(m.temperature - 15) * 0.9, 100);
  const waterScore = m.water;
  const atmosphereScore = m.atmosphere;
  const gravityScore = 100 - Math.min(Math.abs(m.gravity - 100) * 1.1, 100);
  const radiationScore = 100 - m.radiation;

  const score =
    tempScore * 0.25 +
    waterScore * 0.25 +
    atmosphereScore * 0.2 +
    gravityScore * 0.15 +
    radiationScore * 0.15;

  return Math.round(clamp(score, 0, 100));
}

function verdict(score: number) {
  if (score >= 75) {
    return {
      label: "Yaşam için güçlü aday",
      detail:
        "Koşullar Dünya'ya yakın. Sıvı su ve dengeli atmosfer olasılığı yüksek.",
      color: "#22C55E",
    };
  }

  if (score >= 45) {
    return {
      label: "Sınırda yaşam potansiyeli",
      detail: "Bazı koşullar uygun, ancak ortam ciddi ayarlama gerektiriyor.",
      color: "#F59E0B",
    };
  }

  return {
    label: "Yaşam için zorlu ortam",
    detail: "Şartlar biyolojik yaşama şu an için uygun görünmüyor.",
    color: "#EF4444",
  };
}

function MetricControl({
  title,
  value,
  unit,
  min,
  max,
  step,
  onChange,
  description,
}: {
  title: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (next: number) => void;
  description: string;
}) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.metricCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.metricTopRow}>
        <View>
          <Text style={[styles.metricTitle, { color: colors.foreground }]}>
            {title}
          </Text>
          <Text style={[styles.metricDesc, { color: colors.mutedForeground }]}>
            {description}
          </Text>
        </View>

        <Text style={[styles.metricValue, { color: colors.foreground }]}>
          {value}
          {unit}
        </Text>
      </View>

      <View style={styles.stepRow}>
        <Pressable
          onPress={() => onChange(clamp(value - step, min, max))}
          style={({ pressed }) => [
            styles.stepBtn,
            {
              opacity: pressed ? 0.7 : 1,
              backgroundColor: colors.background,
              borderColor: colors.border,
            },
          ]}
        >
          <Feather name="minus" size={16} color={colors.foreground} />
        </Pressable>

        <View style={[styles.sliderTrack, { backgroundColor: colors.background }]}>
          <View
            style={[
              styles.sliderFill,
              {
                width: `${((value - min) / (max - min)) * 100}%`,
                backgroundColor: colors.primary,
              },
            ]}
          />
        </View>

        <Pressable
          onPress={() => onChange(clamp(value + step, min, max))}
          style={({ pressed }) => [
            styles.stepBtn,
            {
              opacity: pressed ? 0.7 : 1,
              backgroundColor: colors.background,
              borderColor: colors.border,
            },
          ]}
        >
          <Feather name="plus" size={16} color={colors.foreground} />
        </Pressable>
      </View>

      <View style={styles.rangeRow}>
        <Text style={[styles.rangeText, { color: colors.mutedForeground }]}>
          {min}
        </Text>
        <Text style={[styles.rangeText, { color: colors.mutedForeground }]}>
          {max}
        </Text>
      </View>
    </View>
  );
}

export default function YasanabilirlikLabScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [metrics, setMetrics] = useState<Metrics>({
    temperature: 15,
    water: 80,
    atmosphere: 75,
    gravity: 100,
    radiation: 15,
  });

  const score = useMemo(() => scoreMetrics(metrics), [metrics]);
  const currentVerdict = useMemo(() => verdict(score), [score]);
  const topPad = insets.top;

  function applyPreset(preset: LabPreset) {
    if (preset === "custom") return;
    const next = PRESETS.find(p => p.id === preset)?.metrics;
    if (next) setMetrics(next);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad + 12,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={[
              styles.backBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="arrow-left" size={18} color={colors.foreground} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={[styles.kicker, { color: colors.mutedForeground }]}>
              Yaşanabilirlik Laboratuvarı
            </Text>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Bir gezegeni yaşanabilir hale getir
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.hero,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <LinearGradient
            colors={["#0EA5E9", "#7C3AED", "#0F172A"]}
            style={styles.heroGradient}
          >
            <Text style={styles.heroLabel}>Simülasyon skoru</Text>
            <Text style={styles.heroScore}>{score}</Text>
            <Text style={styles.heroVerdict}>{currentVerdict.label}</Text>
            <Text style={styles.heroDetail}>{currentVerdict.detail}</Text>
          </LinearGradient>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Hızlı senaryolar
        </Text>
        <View style={styles.presetRow}>
          {PRESETS.map(p => (
            <Pressable
              key={p.id}
              onPress={() => applyPreset(p.id)}
              style={({ pressed }) => [
                styles.presetChip,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Feather name="layers" size={14} color={colors.primary} />
              <Text style={[styles.presetText, { color: colors.foreground }]}>
                {p.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <MetricControl
          title="Sıcaklık"
          value={metrics.temperature}
          unit="°C"
          min={-200}
          max={500}
          step={5}
          description="Sıvı su için kritik parametre."
          onChange={temperature =>
            setMetrics(prev => ({ ...prev, temperature }))
          }
        />

        <MetricControl
          title="Su"
          value={metrics.water}
          unit="%"
          min={0}
          max={100}
          step={5}
          description="Yüzey veya yeraltı su ihtimali."
          onChange={water => setMetrics(prev => ({ ...prev, water }))}
        />

        <MetricControl
          title="Atmosfer"
          value={metrics.atmosphere}
          unit="%"
          min={0}
          max={100}
          step={5}
          description="Basınç ve gaz bileşimi dengesi."
          onChange={atmosphere =>
            setMetrics(prev => ({ ...prev, atmosphere }))
          }
        />

        <MetricControl
          title="Yerçekimi"
          value={metrics.gravity}
          unit="%"
          min={0}
          max={200}
          step={5}
          description="100 Dünya standardı kabul edilir."
          onChange={gravity => setMetrics(prev => ({ ...prev, gravity }))}
        />

        <MetricControl
          title="Radyasyon"
          value={metrics.radiation}
          unit="%"
          min={0}
          max={100}
          step={5}
          description="Düşük değer yaşam şansını artırır."
          onChange={radiation =>
            setMetrics(prev => ({ ...prev, radiation }))
          }
        />

        <View
          style={[
            styles.summaryCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.foreground, paddingHorizontal: 0 },
            ]}
          >
            Sonuç özeti
          </Text>

          <View style={styles.summaryRow}>
            <View
              style={[
                styles.summaryBadge,
                { backgroundColor: currentVerdict.color + "18" },
              ]}
            >
              <Feather
                name="check-circle"
                size={14}
                color={currentVerdict.color}
              />
              <Text
                style={[
                  styles.summaryBadgeText,
                  { color: currentVerdict.color },
                ]}
              >
                {currentVerdict.label}
              </Text>
            </View>

            <Text style={[styles.summaryScore, { color: colors.foreground }]}>
              {score}/100
            </Text>
          </View>

          <Text style={[styles.summaryText, { color: colors.mutedForeground }]}>
            Sıcaklık, su, atmosfer, yerçekimi ve radyasyon birlikte
            değerlendirildi. Bu ekran, gezegen koşullarını değiştirerek yaşam
            olasılığını öğretici biçimde gösterir.
          </Text>

          <View style={styles.reasonList}>
            <View style={styles.reasonRow}>
              <Feather name="thermometer" size={14} color={colors.primary} />
              <Text style={[styles.reasonText, { color: colors.foreground }]}>
                Sıcaklık: {metrics.temperature}°C
              </Text>
            </View>
            <View style={styles.reasonRow}>
              <Feather name="droplet" size={14} color={colors.primary} />
              <Text style={[styles.reasonText, { color: colors.foreground }]}>
                Su: {metrics.water}%
              </Text>
            </View>
            <View style={styles.reasonRow}>
              <Feather name="cloud" size={14} color={colors.primary} />
              <Text style={[styles.reasonText, { color: colors.foreground }]}>
                Atmosfer: {metrics.atmosphere}%
              </Text>
            </View>
            <View style={styles.reasonRow}>
              <Feather name="compass" size={14} color={colors.primary} />
              <Text style={[styles.reasonText, { color: colors.foreground }]}>
                Yerçekimi: {metrics.gravity}%
              </Text>
            </View>
            <View style={styles.reasonRow}>
              <Feather name="zap" size={14} color={colors.primary} />
              <Text style={[styles.reasonText, { color: colors.foreground }]}>
                Radyasyon: {metrics.radiation}%
              </Text>
            </View>
          </View>
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
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  kicker: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 2 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", lineHeight: 30 },
  hero: {
    marginHorizontal: 20,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    marginBottom: 22,
  },
  heroGradient: {
    padding: 20,
    minHeight: 190,
    justifyContent: "space-between",
  },
  heroLabel: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  heroScore: {
    color: "white",
    fontSize: 44,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
  heroVerdict: {
    color: "white",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginTop: 8,
  },
  heroDetail: {
    color: "rgba(255,255,255,0.84)",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  presetRow: {
    paddingHorizontal: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  presetChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  presetText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  metricCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  metricTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  metricTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  metricDesc: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  metricValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sliderTrack: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
  },
  sliderFill: {
    height: "100%",
    borderRadius: 999,
  },
  rangeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  rangeText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  summaryCard: {
    marginHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  summaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  summaryBadgeText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  summaryScore: { fontSize: 18, fontFamily: "Inter_700Bold" },
  summaryText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
  },
  reasonList: { marginTop: 14, gap: 8 },
  reasonRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  reasonText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});