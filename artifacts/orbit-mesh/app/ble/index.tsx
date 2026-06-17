import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const SERVICE_UUID = "12345678-1234-1234-1234-123456789abc";
const ORBIT_NAME_PREFIX = "ORBIT-MESH";
const SCAN_TIMEOUT = 15000;

interface BleDevice {
  id: string;
  name: string | null;
  rssi: number | null;
  isConnectable: boolean | null;
  manufacturerData: string | null;
  serviceUUIDs: string[] | null;
  raw: unknown;
}

interface TelemetryPoint {
  timestamp: number;
  nodeId: string;
  vlf_hz: number;
  vlf_amplitude: number;
  battery: number;
  temp_c: number;
  anomaly: boolean;
}

interface LogEntry {
  id: string;
  time: string;
  type: "info" | "warn" | "error" | "scan";
  message: string;
}

let BleManagerModule: typeof import("react-native-ble-plx").BleManager | null = null;
function getBleManager() {
  if (BleManagerModule) return BleManagerModule;
  try {
    const { BleManager } = require("react-native-ble-plx");
    BleManagerModule = new BleManager();
    return BleManagerModule;
  } catch {
    return null;
  }
}

function isExpoGo(): boolean {
  try {
    const Constants = require("expo-constants").default;
    return Constants.appOwnership === "expo";
  } catch {
    return false;
  }
}

export default function BleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<BleDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<BleDevice | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [permissionsOk, setPermissionsOk] = useState<boolean | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [bleAvailable, setBleAvailable] = useState<boolean | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const discoveredIds = useRef<Set<string>>(new Set());
  const managerRef = useRef<ReturnType<typeof getBleManager>>(null);

  const addLog = useCallback((type: LogEntry["type"], message: string) => {
    const time = new Date().toLocaleTimeString("tr-TR", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLogs(prev => [{ id: Date.now().toString() + Math.random().toString(36).slice(2, 5), time, type, message }, ...prev].slice(0, 200));
  }, []);

  // Check BLE availability
  useEffect(() => {
    if (Platform.OS === "web") {
      setBleAvailable(false);
      addLog("warn", "Web ortamında BLE desteklenmiyor. Fiziksel cihazda test edin.");
      return;
    }
    const mgr = getBleManager();
    if (!mgr) {
      setBleAvailable(false);
      addLog("error", "react-native-ble-plx modülü bulunamadı. Expo Go'da BLE native modülü çalışmaz.");
      return;
    }
    managerRef.current = mgr;
    mgr.state()
      .then(state => {
        const ok = state === "PoweredOn";
        setBleAvailable(ok);
        addLog("info", `Bluetooth durumu: ${state}`);
        if (!ok) {
          addLog("warn", "Bluetooth kapalı. Lütfen Bluetooth'u açın.");
        }
      })
      .catch(err => {
        setBleAvailable(false);
        addLog("error", `BLE durum okuma hatası: ${err?.message ?? err}`);
      });

    const sub = mgr.onStateChange(state => {
      const ok = state === "PoweredOn";
      setBleAvailable(ok);
      addLog("info", `Bluetooth durum değişti: ${state}`);
    }, true);

    return () => {
      sub.remove();
    };
  }, [addLog]);

  // Check permissions
  useEffect(() => {
    if (Platform.OS === "web") {
      setPermissionsOk(false);
      return;
    }
    if (Platform.OS === "ios") {
      setPermissionsOk(true);
      return;
    }
    (async () => {
      try {
        const { PermissionsAndroid } = require("react-native");
        let allGranted = false;

if (Platform.Version >= 31) {
  const results = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  ]);

  allGranted = Object.values(results).every(
    r => r === PermissionsAndroid.RESULTS.GRANTED
  );
} else {
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
  );

  allGranted = result === PermissionsAndroid.RESULTS.GRANTED;
}

setPermissionsOk(allGranted);
        if (allGranted) {
          addLog("info", "Android BLE izinleri verildi: BLUETOOTH_SCAN, BLUETOOTH_CONNECT, ACCESS_FINE_LOCATION");
        } else {
          const denied = Object.entries(results)
            .filter(([, v]) => v !== PermissionsAndroid.RESULTS.GRANTED)
            .map(([k]) => k)
            .join(", ");
          addLog("error", `Android izinleri reddedildi: ${denied}`);
        }
      } catch (err) {
        setPermissionsOk(false);
        addLog("error", `İzin kontrolü hatası: ${err?.message ?? err}`);
      }
    })();
  }, [addLog]);

  function startScan() {
    if (Platform.OS === "web") {
      Alert.alert("BLE Yok", "Web ortamında BLE desteklenmiyor.");
      return;
    }
    const mgr = managerRef.current;
    if (!mgr) {
      Alert.alert("BLE Modülü Yok", "react-native-ble-plx bulunamadı. Bu bir development build (EAS) ile çalışır.");
      return;
    }
    if (isExpoGo()) {
      Alert.alert("Expo Go Uyarısı", "BLE native modülleri Expo Go'da çalışmaz. EAS Development Build ile çalıştırın.");
      return;
    }

    setScanning(true);
    setDevices([]);
    discoveredIds.current.clear();
    addLog("info", "BLE taraması başlatıldı...");
    addLog("info", `Filtre: name startsWith("${ORBIT_NAME_PREFIX}") || serviceUUIDs includes "${SERVICE_UUID}"`);

    mgr.startDeviceScan(
      [SERVICE_UUID],
      { scanMode: 2, allowDuplicates: true },
      (error, device) => {
        if (error) {
          addLog("error", `Tarama hatası: ${error.message} (code: ${error.errorCode})`);
          setScanning(false);
          return;
        }
        if (!device) return;

        const name = device.name ?? device.localName ?? null;
        const id = device.id;
        const rssi = device.rssi ?? null;
        const isConnectable = device.isConnectable ?? null;
        const serviceUUIDs = device.serviceUUIDs ?? null;
        const manufacturerData = device.manufacturerData ?? null;

        const logMsg =
          `Found Device:\n` +
          `  name = ${name ?? "(null)"}\n` +
          `  id = ${id}\n` +
          `  rssi = ${rssi ?? "(null)"}\n` +
          `  isConnectable = ${isConnectable ?? "(null)"}\n` +
          `  serviceUUIDs = ${JSON.stringify(serviceUUIDs)}\n` +
          `  manufacturerData = ${manufacturerData ?? "(null)"}`;
        addLog("scan", logMsg);

        // Filter: name must start with ORBIT-MESH, OR serviceUUID must match
        const matchesName = name ? name.startsWith(ORBIT_NAME_PREFIX) : false;
        const matchesService = serviceUUIDs ? serviceUUIDs.includes(SERVICE_UUID) : false;
        if (!matchesName && !matchesService) {
          addLog("scan", `  → FİLTRE: REDDETİLDİ (name ${matchesName ? "✓" : "✗"}, serviceUUID ${matchesService ? "✓" : "✗"})`);
          return;
        }
        addLog("scan", `  → FİLTRE: KABUL EDİLDİ`);

        if (!discoveredIds.current.has(id)) {
          discoveredIds.current.add(id);
          const newDevice: BleDevice = {
            id,
            name,
            rssi,
            isConnectable,
            manufacturerData,
            serviceUUIDs,
            raw: device,
          };
          setDevices(prev => [...prev, newDevice].sort((a, b) => (b.rssi ?? -100) - (a.rssi ?? -100)));
        } else {
          // Update RSSI
          setDevices(prev =>
            prev.map(d => (d.id === id ? { ...d, rssi, isConnectable } : d)).sort((a, b) => (b.rssi ?? -100) - (a.rssi ?? -100))
          );
        }
      }
    );

    scanTimerRef.current = setTimeout(() => {
      mgr.stopDeviceScan();
      setScanning(false);
      addLog("info", "Tarama zaman aşımı (15s).");
    }, SCAN_TIMEOUT);
  }

  function stopScan() {
    const mgr = managerRef.current;
    if (mgr) mgr.stopDeviceScan();
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    setScanning(false);
    addLog("info", "Tarama durduruldu.");
  }

  async function connectToDevice(device: BleDevice) {
    const mgr = managerRef.current;
    if (!mgr) return;
    addLog("info", `Bağlanıyor: ${device.name ?? device.id}...`);
    try {
      const bleDevice = device.raw as import("react-native-ble-plx").Device;
      const connected = await bleDevice.connect({ requestMTU: 512 });
      addLog("info", `Bağlantı kuruldu: ${connected.id}`);
      setConnectedDevice(device);

      const discovered = await connected.discoverAllServicesAndCharacteristics();
      addLog("info", `Servisler keşfedildi: ${discovered.id}`);

      const services = await discovered.services();
      for (const svc of services) {
        addLog("info", `  Servis: ${svc.uuid}`);
        const chars = await svc.characteristics();
        for (const ch of chars) {
          addLog("info", `    Karakteristik: ${ch.uuid} | readable=${ch.isReadable} | notifiable=${ch.isNotifiable} | writable=${ch.isWritableWithResponse}`);
          if (ch.isNotifiable && svc.uuid.toLowerCase().includes(SERVICE_UUID.toLowerCase())) {
            addLog("info", `    → Bildirim aboneliği başlatılıyor: ${ch.uuid}`);
            ch.monitor((err, characteristic) => {
              if (err) {
                addLog("error", `Bildirim hatası: ${err.message}`);
                return;
              }
              if (characteristic?.value) {
                const decoded = decodeBase64(characteristic.value);
                addLog("info", `Bildirim alındı: ${decoded}`);
                try {
                  const parsed = JSON.parse(decoded);
                  const point: TelemetryPoint = {
                    timestamp: parsed.timestamp ?? Date.now(),
                    nodeId: parsed.nodeId ?? "unknown",
                    vlf_hz: parsed.vlf_hz ?? 0,
                    vlf_amplitude: parsed.vlf_amplitude ?? 0,
                    battery: parsed.battery ?? 0,
                    temp_c: parsed.temp_c ?? 0,
                    anomaly: parsed.anomaly ?? false,
                  };
                  setTelemetry(prev => [point, ...prev].slice(0, 100));
                } catch {
                  addLog("warn", `JSON parse hatası: ${decoded}`);
                }
              }
            });
          }
        }
      }
    } catch (err: any) {
      addLog("error", `Bağlantı hatası: ${err?.message ?? err}`);
      Alert.alert("Bağlantı Hatası", err?.message ?? "Bilinmeyen hata");
    }
  }

  function disconnect() {
    const mgr = managerRef.current;
    if (!mgr || !connectedDevice) return;
    const bleDevice = connectedDevice.raw as import("react-native-ble-plx").Device;
    bleDevice
      .cancelConnection()
      .then(() => {
        addLog("info", "Bağlantı kesildi.");
        setConnectedDevice(null);
      })
      .catch((err: any) => {
        addLog("error", `Bağlantı kesme hatası: ${err?.message ?? err}`);
      });
  }

  function decodeBase64(value: string): string {
    try {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
      let output = "";
      const str = value.replace(/[^A-Za-z0-9+/=]/g, "");
      for (let i = 0; i < str.length; i += 4) {
        const a = chars.indexOf(str.charAt(i));
        const b = chars.indexOf(str.charAt(i + 1));
        const c = chars.indexOf(str.charAt(i + 2));
        const d = chars.indexOf(str.charAt(i + 3));
        const e = (a << 2) | (b >> 4);
        const f = ((b & 15) << 4) | (c >> 2);
        const g = ((c & 3) << 6) | d;
        if (e !== 0) output += String.fromCharCode(e);
        if (c !== 64 && f !== 0) output += String.fromCharCode(f);
        if (d !== 64 && g !== 0) output += String.fromCharCode(g);
      }
      return output;
    } catch {
      return value;
    }
  }

  const isWeb = Platform.OS === "web";
  const isReady = bleAvailable === true && permissionsOk === true;
  const isBlocked = bleAvailable === false || permissionsOk === false || isWeb || isExpoGo();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>BLE Ağı</Text>
        <Pressable onPress={() => setShowDebug(v => !v)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Feather name="terminal" size={22} color={showDebug ? colors.primary : colors.mutedForeground} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        <View style={[styles.statusBanner, {
          backgroundColor: isBlocked ? colors.danger + "22" : colors.accent + "22",
          borderColor: isBlocked ? colors.danger + "66" : colors.accent + "66",
        }]}>
          <Feather name={isBlocked ? "alert-triangle" : "bluetooth"} size={20} color={isBlocked ? colors.danger : colors.accent} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.bannerTitle, { color: isBlocked ? colors.danger : colors.accent }]}>
              {isWeb ? "Web Ortamı — BLE Yok" :
               isExpoGo() ? "Expo Go — BLE Çalışmaz" :
               bleAvailable === false ? "Bluetooth Kapalı" :
               permissionsOk === false ? "İzinler Eksik" :
               "BLE Hazır"}
            </Text>
            <Text style={[styles.bannerDesc, { color: colors.mutedForeground }]}>
              {isWeb ? "Fiziksel cihazda (Android/iOS) test edin." :
               isExpoGo() ? "EAS Development Build ile çalıştırın." :
               bleAvailable === false ? "Bluetooth'u açın ve tekrar deneyin." :
               permissionsOk === false ? "Android BLE izinlerini verin." :
               "Tarama başlatabilirsiniz."}
            </Text>
          </View>
        </View>

        {/* Scan Button */}
        <Pressable
          style={({ pressed }) => [
            styles.scanBtn,
            {
              backgroundColor: scanning ? colors.muted : isBlocked ? colors.muted : colors.primary,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          onPress={scanning ? stopScan : startScan}
          disabled={isBlocked}
        >
          {scanning ? (
            <>
              <ActivityIndicator color={colors.background} size="small" />
              <Text style={[styles.scanText, { color: colors.background }]}>Taranıyor... ({devices.length} bulundu)</Text>
            </>
          ) : (
            <>
              <Feather name="search" size={18} color={colors.background} />
              <Text style={[styles.scanText, { color: colors.background }]}>Cihaz Tara</Text>
            </>
          )}
        </Pressable>

        {/* Connected Device */}
        {connectedDevice && (
          <View style={[styles.connectedCard, { backgroundColor: colors.card, borderColor: colors.accent + "66" }]}>
            <LinearGradient colors={[colors.accent + "22", "transparent"]} style={StyleSheet.absoluteFill} />
            <View style={styles.connectedRow}>
              <Feather name="check-circle" size={20} color={colors.accent} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.connectedName, { color: colors.foreground }]}>{connectedDevice.name ?? "Bilinmeyen Cihaz"}</Text>
                <Text style={[styles.connectedId, { color: colors.mutedForeground }]}>{connectedDevice.id}</Text>
              </View>
              <Pressable onPress={disconnect} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                <Feather name="x-circle" size={22} color={colors.danger} />
              </Pressable>
            </View>
          </View>
        )}

        {/* Device List */}
        {devices.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Keşfedilen Cihazlar ({devices.length})</Text>
            {devices.map(device => {
              const signal = device.rssi ?? -100;
              const signalColor = signal > -60 ? colors.accent : signal > -80 ? colors.warning : colors.danger;
              return (
                <Pressable
                  key={device.id}
                  style={({ pressed }) => [
                    styles.deviceCard,
                    { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                  ]}
                  onPress={() => connectToDevice(device)}
                >
                  <View style={styles.deviceRow}>
                    <View style={[styles.deviceIcon, { backgroundColor: colors.primary + "22" }]}>
                      <Feather name="bluetooth" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.deviceName, { color: colors.foreground }]}>
                        {device.name ?? "(İsimsiz)"}
                      </Text>
                      <Text style={[styles.deviceId, { color: colors.mutedForeground }]}>{device.id}</Text>
                      <Text style={[styles.deviceUuids, { color: colors.mutedForeground }]}>
                        {device.serviceUUIDs?.join(", ") ?? "Servis yok"}
                      </Text>
                    </View>
                    <View style={styles.rssiCol}>
                      <Text style={[styles.rssiValue, { color: signalColor }]}>{device.rssi ?? "?"} dBm</Text>
                      <View style={[styles.rssiBar, { backgroundColor: colors.muted }]}>
                        <View style={[styles.rssiFill, { backgroundColor: signalColor, width: `${Math.max(0, Math.min(100, (signal + 100) / 60 * 100))}%` }]} />
                      </View>
                    </View>
                    <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
                  </View>
                </Pressable>
              );
            })}
          </>
        )}

        {/* Telemetry Stream */}
        {telemetry.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Canlı Telemetri</Text>
            <View style={[styles.telemetryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <FlatList
                data={telemetry.slice(0, 10)}
                keyExtractor={t => t.timestamp.toString()}
                renderItem={({ item }) => (
                  <View style={[styles.telemetryRow, { borderColor: colors.border }]}>
                    <View style={styles.telemetryCol}>
                      <Text style={[styles.telemetryLabel, { color: colors.mutedForeground }]}>VLF</Text>
                      <Text style={[styles.telemetryValue, { color: colors.primary }]}>{item.vlf_hz.toFixed(2)} Hz</Text>
                    </View>
                    <View style={styles.telemetryCol}>
                      <Text style={[styles.telemetryLabel, { color: colors.mutedForeground }]}>Amplitüd</Text>
                      <Text style={[styles.telemetryValue, { color: colors.primary }]}>{item.vlf_amplitude.toFixed(3)}</Text>
                    </View>
                    <View style={styles.telemetryCol}>
                      <Text style={[styles.telemetryLabel, { color: colors.mutedForeground }]}>Batarya</Text>
                      <Text style={[styles.telemetryValue, { color: item.battery > 20 ? colors.accent : colors.danger }]}>%{item.battery}</Text>
                    </View>
                    <View style={styles.telemetryCol}>
                      <Text style={[styles.telemetryLabel, { color: colors.mutedForeground }]}>Sıcaklık</Text>
                      <Text style={[styles.telemetryValue, { color: colors.foreground }]}>{item.temp_c}°C</Text>
                    </View>
                    {item.anomaly && (
                      <View style={[styles.anomalyBadge, { backgroundColor: colors.danger + "22" }]}>
                        <Text style={[styles.anomalyText, { color: colors.danger }]}>ANOMALİ</Text>
                      </View>
                    )}
                  </View>
                )}
                showsVerticalScrollIndicator={false}
                scrollEnabled={false}
              />
            </View>
          </>
        )}

        {/* Empty State */}
        {!scanning && devices.length === 0 && !connectedDevice && (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="bluetooth" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Henüz cihaz bulunmadı</Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              Deneyap Kart ORBIT-MESH firmware ile BLE modunda başlatıldığını doğrulayın.
            </Text>
            <Text style={[styles.emptyUuid, { color: colors.mutedForeground }]}>
              Beklenen: name="{ORBIT_NAME_PREFIX}-*", serviceUUID="{SERVICE_UUID}"
            </Text>
          </View>
        )}

        {/* Firmware Info */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Beklenen Cihaz Bilgisi</Text>
        <View style={[styles.codeBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Text style={[styles.code, { color: colors.accent }]}>
            {`Device Name:  ORBIT-MESH-NODE1
Service UUID: ${SERVICE_UUID}
Expected JSON:
{
  "nodeId": "DYK-001",
  "timestamp": 1700000000,
  "vlf_hz": 7.83,
  "vlf_amplitude": 0.42,
  "battery": 87,
  "temp_c": 23.5,
  "anomaly": false
}`}
          </Text>
        </View>
      </ScrollView>

      {/* Debug Logs Panel */}
      {showDebug && (
        <View style={[styles.debugPanel, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={[styles.debugHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.debugTitle, { color: colors.foreground }]}>BLE Debug Logları</Text>
            <Pressable onPress={() => setLogs([])}>
              <Text style={[styles.debugClear, { color: colors.primary }]}>Temizle</Text>
            </Pressable>
          </View>
          <FlatList
            data={logs}
            keyExtractor={l => l.id}
            renderItem={({ item }) => {
              const color = item.type === "error" ? colors.danger : item.type === "warn" ? colors.warning : item.type === "scan" ? colors.accent : colors.mutedForeground;
              return (
                <View style={styles.logRow}>
                  <Text style={[styles.logTime, { color: colors.mutedForeground }]}>{item.time}</Text>
                  <Text style={[styles.logType, { color }]}>[{item.type.toUpperCase()}]</Text>
                  <Text style={[styles.logMessage, { color: colors.foreground }]}>{item.message}</Text>
                </View>
              );
            }}
            contentContainerStyle={{ padding: 12 }}
            inverted
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={[styles.emptyLog, { color: colors.mutedForeground }]}>Henüz log yok. Tara butonuna basın.</Text>
            }
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statusBanner: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 16 },
  bannerTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  bannerDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  scanBtn: { flexDirection: "row", alignItems: "center", gap: 10, justifyContent: "center", paddingVertical: 14, borderRadius: 14, marginBottom: 16 },
  scanText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  connectedCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16, overflow: "hidden" },
  connectedRow: { flexDirection: "row", alignItems: "center" },
  connectedName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  connectedId: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 12, marginTop: 8 },
  deviceCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  deviceRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  deviceIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  deviceName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  deviceId: { fontSize: 11, fontFamily: "Inter_400Regular" },
  deviceUuids: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  rssiCol: { alignItems: "flex-end", marginRight: 8 },
  rssiValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
  rssiBar: { width: 40, height: 4, borderRadius: 2, marginTop: 4, overflow: "hidden" },
  rssiFill: { height: 4, borderRadius: 2 },
  telemetryCard: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 16 },
  telemetryRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1 },
  telemetryCol: { alignItems: "center" },
  telemetryLabel: { fontSize: 9, fontFamily: "Inter_400Regular" },
  telemetryValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
  anomalyBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  anomalyText: { fontSize: 9, fontFamily: "Inter_700Bold" },
  emptyCard: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: "center", gap: 10, marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  emptyUuid: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4 },
  codeBox: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 16 },
  code: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 20 },
  debugPanel: { position: "absolute", bottom: 0, left: 0, right: 0, height: 320, borderTopWidth: 1 },
  debugHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, borderBottomWidth: 1 },
  debugTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  debugClear: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  logRow: { marginBottom: 6 },
  logTime: { fontSize: 10, fontFamily: "Inter_400Regular" },
  logType: { fontSize: 10, fontFamily: "Inter_700Bold" },
  logMessage: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
  emptyLog: { textAlign: "center", padding: 20, fontSize: 13, fontFamily: "Inter_400Regular" },
});
