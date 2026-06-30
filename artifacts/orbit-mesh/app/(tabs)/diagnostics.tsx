import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Platform } from 'react-native';
import { Magnetometer, Accelerometer } from 'expo-sensors';
import { Feather } from '@expo/vector-icons';
import { LineChart } from "react-native-chart-kit";
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useBle } from "@/context/BleContext";

const screenWidth = Dimensions.get("window").width - 40;

export default function DiagnosticsScreen() {
  // ── Telefonun kendi sensörleri (manyetometre + ivmeölçer) ──────────────
  // Kullanıcı tarafından istenen "manyetik ve hareket telefonun içindeki
  // jiroskop/ivmeölçer ile ölçülsün" özelliği. ESP32'den gelen veriden
  // BAĞIMSIZ, telefonun kendi donanımından okunur.
  const [magnetoData, setMagnetoData] = useState({ x: 0, y: 0, z: 0 });
  const [accelData, setAccelData] = useState({ x: 0, y: 0, z: 0 });
  const [dataHistory, setDataHistory] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [savedCount, setSavedCount] = useState(0);

  // ── Gerçek BLE/firmware bağlantı durumu ─────────────────────────────────
  // ÖNEMLİ: Bu ekran eskiden isBleActive=true ve currentVlfPin="D8/GPIO15"
  // gibi SABİT KODLANMIŞ (hardcoded) sahte değerlerle "CONFLICT" hatası
  // üretiyordu — gerçek donanımla hiçbir ilgisi yoktu. Artık gerçek
  // BleContext üzerinden cihazın GERÇEKTEN bağlı olup olmadığını,
  // firmware'in gönderdiği gerçek input_fault/anomaly bayraklarını okuyor.
  const { connectedDevice, latestTelemetry, anomalyScore, consensus } = useBle();
  const isBleConnected = !!connectedDevice;
  const hasLiveData = !!latestTelemetry;

  const saveMeasurement = async (mag: { x: number; y: number; z: number }, accel: { x: number; y: number; z: number }) => {
    try {
      const timestamp = new Date().toISOString();
      const newEntry = {
        timestamp,
        mag,
        accel,
        ble_connected: isBleConnected,
        vlf_hz: latestTelemetry?.vlf_hz ?? null,
        anomaly: latestTelemetry?.anomaly ?? null,
      };

      const existingData = await AsyncStorage.getItem('orbit_mesh_observations');
      const logs = existingData ? JSON.parse(existingData) : [];

      logs.push(newEntry);
      if (logs.length > 100) logs.shift();

      await AsyncStorage.setItem('orbit_mesh_observations', JSON.stringify(logs));
      setSavedCount(logs.length);
    } catch (e) {
      console.error("Veri kayıt hatası:", e);
    }
  };

  useEffect(() => {
    AsyncStorage.getItem('orbit_mesh_observations').then(data => {
      if (data) setSavedCount(JSON.parse(data).length);
    });
  }, []);

  useEffect(() => {
    Magnetometer.setUpdateInterval(1000);
    Accelerometer.setUpdateInterval(1000);

    const magSub = Magnetometer.addListener(result => {
      setMagnetoData(result);
      const zValue = parseFloat(result.z.toFixed(1));
      setDataHistory(prev => {
        const newHistory = [...prev.slice(1), zValue];
        return newHistory.some(isNaN) ? [0, 0, 0, 0, 0, 0] : newHistory;
      });
    });

    const accelSub = Accelerometer.addListener(result => {
      setAccelData(result);
    });

    return () => {
      magSub.remove();
      accelSub.remove();
    };
  }, []);

  useEffect(() => {
    saveMeasurement(magnetoData, accelData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [magnetoData.x, magnetoData.y, magnetoData.z]);

  // ── Gerçek Donanım Sağlık Durumu (firmware'den) ─────────────────────────
  const inputFault = (latestTelemetry as any)?.input_fault ?? false;
  const mainsNoise = (latestTelemetry as any)?.mains_noise ?? false;
  const confidenceScore = !isBleConnected
    ? 0
    : !hasLiveData
    ? 40
    : inputFault
    ? 15
    : mainsNoise
    ? 60
    : Math.round(100 - (anomalyScore?.total ?? 0) * 0.3);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>ORBIT-MESH Analiz Paneli</Text>

      <View style={styles.statusRow}>
        <View style={styles.badge}>
          <Feather name="database" size={14} color="#00E5B0" />
          <Text style={styles.badgeText}>Yerel Bellek: {savedCount}/100</Text>
        </View>
        <View style={styles.badge}>
          <Feather name="check-circle" size={14} color={confidenceScore > 70 ? "#00E5B0" : confidenceScore > 40 ? "#FBBF24" : "#FF6B6B"} />
          <Text style={styles.badgeText}>Güven: %{confidenceScore}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Telefon Manyetometre — Z Ekseni</Text>
        <LineChart
          data={{
            labels: ["-5s", "-4s", "-3s", "-2s", "-1s", "Şimdi"],
            datasets: [{ data: dataHistory }]
          }}
          width={screenWidth - 32}
          height={180}
          yAxisSuffix="µT"
          chartConfig={{
            backgroundColor: "#1e293b",
            backgroundGradientFrom: "#1e293b",
            backgroundGradientTo: "#1e293b",
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(56, 189, 248, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
            propsForDots: { r: "4", strokeWidth: "2", stroke: "#0ea5e9" }
          }}
          style={styles.chartStyle}
          bezier
        />
        <Text style={styles.sensorText}>Güncel Z: {magnetoData.z.toFixed(2)} µT</Text>
        <Text style={styles.sensorSubText}>
          İvmeölçer (X/Y/Z): {accelData.x.toFixed(2)} / {accelData.y.toFixed(2)} / {accelData.z.toFixed(2)} g
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Donanım Sağlık Testi (ESP32 Self-Test)</Text>
        <View style={styles.row}>
          <Text style={styles.label}>BLE Bağlantısı:</Text>
          <Text style={[styles.value, !isBleConnected && styles.error]}>
            {isBleConnected ? `BAĞLI (${connectedDevice!.name ?? connectedDevice!.id})` : "BAĞLI DEĞİL"}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Telemetri Akışı:</Text>
          <Text style={[styles.value, !hasLiveData && styles.warn]}>
            {hasLiveData ? "AKTİF" : "VERİ BEKLENİYOR"}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>VLF Giriş Sinyali:</Text>
          <Text style={[styles.value, inputFault && styles.error]}>
            {!hasLiveData ? "—" : inputFault ? "ARIZA (input_fault)" : "STABİL"}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Şebeke Gürültüsü (50Hz):</Text>
          <Text style={[styles.value, mainsNoise && styles.warn]}>
            {!hasLiveData ? "—" : mainsNoise ? "BASKIN" : "NORMAL"}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Mesh Consensus:</Text>
          <Text style={[styles.value, consensus.status !== "Normal" && styles.warn]}>{consensus.status}</Text>
        </View>

        {inputFault && (
          <View style={styles.alertBox}>
            <Feather name="alert-triangle" size={16} color="#FF6B6B" />
            <Text style={styles.alertText}>
              VLF giriş sinyalinde kararsızlık tespit edildi. Anten/OP-AMP devre bağlantısını kontrol edin.
            </Text>
          </View>
        )}
        {!isBleConnected && (
          <View style={[styles.alertBox, { backgroundColor: "#1e2a3a" }]}>
            <Feather name="bluetooth" size={16} color="#38bdf8" />
            <Text style={[styles.alertText, { color: "#38bdf8" }]}>
              ORBIT-MESH cihazına bağlı değilsiniz. BLE Ağı ekranından bağlanın.
            </Text>
          </View>
        )}
      </View>

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc', marginBottom: 15, marginTop: Platform.OS === 'ios' ? 40 : 20 },
  statusRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#334155', gap: 6 },
  badgeText: { color: '#e2e8f0', fontSize: 12, fontWeight: '600' },
  card: { backgroundColor: '#1e293b', padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#38bdf8', marginBottom: 16 },
  chartStyle: { marginVertical: 8, borderRadius: 12, marginLeft: -10 },
  sensorText: { color: '#00E5B0', fontSize: 18, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', textAlign: 'center', marginTop: 10, fontWeight: 'bold' },
  sensorSubText: { color: '#94a3b8', fontSize: 12, textAlign: 'center', marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  label: { color: '#cbd5e1', fontSize: 14 },
  value: { color: '#00E5B0', fontSize: 14, fontWeight: 'bold' },
  error: { color: '#FF6B6B' },
  warn: { color: '#FBBF24' },
  alertBox: { flexDirection: 'row', backgroundColor: '#451a20', padding: 12, borderRadius: 8, marginTop: 12, alignItems: 'center' },
  alertText: { color: '#FF6B6B', fontSize: 12, marginLeft: 8, flex: 1, lineHeight: 18 }
});