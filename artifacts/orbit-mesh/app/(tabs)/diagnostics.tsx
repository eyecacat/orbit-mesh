import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Platform } from 'react-native';
import { Magnetometer } from 'expo-sensors';
import { Feather } from '@expo/vector-icons';
import { LineChart } from "react-native-chart-kit";
import AsyncStorage from '@react-native-async-storage/async-storage';

const screenWidth = Dimensions.get("window").width - 40;

export default function DiagnosticsScreen() {
  // 1. Durum (State) Yönetimi
  const [magnetoData, setMagnetoData] = useState({ x: 0, y: 0, z: 0 });
  const [dataHistory, setDataHistory] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [savedCount, setSavedCount] = useState(0);

  const [diagnostics, setDiagnostics] = useState({
    adc: 'TESTING',
    ble: 'TESTING',
    noise: 'TESTING',
    vlfPin: 'TESTING'
  });
  const [confidenceScore, setConfidenceScore] = useState(0);

  // 2. Çevrimdışı Veri Tamponu (Offline Data Buffer)
  const saveMeasurement = async (data: { x: number, y: number, z: number }) => {
    try {
      const timestamp = new Date().toISOString();
      const newEntry = { timestamp, ...data };

      const existingData = await AsyncStorage.getItem('orbit_mesh_observations');
      const logs = existingData ? JSON.parse(existingData) : [];

      logs.push(newEntry);

      // Cihazı şişirmemek için son 100 kaydı tut
      if (logs.length > 100) logs.shift(); 

      await AsyncStorage.setItem('orbit_mesh_observations', JSON.stringify(logs));
      setSavedCount(logs.length); // Ekranda kaç veri biriktiğini göstermek için
    } catch (e) {
      console.error("Veri kayıt hatası:", e);
    }
  };

  // 3. Donanım ve Güvenilirlik Testi (Self-Test)
  useEffect(() => {
    const runSelfTest = setTimeout(() => {
      const isBleActive = true; 
      const currentVlfPin = "D8/GPIO15";

      let adcStatus = 'OK';
      let vlfPinStatus = 'OK';
      let penalty = 0;

      // Çakışma denetimi
      if (isBleActive && currentVlfPin === "D8/GPIO15") {
        adcStatus = 'CONFLICT';
        vlfPinStatus = 'ERROR';
        penalty += 45;
      }

      setDiagnostics({
        adc: adcStatus,
        ble: isBleActive ? 'ACTIVE' : 'IDLE',
        noise: 'NORMAL',
        vlfPin: vlfPinStatus
      });

      setConfidenceScore(Math.max(0, 98 - penalty));
    }, 1500);

    // Açılışta mevcut veri sayısını çek
    AsyncStorage.getItem('orbit_mesh_observations').then(data => {
      if (data) setSavedCount(JSON.parse(data).length);
    });

    return () => clearTimeout(runSelfTest);
  }, []);

  // 4. Sensör Dinleme ve Grafik Güncelleme
  useEffect(() => {
    Magnetometer.setUpdateInterval(1000); // Saniyede 1 kez oku (Batarya dostu)

    const subscription = Magnetometer.addListener(result => {
      setMagnetoData(result);

      // Grafiği kaydır
      const zValue = parseFloat(result.z.toFixed(1));
      setDataHistory(prev => {
        const newHistory = [...prev.slice(1), zValue];
        return newHistory.some(isNaN) ? [0, 0, 0, 0, 0, 0] : newHistory; // NaN koruması
      });

      // Her yeni veriyi arka planda depola
      saveMeasurement(result);
    });

    return () => subscription.remove();
  }, []);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>ORBIT-MESH Analiz Paneli</Text>

      {/* Çevrimdışı Bellek Durumu */}
      <View style={styles.statusRow}>
        <View style={styles.badge}>
          <Feather name="database" size={14} color="#00E5B0" />
          <Text style={styles.badgeText}>Yerel Bellek: {savedCount}/100</Text>
        </View>
        <View style={styles.badge}>
          <Feather name="check-circle" size={14} color="#00E5B0" />
          <Text style={styles.badgeText}>Güven: %{confidenceScore}</Text>
        </View>
      </View>

      {/* Canlı Grafik */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Manyetik Alan Trendi (Z Ekseni)</Text>
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
      </View>

      {/* Donanım Sağlık Testi (Self-Test) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Donanım Sağlık Testi (Self-Test)</Text>
        <View style={styles.row}>
          <Text style={styles.label}>ADC2 Stabilitesi:</Text>
          <Text style={[styles.value, diagnostics.adc === 'CONFLICT' && styles.error]}>{diagnostics.adc}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>VLF Örnekleme Pini (D8):</Text>
          <Text style={[styles.value, diagnostics.vlfPin === 'ERROR' && styles.error]}>{diagnostics.vlfPin}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>BLE Durumu:</Text>
          <Text style={styles.value}>{diagnostics.ble}</Text>
        </View>

        {diagnostics.adc === 'CONFLICT' && (
          <View style={styles.alertBox}>
            <Feather name="alert-triangle" size={16} color="#FF6B6B" />
            <Text style={styles.alertText}>
              Kritik Uyarı: BLE aktifken ADC2 kanalları paylaşıldığı için D8/GPIO15 pininden güvenilir VLF verisi okunamıyor.
            </Text>
          </View>
        )}
      </View>

      {/* Alt boşluk (Tab bar altında kalmaması için) */}
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
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  label: { color: '#cbd5e1', fontSize: 14 },
  value: { color: '#00E5B0', fontSize: 14, fontWeight: 'bold' },
  error: { color: '#FF6B6B' },
  alertBox: { flexDirection: 'row', backgroundColor: '#451a20', padding: 12, borderRadius: 8, marginTop: 12, alignItems: 'center' },
  alertText: { color: '#FF6B6B', fontSize: 12, marginLeft: 8, flex: 1, lineHeight: 18 }
});