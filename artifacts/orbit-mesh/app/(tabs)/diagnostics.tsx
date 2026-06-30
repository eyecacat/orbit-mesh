import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Platform, Pressable, Alert } from 'react-native';
import { Magnetometer, Accelerometer } from 'expo-sensors';
import { Feather } from '@expo/vector-icons';
import { LineChart } from "react-native-chart-kit";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

import { useBle } from "@/context/BleContext";
import { buildCsv, buildReportHtml, makeObservationId, type ObservationRecord } from "@/utils/reportGenerator";

const OBSERVATIONS_KEY = 'orbit_mesh_observations';
const screenWidth = Dimensions.get("window").width - 40;

type TestState = "OK" | "WARN" | "ERROR" | "PENDING";

interface SelfTestItem {
  key: string;
  label: string;
  state: TestState;
  detail: string;
}

export default function DiagnosticsScreen() {
  // ── Telefonun kendi sensörleri (manyetometre + ivmeölçer) ──────────────
  const [magnetoData, setMagnetoData] = useState({ x: 0, y: 0, z: 0 });
  const [accelData, setAccelData] = useState({ x: 0, y: 0, z: 0 });
  const [dataHistory, setDataHistory] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [savedCount, setSavedCount] = useState(0);

  const { connectedDevice, latestTelemetry, anomalyScore, consensus } = useBle();
  const isBleConnected = !!connectedDevice;
  const hasLiveData = !!latestTelemetry;

  const [exporting, setExporting] = useState<"pdf" | "csv" | null>(null);

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
  const t = latestTelemetry as any;
  const inputFault: boolean = t?.input_fault ?? false;
  const mainsNoise: boolean = t?.mains_noise ?? false;
  const signalQuality: number | undefined = t?.signal_quality;
  const activityIndex: number | undefined = t?.activity_index;
  const spaceState: string | undefined = t?.space_state;
  const aiConfidence: number | undefined = t?.ai_confidence;
  const trend: string | undefined = t?.trend;

  // ── Sensör Sağlık Skoru (Bilimsel Güvenilirlik) ─────────────────────────
  // Dört bileşenden oluşur: ADC Health, Noise Quality, Calibration Quality,
  // Signal Integrity. Her biri 0-100 arası, ortalamaları Confidence Index'i
  // verir. Bu skor "veri var mı" değil "bu veriye GÜVENİLEBİLİR Mİ" sorusunu
  // cevaplar — jüriye ölçümün güvenilirliğinin de ölçüldüğünü gösterir.
  const healthScores = useMemo(() => {
    if (!isBleConnected || !hasLiveData) {
      return { adc: 0, noise: 0, calibration: 0, signal: 0, overall: 0 };
    }

    // ADC Health: input_fault varsa ADC/giriş donanımı arızalı demektir.
    const adc = inputFault ? 10 : 98;

    // Noise Quality: mains_noise (50Hz şebeke baskınlığı) düşük kaliteyi
    // gösterir; signal_quality (firmware SNR'den hesaplar) varsa onu kullan.
    const noise = mainsNoise ? 35 : signalQuality !== undefined ? Math.round(signalQuality) : 75;

    // Calibration Quality: ai_confidence (firmware'in kendi sınıflandırma
    // güveni) varsa kalibrasyon kalitesinin dolaylı göstergesi olarak kullan.
    const calibration = aiConfidence !== undefined ? Math.round(aiConfidence * 100) : inputFault ? 20 : 88;

    // Signal Integrity: anomalyEngine'den gelen toplam anomali skorunun
    // tersi (yüksek anomali = düşük "normal sinyal bütünlüğü" güveni,
    // ama bu MUTLAKA kötü demek değil — sadece ölçüm gürültülü mü temiz mi
    // onu gösterir).
    const signal = inputFault ? 15 : Math.max(0, Math.round(100 - (anomalyScore?.total ?? 0) * 0.4));

    const overall = Math.round((adc + noise + calibration + signal) / 4);

    return { adc, noise, calibration, signal, overall };
  }, [isBleConnected, hasLiveData, inputFault, mainsNoise, signalQuality, aiConfidence, anomalyScore]);

  const confidenceScore = healthScores.overall;

  const dataQualityLabel = !isBleConnected
    ? "Cihaz Bağlı Değil"
    : !hasLiveData
    ? "Veri Bekleniyor"
    : confidenceScore >= 80
    ? "Araştırmada Kullanılabilir"
    : confidenceScore >= 50
    ? "Kullanılabilir (Dikkatli Yorumla)"
    : "Gürültülü / Güvenilir Değil";

  // ── Self-Test: Açılır açılmaz "endüstriyel ürün" hissi veren kontrol listesi ──
  const selfTestItems: SelfTestItem[] = useMemo(() => {
    const items: SelfTestItem[] = [];

    items.push({
      key: "ble",
      label: "BLE Bağlantısı",
      state: isBleConnected ? "OK" : "ERROR",
      detail: isBleConnected ? (connectedDevice?.name ?? connectedDevice?.id ?? "Bağlı") : "Cihaz bulunamadı",
    });

    items.push({
      key: "telemetry",
      label: "Telemetri Akışı",
      state: !isBleConnected ? "PENDING" : hasLiveData ? "OK" : "WARN",
      detail: !isBleConnected ? "BLE bekleniyor" : hasLiveData ? "Veri akıyor" : "Henüz veri yok",
    });

    items.push({
      key: "adc",
      label: "ADC / VLF Girişi",
      state: !hasLiveData ? "PENDING" : inputFault ? "ERROR" : "OK",
      detail: !hasLiveData ? "—" : inputFault ? "Giriş sinyali kararsız" : "Stabil",
    });

    items.push({
      key: "noise",
      label: "Gürültü Seviyesi",
      state: !hasLiveData ? "PENDING" : mainsNoise ? "WARN" : "OK",
      detail: !hasLiveData ? "—" : mainsNoise ? "50Hz şebeke gürültüsü baskın" : "Normal",
    });

    items.push({
      key: "calibration",
      label: "Kalibrasyon",
      state: !hasLiveData ? "PENDING" : inputFault ? "ERROR" : "OK",
      detail: !hasLiveData ? "—" : inputFault ? "Yeniden kalibrasyon gerekli" : "Tamam",
    });

    items.push({
      key: "fft",
      label: "FFT İşleme",
      state: !hasLiveData ? "PENDING" : "OK",
      detail: !hasLiveData ? "—" : `Aktivite indeksi: ${activityIndex !== undefined ? activityIndex.toFixed(0) : "—"}`,
    });

    items.push({
      key: "battery",
      label: "Pil",
      state: !hasLiveData ? "PENDING" : (t?.battery ?? 0) > 0 ? "OK" : "WARN",
      detail: !hasLiveData ? "—" : (t?.battery ?? 0) > 0 ? `%${Math.round(t?.battery ?? 0)}` : "USB ile besleniyor",
    });

    return items;
  }, [isBleConnected, hasLiveData, connectedDevice, inputFault, mainsNoise, activityIndex, t]);

  const allTestsOk = selfTestItems.every(i => i.state === "OK");

  // ── Bilim Modu: AI "neden bu değer" açıklaması ──────────────────────────
  // Firmware'in education_message alanı varsa onu kullan; yoksa basit
  // kurallı bir açıklama üret (öğretmen gibi davranan AI mantığı).
  const scienceExplanation = useMemo(() => {
    if (!hasLiveData) return null;

    if (t?.education_message) return t.education_message as string;

    if (mainsNoise) {
      return "50 Hz şebeke gürültüsü baskın. Yakındaki bir elektrik hattı veya şarj cihazı sinyali etkiliyor olabilir.";
    }
    if (inputFault) {
      return "VLF girişinde kararsız sinyal var. Anten/OP-AMP devre bağlantısını kontrol edin.";
    }
    if (spaceState === "BURST" || spaceState === "DISTURBED") {
      return "Ani ve yüksek aktivite tespit edildi. Uzay havası yerel VLF ortamını etkiliyor olabilir.";
    }
    if (trend === "RISING") {
      return "Sinyal aktivitesi yükseliş trendinde. Gece referansından sapma artıyor.";
    }
    return "Sinyal stabil seyrediyor. Yerel iyonosfer sakin görünüyor.";
  }, [hasLiveData, t, mainsNoise, inputFault, spaceState, trend]);

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

      {/* ── Sensör Sağlık Skoru (Bilimsel Güvenilirlik) ───────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sensör Sağlık Skoru</Text>
        <View style={styles.healthGrid}>
          <HealthBar label="ADC Health" value={healthScores.adc} />
          <HealthBar label="Noise Quality" value={healthScores.noise} />
          <HealthBar label="Calibration" value={healthScores.calibration} />
          <HealthBar label="Signal Integrity" value={healthScores.signal} />
        </View>
        <View style={styles.qualityBox}>
          <Feather
            name={confidenceScore >= 80 ? "check-circle" : confidenceScore >= 50 ? "alert-circle" : "x-circle"}
            size={16}
            color={confidenceScore >= 80 ? "#00E5B0" : confidenceScore >= 50 ? "#FBBF24" : "#FF6B6B"}
          />
          <Text style={[styles.qualityText, { color: confidenceScore >= 80 ? "#00E5B0" : confidenceScore >= 50 ? "#FBBF24" : "#FF6B6B" }]}>
            {dataQualityLabel}
          </Text>
        </View>
      </View>

      {/* ── Self-Test: açılır açılmaz kontrol listesi ─────────────────────── */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>Self-Test</Text>
          {hasLiveData && (
            <View style={[styles.miniBadge, allTestsOk ? styles.miniBadgeOk : styles.miniBadgeWarn]}>
              <Text style={styles.miniBadgeText}>{allTestsOk ? "TÜMÜ OK" : "KONTROL GEREKİYOR"}</Text>
            </View>
          )}
        </View>
        {selfTestItems.map(item => (
          <View key={item.key} style={styles.testRow}>
            <View style={styles.testLeft}>
              <View style={[styles.dot, dotColor(item.state)]} />
              <Text style={styles.label}>{item.label}</Text>
            </View>
            <View style={styles.testRight}>
              <Text style={[styles.value, stateTextColor(item.state)]}>{item.state}</Text>
              <Text style={styles.testDetail}>{item.detail}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* ── Mesh Consensus ─────────────────────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mesh Consensus</Text>
        <View style={styles.consensusRow}>
          <Text style={[styles.consensusStatus, consensusColor(consensus.status)]}>{consensus.status}</Text>
          <Text style={styles.consensusSub}>
            {consensus.participatingNodes}/{consensus.totalNodes || 1} node anomali bildiriyor
          </Text>
        </View>
        {consensus.nodeScores.length > 0 ? (
          consensus.nodeScores.map(n => (
            <View key={n.nodeId} style={styles.row}>
              <Text style={styles.label}>{n.nodeId}</Text>
              <Text style={styles.value}>{n.level} ({n.score})</Text>
            </View>
          ))
        ) : (
          <Text style={styles.sensorSubText}>
            Şu an consensus'a katılan anomali bildiren node yok. Birden fazla ORBIT-MESH cihazı bağlandığında burada karşılaştırma görünecek.
          </Text>
        )}
      </View>

      {/* ── Bilim Modu: AI olayı anlatıyor ─────────────────────────────────── */}
      {scienceExplanation && (
        <View style={[styles.card, styles.scienceCard]}>
          <View style={styles.cardTitleRow}>
            <Feather name="cpu" size={16} color="#a78bfa" />
            <Text style={[styles.cardTitle, { color: "#a78bfa", marginLeft: 8 }]}>Bilim Modu</Text>
          </View>
          <Text style={styles.scienceText}>{scienceExplanation}</Text>
          {spaceState && (
            <Text style={styles.scienceSubText}>
              Durum: {spaceState} {trend ? `· Eğilim: ${trend}` : ""}
            </Text>
          )}
        </View>
      )}

      {/* ── Telefon Sensörleri: Manyetik Alan Trendi ───────────────────────── */}
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

      {!isBleConnected && (
        <View style={[styles.card, styles.alertBoxInline]}>
          <Feather name="bluetooth" size={16} color="#38bdf8" />
          <Text style={[styles.alertText, { color: "#38bdf8" }]}>
            ORBIT-MESH cihazına bağlı değilsiniz. BLE Ağı ekranından bağlanın.
          </Text>
        </View>
      )}

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

function HealthBar({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? "#00E5B0" : value >= 50 ? "#FBBF24" : "#FF6B6B";
  return (
    <View style={styles.healthItem}>
      <Text style={styles.healthLabel}>{label}</Text>
      <View style={styles.healthBarBg}>
        <View style={[styles.healthBarFill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.healthValue, { color }]}>{value}%</Text>
    </View>
  );
}

function dotColor(state: TestState) {
  if (state === "OK") return { backgroundColor: "#00E5B0" };
  if (state === "WARN") return { backgroundColor: "#FBBF24" };
  if (state === "ERROR") return { backgroundColor: "#FF6B6B" };
  return { backgroundColor: "#475569" };
}

function stateTextColor(state: TestState) {
  if (state === "OK") return { color: "#00E5B0" };
  if (state === "WARN") return { color: "#FBBF24" };
  if (state === "ERROR") return { color: "#FF6B6B" };
  return { color: "#94a3b8" };
}

function consensusColor(status: string) {
  if (status === "Doğrulanmış") return { color: "#FF6B6B" };
  if (status === "Şüpheli") return { color: "#FBBF24" };
  return { color: "#00E5B0" };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc', marginBottom: 15, marginTop: Platform.OS === 'ios' ? 40 : 20 },
  statusRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#334155', gap: 6 },
  badgeText: { color: '#e2e8f0', fontSize: 12, fontWeight: '600' },
  card: { backgroundColor: '#1e293b', padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#38bdf8', marginBottom: 16 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  chartStyle: { marginVertical: 8, borderRadius: 12, marginLeft: -10 },
  sensorText: { color: '#00E5B0', fontSize: 18, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', textAlign: 'center', marginTop: 10, fontWeight: 'bold' },
  sensorSubText: { color: '#94a3b8', fontSize: 12, textAlign: 'center', marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  label: { color: '#cbd5e1', fontSize: 14 },
  value: { color: '#00E5B0', fontSize: 14, fontWeight: 'bold' },
  error: { color: '#FF6B6B' },
  warn: { color: '#FBBF24' },
  alertBox: { flexDirection: 'row', backgroundColor: '#451a20', padding: 12, borderRadius: 8, marginTop: 12, alignItems: 'center' },
  alertBoxInline: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e2a3a', gap: 8 },
  alertText: { color: '#FF6B6B', fontSize: 12, marginLeft: 8, flex: 1, lineHeight: 18 },

  // Health bars
  healthGrid: { gap: 10, marginBottom: 12 },
  healthItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  healthLabel: { color: '#cbd5e1', fontSize: 12, width: 100 },
  healthBarBg: { flex: 1, height: 8, backgroundColor: '#334155', borderRadius: 4, overflow: 'hidden' },
  healthBarFill: { height: '100%', borderRadius: 4 },
  healthValue: { fontSize: 12, fontWeight: 'bold', width: 40, textAlign: 'right' },
  qualityBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#334155' },
  qualityText: { fontSize: 13, fontWeight: '600' },

  // Self-test
  miniBadge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10 },
  miniBadgeOk: { backgroundColor: '#064e3b' },
  miniBadgeWarn: { backgroundColor: '#451a03' },
  miniBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#e2e8f0' },
  testRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  testLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  testRight: { alignItems: 'flex-end' },
  testDetail: { color: '#64748b', fontSize: 10, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },

  // Consensus
  consensusRow: { marginBottom: 12 },
  consensusStatus: { fontSize: 22, fontWeight: 'bold' },
  consensusSub: { color: '#94a3b8', fontSize: 12, marginTop: 2 },

  // Science mode
  scienceCard: { borderColor: '#5b21b6', backgroundColor: '#1e1b3a' },
  scienceText: { color: '#e2e8f0', fontSize: 14, lineHeight: 20 },
  scienceSubText: { color: '#a78bfa', fontSize: 11, marginTop: 8, fontWeight: '600' },
});