import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useEarthquake } from "@/context/EarthquakeContext";
import { useSafety } from "@/context/SafetyContext";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export function EarthquakeOverlay() {
  const { earthquakeDetected, respondOk, respondNotOk, lastMagnitude } = useEarthquake();
  const { emergencyContact } = useSafety();
  const { user } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const pulse = useSharedValue(1);

  useEffect(() => {
    if (earthquakeDetected) {
      pulse.value = withRepeat(
        withSequence(withTiming(1.05, { duration: 300 }), withTiming(1, { duration: 300 })),
        -1,
        false
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      pulse.value = 1;
    }
  }, [earthquakeDetected]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  if (!earthquakeDetected) return null;

  return (
    <Modal transparent animationType="fade" visible>
      <View style={styles.overlay}>
        <LinearGradient colors={["#1A0010", "#2D0018"]} style={[styles.container, { paddingTop: insets.top + 40 }]}>
          <Animated.View style={animStyle}>
            <Text style={styles.icon}>⚠</Text>
          </Animated.View>
          <Text style={styles.title}>DEPREM ALGILANDI</Text>
          <Text style={styles.magnitude}>Şiddet: {lastMagnitude}G</Text>
          <Text style={styles.question}>İyi misin?</Text>

          <TouchableOpacity style={[styles.btn, styles.okBtn]} onPress={respondOk}>
            <Text style={styles.btnText}>Evet, İyiyim</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.notOkBtn]}
            onPress={() => respondNotOk(
              emergencyContact?.phone ?? "",
              emergencyContact?.name ?? "Acil Kişi",
              user?.name ?? "Kullanıcı"
            )}
          >
            <Text style={styles.btnText}>Hayır, Yardım Lazım</Text>
          </TouchableOpacity>

          {emergencyContact && (
            <Text style={styles.hint}>
              Hayır derseniz {emergencyContact.name} bildirilir ve 112 aranır
            </Text>
          )}
          {!emergencyContact && (
            <Text style={styles.hint}>Acil durum kişisi eklenmemiş</Text>
          )}
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)" },
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  icon: { fontSize: 80, textAlign: "center", marginBottom: 16 },
  title: { color: "#FF4560", fontSize: 28, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 8 },
  magnitude: { color: "#FFB800", fontSize: 18, fontFamily: "Inter_600SemiBold", marginBottom: 24 },
  question: { color: "#E2EAF8", fontSize: 24, fontFamily: "Inter_600SemiBold", marginBottom: 40, textAlign: "center" },
  btn: { width: "100%", padding: 18, borderRadius: 16, alignItems: "center", marginBottom: 16 },
  okBtn: { backgroundColor: "#00E5B0" },
  notOkBtn: { backgroundColor: "#FF4560" },
  btnText: { color: "#040D1A", fontSize: 18, fontFamily: "Inter_700Bold" },
  hint: { color: "#6B80A0", fontSize: 13, textAlign: "center", marginTop: 8, fontFamily: "Inter_400Regular" },
});
