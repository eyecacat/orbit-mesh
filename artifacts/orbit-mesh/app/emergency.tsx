import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEmergency } from "@/hooks/useEmergency";
import * as Haptics from "expo-haptics";

const COUNTDOWN_START = 30;

export default function EmergencyScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { call112 } = useEmergency();
  const [countdown, setCountdown] = useState(COUNTDOWN_START);
  const [called, setCalled] = useState(false);
  const [smsSent] = useState(params.auto === "1");
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;

  const reason = params.reason as string;
  const reasonLabel =
    reason === "shake" ? "Sallama hareketi" :
    reason === "ble" ? "Deneyap kart sinyali" :
    "Manuel aktivasyon";

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(ringAnim, { toValue: 1, duration: 2000, useNativeDriver: true })
    ).start();

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoCall();
          return 0;
        }
        if (prev <= 10) Haptics.selectionAsync();
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleAutoCall = () => {
    if (!called) {
      setCalled(true);
      call112();
    }
  };

  const handleCall112 = () => {
    setCalled(true);
    call112();
  };

  const handleSafe = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const ringScale = ringAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] });
  const ringOpacity = ringAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.3, 0] });

  return (
    <LinearGradient colors={["#1a0005", "#2d0010", "#1a0005"]} style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.bgRings}>
        {[1, 2, 3].map((i) => (
          <Animated.View key={i} style={[styles.bgRing, {
            transform: [{ scale: ringAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5 + i * 0.4] }) }],
            opacity: ringAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3 / i, 0] }),
          }]} />
        ))}
      </View>

      <View style={styles.topBar}>
        <View style={styles.sosTag}>
          <Text style={styles.sosText}>SOS</Text>
        </View>
        <Text style={styles.reasonText}>{reasonLabel}</Text>
      </View>

      <Animated.View style={[styles.countdownWrap, { transform: [{ scale: pulseAnim }] }]}>
        <View style={styles.countdownRing}>
          <Text style={styles.countdownNum}>{countdown}</Text>
          <Text style={styles.countdownLabel}>saniye</Text>
        </View>
        <Text style={styles.countdownDesc}>
          {called ? "112 arandı" : "112 otomatik aranacak"}
        </Text>
      </Animated.View>

      {smsSent && (
        <View style={styles.smsSentBanner}>
          <Feather name="check-circle" size={16} color="#00ff88" />
          <Text style={styles.smsSentText}>Acil kişilere SMS gönderildi</Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.call112Btn} onPress={handleCall112} activeOpacity={0.8}>
          <Feather name="phone" size={28} color="#ffffff" />
          <View>
            <Text style={styles.call112Text}>112'yi Ara</Text>
            <Text style={styles.call112Sub}>Acil yardım hattı</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.safeBtn} onPress={handleSafe} activeOpacity={0.8}>
          <Feather name="shield" size={22} color="#00ff88" />
          <Text style={styles.safeBtnText}>Güvendeyim — Durdur</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Feather name="info" size={14} color="#64748b" />
        <Text style={styles.infoText}>
          "Güvendeyim" butonuna basmaz veya {COUNTDOWN_START} saniye içinde yanıt vermezsen 112 otomatik aranır.
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "space-between", padding: 24 },
  bgRings: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  bgRing: {
    position: "absolute", width: 200, height: 200, borderRadius: 100,
    borderWidth: 1, borderColor: "#ff3b5c",
  },
  topBar: { alignItems: "center", gap: 8, marginTop: 20 },
  sosTag: { backgroundColor: "#ff3b5c", paddingHorizontal: 24, paddingVertical: 6, borderRadius: 20 },
  sosText: { color: "#ffffff", fontSize: 18, fontWeight: "900", letterSpacing: 4, fontFamily: "Inter_700Bold" },
  reasonText: { color: "#94a3b8", fontSize: 13, fontFamily: "Inter_400Regular" },
  countdownWrap: { alignItems: "center", gap: 12, flex: 1, justifyContent: "center" },
  countdownRing: {
    width: 180, height: 180, borderRadius: 90,
    borderWidth: 4, borderColor: "#ff3b5c",
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#ff3b5c" + "15",
  },
  countdownNum: { fontSize: 72, fontWeight: "900", color: "#ff3b5c", fontFamily: "Inter_700Bold" },
  countdownLabel: { fontSize: 14, color: "#94a3b8", marginTop: -8, fontFamily: "Inter_400Regular" },
  countdownDesc: { color: "#64748b", fontSize: 13, fontFamily: "Inter_400Regular" },
  smsSentBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#00ff88" + "15", borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: "#00ff88" + "40", width: "100%",
  },
  smsSentText: { color: "#00ff88", fontFamily: "Inter_500Medium", fontSize: 13 },
  actions: { width: "100%", gap: 12 },
  call112Btn: {
    backgroundColor: "#ff3b5c", borderRadius: 20, padding: 22,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16,
    shadowColor: "#ff3b5c", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12,
    elevation: 8,
  },
  call112Text: { color: "#ffffff", fontSize: 22, fontWeight: "900", fontFamily: "Inter_700Bold" },
  call112Sub: { color: "#ffcccc", fontSize: 12, fontFamily: "Inter_400Regular" },
  safeBtn: {
    backgroundColor: "#00ff88" + "15", borderWidth: 2, borderColor: "#00ff88",
    borderRadius: 16, padding: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
  },
  safeBtnText: { color: "#00ff88", fontWeight: "800", fontSize: 17, fontFamily: "Inter_700Bold" },
  infoBox: { flexDirection: "row", gap: 8, paddingTop: 8 },
  infoText: { flex: 1, color: "#374151", fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
});
