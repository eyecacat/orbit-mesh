import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Animated, Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useShakeDetection } from "@/hooks/useShakeDetection";
import { useEmergency, type EmergencyContact } from "@/hooks/useEmergency";
import { useAuth } from "@/contexts/AuthContext";
import * as Haptics from "expo-haptics";

interface EmergencyContextValue {
  triggerEmergency: (contacts: EmergencyContact[], reason?: string) => void;
  setContacts: (contacts: EmergencyContact[]) => void;
}

const EmergencyContext = createContext<EmergencyContextValue>({
  triggerEmergency: () => {},
  setContacts: () => {},
});

export function useEmergencyContext() {
  return useContext(EmergencyContext);
}

const SHAKE_RESPONSE_SECONDS = 60;

export function EmergencyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { getLocation, sendEmergencySMS, call112 } = useEmergency();
  const [contacts, setContactsState] = useState<EmergencyContact[]>([]);
  const [shakeModal, setShakeModal] = useState(false);
  const [shakeCountdown, setShakeCountdown] = useState(SHAKE_RESPONSE_SECONDS);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const stopCountdown = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = null;
  };

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  };

  const handleShake = useCallback(() => {
    if (shakeModal) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setShakeCountdown(SHAKE_RESPONSE_SECONDS);
    setShakeModal(true);
    startPulse();
  }, [shakeModal]);

  useShakeDetection(handleShake);

  useEffect(() => {
    if (shakeModal) {
      countdownRef.current = setInterval(() => {
        setShakeCountdown(prev => {
          if (prev <= 1) {
            stopCountdown();
            setShakeModal(false);
            handleEmergencyAuto();
            return SHAKE_RESPONSE_SECONDS;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      stopCountdown();
    }
    return stopCountdown;
  }, [shakeModal]);

  const handleEmergencyAuto = async () => {
    const locationText = await getLocation();
    await sendEmergencySMS(contacts, user?.name ?? "Kullanıcı", locationText);
    router.push({ pathname: "/emergency", params: { reason: "shake", auto: "1" } } as never);
  };

  const triggerEmergency = useCallback(async (contactsList: EmergencyContact[], reason = "manual") => {
    setShakeModal(false);
    stopCountdown();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    const locationText = await getLocation();
    await sendEmergencySMS(contactsList.length > 0 ? contactsList : contacts, user?.name ?? "Kullanıcı", locationText);
    router.push({ pathname: "/emergency", params: { reason } } as never);
  }, [contacts, user, getLocation, sendEmergencySMS]);

  return (
    <EmergencyContext.Provider value={{ triggerEmergency, setContacts: setContactsState }}>
      {children}
      <Modal visible={shakeModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <Animated.View style={[styles.shakeCard, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.shakeIcon}>
              <Feather name="alert-circle" size={48} color="#ff9500" />
            </View>
            <Text style={styles.shakeTitle}>İyi misin?</Text>
            <Text style={styles.shakeSubtitle}>
              Telefonun çok sallandı. Yardıma ihtiyacın var mı?
            </Text>
            <View style={styles.countdown}>
              <Text style={styles.countdownNum}>{shakeCountdown}</Text>
              <Text style={styles.countdownLabel}>saniye içinde acil durum tetikleniyor</Text>
            </View>
            <TouchableOpacity
              style={styles.safeBtn}
              onPress={() => { setShakeModal(false); stopCountdown(); }}
              activeOpacity={0.8}
            >
              <Feather name="check-circle" size={20} color="#0a0e1a" />
              <Text style={styles.safeBtnText}>Evet, İyiyim!</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.emergencyBtn}
              onPress={() => {
                setShakeModal(false);
                triggerEmergency(contacts, "shake");
              }}
              activeOpacity={0.8}
            >
              <Feather name="alert-triangle" size={18} color="#ffffff" />
              <Text style={styles.emergencyBtnText}>Yardıma İhtiyacım Var</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </EmergencyContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "#000000cc", alignItems: "center", justifyContent: "center", padding: 24 },
  shakeCard: {
    backgroundColor: "#111827", borderRadius: 24, padding: 28, width: "100%",
    borderWidth: 2, borderColor: "#ff9500", alignItems: "center", gap: 16,
  },
  shakeIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#ff9500" + "20", alignItems: "center", justifyContent: "center" },
  shakeTitle: { fontSize: 26, fontWeight: "900", color: "#ffffff", fontFamily: "Inter_700Bold" },
  shakeSubtitle: { fontSize: 14, color: "#94a3b8", textAlign: "center", fontFamily: "Inter_400Regular", lineHeight: 20 },
  countdown: { alignItems: "center", paddingVertical: 8 },
  countdownNum: { fontSize: 52, fontWeight: "900", color: "#ff9500", fontFamily: "Inter_700Bold" },
  countdownLabel: { fontSize: 12, color: "#64748b", fontFamily: "Inter_400Regular", textAlign: "center" },
  safeBtn: {
    width: "100%", backgroundColor: "#00ff88", borderRadius: 16, padding: 18,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
  },
  safeBtnText: { color: "#0a0e1a", fontWeight: "800", fontSize: 17, fontFamily: "Inter_700Bold" },
  emergencyBtn: {
    width: "100%", backgroundColor: "#ff3b5c" + "20", borderWidth: 1, borderColor: "#ff3b5c",
    borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  emergencyBtnText: { color: "#ff3b5c", fontWeight: "700", fontSize: 15, fontFamily: "Inter_700Bold" },
});
