import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Dimensions, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import Svg, { Path, Circle, Rect } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
} from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");
const SVG_H = 280;

const AnimatedPath = Animated.createAnimatedComponent(Path);

function generateVLFWave(density: number, time: number): string {
  const baseAmp = 20 + density * 60;
  const freq = 0.05 + density * 0.03;
  let d = `M 0 ${SVG_H / 2}`;
  for (let x = 0; x <= width - 40; x += 4) {
    const y = SVG_H / 2 + Math.sin(x * freq + time * 3) * baseAmp * (0.7 + 0.3 * Math.sin(x * 0.01));
    d += ` L ${x} ${y}`;
  }
  return d;
}

export function IonosphereSandbox() {
  const colors = useColors();
  const [density, setDensity] = useState(0.5);
  const [time, setTime] = useState(0);

  const wavePath = useSharedValue(generateVLFWave(0.5, 0));

  useEffect(() => {
    const id = setInterval(() => {
      setTime((t) => {
        const nt = t + 0.05;
        wavePath.value = generateVLFWave(density, nt);
        return nt;
      });
    }, 50);
    return () => clearInterval(id);
  }, [density]);

  const animatedProps = useAnimatedProps(() => ({ d: wavePath.value }));

  const vlfStrength = 30 + density * 70;
  const reflection = density > 0.6 ? "Güçlü Yansıma" : density > 0.3 ? "Orta Yansıma" : "Zayıf Yansıma";

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Feather name="layers" size={18} color={colors.secondary} />
        <Text style={[styles.title, { color: colors.foreground }]}>İYONOSFER KUMSALI</Text>
      </View>

      <Text style={[styles.desc, { color: colors.mutedForeground }]}>
        İyonosfer yoğunluğunu değiştir, VLF sinyalinin nasıl yansıdığını gör.
      </Text>

      <View style={styles.svgWrap}>
        <Svg width={width - 40} height={SVG_H}>
          <Rect x="0" y="0" width={width - 40} height={60} fill="#0f172a" opacity={0.6} />
          <Rect x="0" y="60" width={width - 40} height={80} fill="#1e3a5f" opacity={0.5} />
          <Rect x="0" y="140" width={width - 40} height={140} fill="#0c4a6e" opacity={0.4} />
          <AnimatedPath
            animatedProps={animatedProps}
            stroke={density > 0.6 ? "#f472b6" : density > 0.3 ? "#38bdf8" : "#94a3b8"}
            strokeWidth={3}
            fill="none"
          />
          <Circle cx={(width - 40) / 2} cy={70} r={6 + density * 10} fill="#fbbf24" opacity={0.4 + density * 0.4} />
        </Svg>
      </View>

      <View style={styles.sliderRow}>
        <Text style={[styles.sliderLabel, { color: colors.mutedForeground }]}>Seyrek</Text>
        <Pressable
          accessibilityRole="adjustable"
          accessibilityLabel="İyonosfer yoğunluğu"
          onPress={() => setDensity((current) => current >= 0.75 ? 0.1 : current + 0.25)}
          style={[styles.sliderTrack, { backgroundColor: colors.muted }]}
        >
          <View style={[styles.sliderFill, { width: `${density * 100}%`, backgroundColor: colors.primary }]} />
          <View style={[styles.sliderThumb, { left: `${Math.max(0, density * 100 - 4)}%`, backgroundColor: colors.primary }]} />
        </Pressable>
        <Text style={[styles.sliderLabel, { color: colors.mutedForeground }]}>Yoğun</Text>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={[styles.statVal, { color: colors.primary }]}>%{vlfStrength.toFixed(0)}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>VLF Gücü</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statVal, { color: colors.secondary }]}>{reflection}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Yansıma</Text>
        </View>
      </View>

      <Text style={[styles.education, { color: colors.mutedForeground }]}>
        💡 İyonosfer yoğunlaştıkça VLF sinyali daha güçlü yansır. Güneş patlamaları iyonosferi şişirir!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 20 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  title: { fontSize: 15, fontFamily: "Inter_700Bold" },
  desc: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 12, lineHeight: 18 },
  svgWrap: { borderRadius: 12, overflow: "hidden", backgroundColor: "#020617", marginBottom: 8 },
  sliderRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  sliderLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", width: 50, textAlign: "center" },
  sliderTrack: { flex: 1, height: 8, borderRadius: 4, position: "relative", justifyContent: "center" },
  sliderFill: { height: "100%", borderRadius: 4 },
  sliderThumb: { position: "absolute", top: -5, width: 18, height: 18, borderRadius: 9 },
  stats: { flexDirection: "row", gap: 16, marginBottom: 8 },
  stat: { flex: 1, alignItems: "center" },
  statVal: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  education: { fontSize: 11, fontFamily: "Inter_500Medium", lineHeight: 16, marginTop: 4 },
});
