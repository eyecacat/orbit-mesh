import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Platform, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useEmergency, type EmergencyContact } from "@/hooks/useEmergency";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

interface BLEDevice {
  id: string;
  name: string;
  rssi: number;
  isConnected: boolean;
  isDeneyap: boolean;
}

const MOCK_DEVICES: BLEDevice[] = [
  { id: "DE:NY:AP:01:23:45", name: "Deneyap-ORBIT-01", rssi: -52, isConnected: false, isDeneyap: true },
  { id: "DE:NY:AP:06:78:90", name: "Deneyap Mini-02", rssi: -71, isConnected: false, isDeneyap: true },
  { id: "AB:CD:EF:11:22:33", name: "Bilinmeyen Cihaz", rssi: -88, isConnected: false, isDeneyap: false },
];

function SignalBars({ rssi }: { rssi: number }) {
  const strength = rssi > -60 ? 4 : rssi > -70 ? 3 : rssi > -80 ? 2 : 1;
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 2 }}>
      {[1, 2, 3, 4].map(i => (
        <View key={i} style={{
          width: 4, height: 4 + i * 3,
          backgroundColor: i <= strength ? "#00d4ff" : "#1e2a3d",
          borderRadius: 1,
        }} />
      ))}
    </View>
  );
}

export default function BLEScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { getLocation, sendEmergencySMS } = useEmergency();
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<BLEDevice[]>([]);
  const [connected, setConnected] = useState<BLEDevice | null>(null);
  const [monitoring, setMonitoring] = useState(false);
  const [lastSignal, setLastSignal] = useState<string | null>(null);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);

  const scanAnim = useRef(new Animated.Value(0)).current;
  const monitorAnim = useRef(new Animated.Value(1)).current;
  const sosSimTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("orbit_contacts").then(s => {
      if (s) setContacts(JSON.parse(s));
    });
  }, []);

  const startScan = () => {
    setScanning(true);
    setDevices([]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Animated.loop(
      Animated.timing(scanAnim, { toValue: 1, duration: 2000, useNativeDriver: true })
    ).start();

    const timeouts: ReturnType<typeof setTimeout>[] = [];
    MOCK_DEVICES.forEach((d, i) => {
      timeouts.push(setTimeout(() => {
        setDevices(prev => [...prev, d]);
        Haptics.selectionAsync();
      }, 800 + i * 600));
    });

    setTimeout(() => {
      setScanning(false);
      scanAnim.stopAnimation();
      timeouts.forEach(clearTimeout);
    }, 3500);
  };

  const connectDevice = (device: BLEDevice) => {
    if (!device.isDeneyap) {
      Alert.alert("Hata", "Sadece Deneyap kartları ORBIT-MESH ile uyumludur.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setConnected(device);
    setDevices(prev => prev.map(d => ({ ...d, isConnected: d.id === device.id })));
    setMonitoring(true);
    setLastSignal(new Date().toLocaleTimeString("tr-TR"));

    Animated.loop(
      Animated.sequence([
        Animated.timing(monitorAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(monitorAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  };

  const disconnect = () => {
    Alert.alert("Bağlantıyı Kes", "Deneyap kartından bağlantıyı kesmek istiyor musun?", [
      { text: "İptal", style: "cancel" },
      { text: "Kes", onPress: () => {
        setConnected(null);
        setMonitoring(false);
        monitorAnim.stopAnimation();
        Animated.timing(monitorAnim, { toValue: 1, duration: 1, useNativeDriver: true }).start();
      }},
    ]);
  };

  const simulateSOS = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setLastSignal(new Date().toLocaleTimeString("tr-TR") + " ⚠️ SOS");
    const locationText = await getLocation();
    await sendEmergencySMS(contacts, user?.name ?? "Kullanıcı", locationText);
    router.push({ pathname: "/emergency", params: { reason: "ble", auto: "1" } } as never);
  };

  const scanScale = scanAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.8, 1.5, 0.8] });
  const scanOpacity = scanAnim.interpolate({ inputRange: [0, 0.3, 0.7, 1], outputRange: [0, 0.6, 0.3, 0] });

  return (
    <LinearGradient colors={["#0a0e1a", "#0d1424"]} style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#00d4ff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>BLE Deneyap</Text>
          <Text style={styles.subtitle}>Deneyap Kart Eşleştirme</Text>
        </View>
        {connected && (
          <View style={styles.connectedBadge}>
            <View style={styles.connectedDot} />
            <Text style={styles.connectedText}>Bağlı</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {!connected ? (
          <View style={styles.scanSection}>
            <View style={styles.scanVisual}>
              <View style={styles.scanCenter}>
                <Feather name="bluetooth" size={32} color="#00d4ff" />
              </View>
              {scanning && (
                <>
                  {[1, 2, 3].map(i => (
                    <Animated.View key={i} style={[styles.scanRing, {
                      width: 60 + i * 50, height: 60 + i * 50,
                      borderRadius: (60 + i * 50) / 2,
                      transform: [{ scale: scanning ? scanScale : 1 }],
                      opacity: scanning ? scanOpacity : 0,
                    }]} />
                  ))}
                </>
              )}
            </View>

            <TouchableOpacity style={[styles.scanBtn, scanning && styles.scanBtnActive]} onPress={startScan} disabled={scanning} activeOpacity={0.8}>
              <Feather name={scanning ? "loader" : "search"} size={18} color={scanning ? "#0a0e1a" : "#00d4ff"} />
              <Text style={[styles.scanBtnText, scanning && { color: "#0a0e1a" }]}>
                {scanning ? "Taranıyor..." : "Cihaz Tara"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.connectedSection}>
            <Animated.View style={[styles.deviceConnected, { transform: [{ scale: monitorAnim }] }]}>
              <View style={styles.deviceConnectedIcon}>
                <Feather name="bluetooth" size={28} color="#00d4ff" />
              </View>
              <Text style={styles.deviceConnectedName}>{connected.name}</Text>
              <Text style={styles.deviceConnectedId}>{connected.id}</Text>
              <View style={styles.monitorStatus}>
                <View style={styles.monitorDot} />
                <Text style={styles.monitorText}>SOS Sinyali İzleniyor</Text>
              </View>
            </Animated.View>

            {lastSignal && (
              <View style={styles.lastSignalCard}>
                <Feather name="radio" size={14} color="#00d4ff" />
                <Text style={styles.lastSignalText}>Son sinyal: {lastSignal}</Text>
              </View>
            )}

            <View style={styles.protocolCard}>
              <Text style={styles.protocolTitle}>ORBIT-MESH Protokolü</Text>
              <View style={styles.protocolRow}>
                <Text style={styles.protocolLabel}>Servis UUID:</Text>
                <Text style={styles.protocolValue}>12345678-1234-...ORBIT</Text>
              </View>
              <View style={styles.protocolRow}>
                <Text style={styles.protocolLabel}>Karakteristik:</Text>
                <Text style={styles.protocolValue}>SOS_TRIGGER = 0x01</Text>
              </View>
              <View style={styles.protocolRow}>
                <Text style={styles.protocolLabel}>Durum:</Text>
                <Text style={[styles.protocolValue, { color: "#00ff88" }]}>AKTİF</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.sosSimBtn} onPress={simulateSOS} activeOpacity={0.8}>
              <Feather name="alert-triangle" size={18} color="#ff3b5c" />
              <Text style={styles.sosSimText}>SOS Simüle Et (Test)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.disconnectBtn} onPress={disconnect} activeOpacity={0.8}>
              <Feather name="x-circle" size={16} color="#64748b" />
              <Text style={styles.disconnectText}>Bağlantıyı Kes</Text>
            </TouchableOpacity>
          </View>
        )}

        {devices.length > 0 && !connected && (
          <View style={styles.devicesSection}>
            <Text style={styles.sectionTitle}>Bulunan Cihazlar</Text>
            {devices.map(device => (
              <TouchableOpacity key={device.id} style={[styles.deviceCard, !device.isDeneyap && styles.deviceCardDim]} onPress={() => connectDevice(device)} activeOpacity={0.8}>
                <View style={[styles.deviceIcon, { backgroundColor: device.isDeneyap ? "#00d4ff" + "20" : "#374151" }]}>
                  <Feather name="cpu" size={20} color={device.isDeneyap ? "#00d4ff" : "#64748b"} />
                </View>
                <View style={styles.deviceInfo}>
                  <View style={styles.deviceNameRow}>
                    <Text style={styles.deviceName}>{device.name}</Text>
                    {device.isDeneyap && <View style={styles.deneyapBadge}><Text style={styles.deneyapBadgeText}>Deneyap</Text></View>}
                  </View>
                  <Text style={styles.deviceId}>{device.id}</Text>
                </View>
                <View style={styles.deviceRight}>
                  <SignalBars rssi={device.rssi} />
                  <Text style={styles.rssiText}>{device.rssi} dBm</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.infoCard}>
          <Feather name="info" size={16} color="#00d4ff" />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.infoTitle}>Deneyap Kurulumu</Text>
            <Text style={styles.infoText}>
              Deneyap kartına ORBIT-MESH SOS kodunu yükle: bir butona basıldığında BLE karakteristiğine 0x01 değeri yaz.
              Acil durum butonu gibi herhangi bir giriş kullanılabilir.
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14, borderBottomWidth: 1, borderBottomColor: "#1e2a3d" },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "800", color: "#ffffff", fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, color: "#64748b", fontFamily: "Inter_400Regular" },
  connectedBadge: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#00ff88" + "20", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  connectedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#00ff88" },
  connectedText: { color: "#00ff88", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  scroll: { padding: 16 },
  scanSection: { alignItems: "center", gap: 24, paddingVertical: 40 },
  scanVisual: { width: 200, height: 200, alignItems: "center", justifyContent: "center" },
  scanCenter: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#00d4ff" + "20", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#00d4ff" },
  scanRing: { position: "absolute", borderWidth: 1, borderColor: "#00d4ff" },
  scanBtn: {
    flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 14, borderWidth: 2, borderColor: "#00d4ff", backgroundColor: "transparent",
  },
  scanBtnActive: { backgroundColor: "#00d4ff" },
  scanBtnText: { color: "#00d4ff", fontWeight: "700", fontSize: 15, fontFamily: "Inter_700Bold" },
  connectedSection: { gap: 14 },
  deviceConnected: {
    backgroundColor: "#111827", borderRadius: 20, padding: 24, alignItems: "center", gap: 8,
    borderWidth: 2, borderColor: "#00d4ff",
  },
  deviceConnectedIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#00d4ff" + "20", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  deviceConnectedName: { fontSize: 18, fontWeight: "800", color: "#ffffff", fontFamily: "Inter_700Bold" },
  deviceConnectedId: { fontSize: 11, color: "#64748b", fontFamily: "Inter_400Regular" },
  monitorStatus: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  monitorDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#00ff88" },
  monitorText: { color: "#00ff88", fontSize: 13, fontFamily: "Inter_500Medium" },
  lastSignalCard: {
    flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#00d4ff" + "10",
    borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#00d4ff" + "30",
  },
  lastSignalText: { color: "#94a3b8", fontSize: 13, fontFamily: "Inter_400Regular" },
  protocolCard: { backgroundColor: "#111827", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#1e2a3d", gap: 8 },
  protocolTitle: { color: "#94a3b8", fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 },
  protocolRow: { flexDirection: "row", justifyContent: "space-between" },
  protocolLabel: { color: "#64748b", fontSize: 13, fontFamily: "Inter_400Regular" },
  protocolValue: { color: "#00d4ff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  sosSimBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#ff3b5c" + "15", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "#ff3b5c" + "60",
  },
  sosSimText: { color: "#ff3b5c", fontWeight: "700", fontFamily: "Inter_700Bold" },
  disconnectBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 12 },
  disconnectText: { color: "#64748b", fontFamily: "Inter_500Medium" },
  devicesSection: { marginTop: 16 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#ffffff", fontFamily: "Inter_700Bold", marginBottom: 12 },
  deviceCard: {
    backgroundColor: "#111827", borderRadius: 14, padding: 14, flexDirection: "row",
    alignItems: "center", gap: 12, marginBottom: 8, borderWidth: 1, borderColor: "#1e2a3d",
  },
  deviceCardDim: { opacity: 0.5 },
  deviceIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  deviceInfo: { flex: 1 },
  deviceNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  deviceName: { color: "#ffffff", fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  deneyapBadge: { backgroundColor: "#00d4ff" + "20", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  deneyapBadgeText: { color: "#00d4ff", fontSize: 10, fontFamily: "Inter_500Medium" },
  deviceId: { color: "#64748b", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  deviceRight: { alignItems: "center", gap: 4 },
  rssiText: { color: "#64748b", fontSize: 10, fontFamily: "Inter_400Regular" },
  infoCard: {
    flexDirection: "row", gap: 12, backgroundColor: "#111827", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "#00d4ff" + "30", marginTop: 16,
  },
  infoTitle: { color: "#ffffff", fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  infoText: { color: "#64748b", fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
});
