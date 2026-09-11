import React, { useEffect } from "react";
import { View, Text, StyleSheet, Vibration } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { useNasaSpaceWeather } from "@/hooks/useNasaSpaceWeather";
import { useColors } from "@/hooks/useColors";

export function SpaceWeatherAlert() {
  const colors = useColors();
  const { data } = useNasaSpaceWeather();
  const scale = useSharedValue(1);
  const isStorm = data && data.kpIndex >= 5;

  useEffect(() => {
    if (isStorm) {
      scale.value = withRepeat(
        withSequence(withTiming(1.05, { duration: 400 }), withTiming(1, { duration: 400 })),
        -1, true
      );
      Vibration.vibrate([0, 500, 200, 500]);
    } else {
      scale.value = 1;
    }
  }, [isStorm]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (!data) return null;
  if (!isStorm) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.row}>
          <Feather name="shield" size={18} color={colors.accent} />
          <Text style={[styles.title, { color: colors.foreground }]}>Uzay Hava Durumu</Text>
        </View>
        <Text style={[styles.status, { color: colors.accent }]}>{data.status} — Kp {data.kpIndex.toFixed(1)}</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>GPS durumu: {data.gpsErrorRisk}</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.card, { backgroundColor: "#450a0a", borderColor: "#dc2626" }, animatedStyle]}>
      <View style={styles.row}>
        <Feather name="alert-triangle" size={22} color="#fca5a5" />
        <Text style={[styles.alertTitle, { color: "#fca5a5" }]}>🚨 UZAY HAVA ALARMI</Text>
      </View>
      <Text style={[styles.alertStatus, { color: "#fecaca" }]}>Kp-Index {data.kpIndex.toFixed(1)} — {data.status}</Text>
      <Text style={[styles.alertSub, { color: "#fecaca" }]}>{data.gpsErrorRisk}. Aurora ihtimali: %{data.auroraLikelihood}</Text>
      <Text style={[styles.alertSub, { color: "#fecaca" }]}>VLF sinyallerinizde bozulma bekleniyor.</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  title: { fontSize: 15, fontFamily: "Inter_700Bold" },
  status: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 4 },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  alertTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  alertStatus: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 4 },
  alertSub: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
});
