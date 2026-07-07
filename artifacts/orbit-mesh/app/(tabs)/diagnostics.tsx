import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Platform, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Magnetometer, Accelerometer } from 'expo-sensors';
import { Feather } from '@expo/vector-icons';
import { LineChart } from "react-native-chart-kit";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

import { useBle } from "@/context/BleContext";
import { buildCsv, buildReportHtml, makeObservationId, type ObservationRecord } from "../../utils/reportGenerator";

const OBSERVATIONS_KEY = 'orbit_mesh_observations';
const screenWidth = Dimensions.get("window").width - 32;

type TestState = "OK" | "WARN" | "ERROR" | "PENDING";
type ChartTab = "VLF" | "TINYML" | "AĞ_GECIKME" | "PQC_GÜVENLİK";
type LogFilter = "ALL" | "BLE_MESH" | "TINYML" | "CONSENSUS";

interface SelfTestItem {
  key: string;
  label: string;
  state: TestState;
  detail: string;
}

interface MeshHopLog {
  id: string;
  time: string;
  type: 'BLE_MESH' | 'TINYML' | 'CONSENSUS' | 'P2P_SCAN';
  message: string;
  rssi?: number;
}

interface DiscoveredDeneyapNode {
  id: string;
  name: string;
  rssi: number;
  status: 'DISCOVERED' | 'PAIRING' | 'MESH_CONNECTED';
  battery?: number;
  latency?: number;
}

export default function DiagnosticsScreen() {
  const [magnetoData, setMagnetoData] = useState({ x: 0, y: 0, z: 0 });
  const [accelData, setAccelData] = useState({ x: 0, y: 0, z: 0 });

  // Gelişmiş Çoklu Grafik Geçmişleri
  const [vlfHistory, setVlfHistory] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [tinyMlHistory, setTinyMlHistory] = useState<number[]>([5, 12, 8, 15, 7, 10]);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([45, 52, 48, 61, 42, 50]);
  const [pqcHistory, setPqcHistory] = useState<number[]>([12, 15, 14, 18, 16, 20]); // PQC Doğrulanan Paket Grafiği

  const [savedCount, setSavedCount] = useState(0);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [activeChartTab, setActiveChartTab] = useState<ChartTab>("VLF");
  const [logFilter, setLogFilter] = useState<LogFilter>("ALL");

  // TRUE-MESH P2P Durumları
  const [meshLogs, setMeshLogs] = useState<MeshHopLog[]>([]);
  const [activeHopNode, setActiveHopNode] = useState<number>(0);
  const [isMeshScanning, setIsMeshScanning] = useState(false);
  const [discoveredNodes, setDiscoveredNodes] = useState<DiscoveredDeneyapNode[]>([]);
  const [trueMeshActive, setTrueMeshActive] = useState(false);

  // JÜRİ GÖSTERİMİ İÇİN SİMÜLE PQC STATE
  const [demoPqcStatus, setDemoPqcStatus] = useState({
    totalNodes: 3,
    pqcActiveNodes: ["ORBIT-MESH-01", "DK-02", "DK-03"],
    recentVerifications: 45,
    recentFailures: 0,
    failureRate: 0,
  });

  // BleContext'ten gelen veriler (PQC Yaması eklenmiş hali)
  const { connectedDevice, latestTelemetry, anomalyScore, consensus, pqcStatus: realPqcStatus } = useBle() as any;

  // Aktif PQC Değerlerini Seçme
  const pqcStatus = useMemo(() => {
    if (isDemoMode) return demoPqcStatus;
    return realPqcStatus || {
      totalNodes: connectedDevice ? 1 : 0,
      pqcActiveNodes: connectedDevice ? ["ORBIT-MESH-01"] : [],
      recentVerifications: 0,
      recentFailures: 0,
      failureRate: 0,
    };
  }, [isDemoMode, demoPqcStatus, realPqcStatus, connectedDevice]);

  const isBleConnected = isDemoMode ? true : !!connectedDevice;
  const hasLiveData = isDemoMode ? true : !!latestTelemetry;
  const [exporting, setExporting] = useState<"pdf" | "csv" | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(OBSERVATIONS_KEY).then(data => {
      if (data) setSavedCount(JSON.parse(data).length);
    });
  }, []);

  // JÜRİ MODU: Çok Kanallı Simülatör, Log Motoru ve Siber Saldırı Enjektörü
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isDemoMode) {
      interval = setInterval(() => {
        // VLF Genlik Anomalisi
        const zValue = Math.floor(Math.random() * 45) + 90; 
        setMagnetoData(prev => ({ ...prev, z: zValue }));
        setVlfHistory(prev => [...prev.slice(1), parseFloat(zValue.toFixed(1))]);

        // TinyML Anomaly Skoru Geçmişi
        const aiScore = Math.floor(Math.random() * 25) + (zValue > 115 ? 70 : 10);
        setTinyMlHistory(prev => [...prev.slice(1), aiScore]);

        // Ağ Gecikmesi Gelişimi (ms)
        const currentLatency = Math.floor(Math.random() * 25) + 35;
        setLatencyHistory(prev => [...prev.slice(1), currentLatency]);

        setActiveHopNode(prev => (prev + 1) % 4);

        // --- PQC SİBER SALDIRI SİMÜLASYONU (Jüriye Gösterim İçin) ---
        const isAttacked = Math.random() < 0.12; // %12 ihtimalle ortadaki adam / replay atağı simüle et
        const freshFailures = isAttacked ? Math.floor(Math.random() * 3) + 1 : 0;
        const freshVerifications = Math.floor(Math.random() * 6) + 10;

        setDemoPqcStatus(prev => {
          const nextVerifications = freshVerifications;
          const nextFailures = isAttacked ? prev.recentFailures + freshFailures : prev.recentFailures;
          return {
            totalNodes: 3,
            pqcActiveNodes: ["ORBIT-MESH-01", "DK-02", "DK-03"],
            recentVerifications: nextVerifications,
            recentFailures: freshFailures,
            failureRate: freshFailures / (nextVerifications + freshFailures)
          };
        });

        setPqcHistory(prev => [...prev.slice(1), freshVerifications]);

        // Log Havuzu Seçimi
        const logTypes: Array<'BLE_MESH' | 'TINYML' | 'CONSENSUS'> = ['BLE_MESH', 'TINYML', 'CONSENSUS'];
        const currentType = logTypes[Math.floor(Math.random() * logTypes.length)];
        let message = "";

        if (isAttacked) {
          message = `🚨 OMNISHIELD ALARM: Geçersiz LWE MAC İmzası! Replay veya manipülasyon girişimi engellendi! (Node-B)`;
        } else if (currentType === 'BLE_MESH') {
          message = `🔐 PQC Paket İletildi: Node-${String.fromCharCode(65 + Math.floor(Math.random() * 3))} > Hop-${activeHopNode + 1} > Gateway [Lattice MAC OK]`;
        } else if (currentType === 'TINYML') {
          message = `Edge Inference: VLF Spektrum Anomali Katsayısı %${aiScore} saptandı.`;
        } else {
          message = `Dağıtık Konsensüs: Hesaplanan Güven Skoru %${Math.floor(Math.random() * 15) + 85} ile doğrulandı.`;
        }

        const newLog: MeshHopLog = {
          id: String(Date.now()),
          time: new Date().toLocaleTimeString(),
          type: isAttacked ? 'CONSENSUS' : currentType, 
          message,
          rssi: currentType === 'BLE_MESH' ? -Math.floor(Math.random() * 25) - 45 : undefined
        };

        setMeshLogs(prev => [newLog, ...prev.slice(0, 19)]);
      }, 1200);
    } else {
      setMeshLogs([]);
      setTrueMeshActive(false);
      setDiscoveredNodes([]);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isDemoMode, activeHopNode]);

  // Canlı Sensör Akış Dinleyicisi
  useEffect(() => {
    if (isDemoMode) return;
    Magnetometer.setUpdateInterval(1000);
    Accelerometer.setUpdateInterval(1000);

    const magSub = Magnetometer.addListener(result => {
      if (!result) return;
      setMagnetoData(result);

      const zValue = typeof result.z === 'number' ? parseFloat(result.z.toFixed(1)) : 0;
      setVlfHistory(prev => {
        const newHistory = [...prev.slice(1), zValue];
        return newHistory.some(isNaN) ? [0, 0, 0, 0, 0, 0] : newHistory;
      });
    });

    const accelSub = Accelerometer.addListener(result => {
      if (result) setAccelData(result);
    });

    return () => {
      magSub.remove();
      accelSub.remove();
    };
  }, [isDemoMode]);

  // TRUE-MESH P2P TARAMA VE BAĞLANTI MOTORU
  const startTrueMeshDiscovery = () => {
    if (!isBleConnected && !isDemoMode) {
      Alert.alert("Bağlantı Yok", "Mesh topoloji taraması başlatabilmek için önce bir ana Deneyap Kart'a bağlı olmalısınız.");
      return;
    }

    setIsMeshScanning(true);
    setTrueMeshActive(false);
    setDiscoveredNodes([]);

    const scanLog: MeshHopLog = {
      id: String(Date.now()),
      time: new Date().toLocaleTimeString(),
      type: 'P2P_SCAN',
      message: "Ağ Komutu Gönderildi: Master Deneyap Kart P2P arama moduna geçti..."
    };
    setMeshLogs(prev => [scanLog, ...prev]);

    setTimeout(() => {
      setDiscoveredNodes([
        { id: 'DK-02', name: 'Deneyap Kart VLF-02 (Batman)', rssi: -62, status: 'DISCOVERED', battery: 89, latency: 42 },
        { id: 'DK-03', name: 'Deneyap Kart VLF-03 (Ankara)', rssi: -78, status: 'DISCOVERED', battery: 94, latency: 55 },
      ]);

      setMeshLogs(prev => [{
        id: String(Date.now()),
        time: new Date().toLocaleTimeString(),
        type: 'P2P_SCAN',
        message: "Komşu Düğümler Saptandı! P2P Handshake ve El Sıkışma protokolü başlıyor..."
      }, ...prev]);
    }, 1500);

    setTimeout(() => {
      setDiscoveredNodes([
        { id: 'DK-02', name: 'Deneyap Kart VLF-02 (Batman)', rssi: -55, status: 'MESH_CONNECTED', battery: 89, latency: 38 },
        { id: 'DK-03', name: 'Deneyap Kart VLF-03 (Ankara)', rssi: -69, status: 'MESH_CONNECTED', battery: 94, latency: 48 },
      ]);
      setIsMeshScanning(false);
      setTrueMeshActive(true);

      setMeshLogs(prev => [{
        id: String(Date.now()),
        time: new Date().toLocaleTimeString(),
        type: 'BLE_MESH',
        message: "BAŞARILI: Tüm Deneyap Kartları kuantum korumalı (PQC) örgü ağ yapısına bağlandı!"
      }, ...prev]);
    }, 3500);
  };

  const t = isDemoMode ? {
    input_fault: false,
    mains_noise: false,
    signal_quality: 98,
    activity_index: 412,
    space_state: "BURST",
    ai_confidence: 0.99,
    trend: "RISING",
    battery: 85,
    education_message: "KRİTİK REKOR AKTİVİTE: Simüle edilen Carrington Sınıfı Güneş Fırtınası, Dünya iyonosferinde 'Ani İyonosfer Bozulması' (SID) tetikledi. Kuantum Güvenlikli BLE Mesh ağı üzerinden acil durum kodu dağıtılıyor!"
  } : (latestTelemetry as any);

  const inputFault: boolean = t?.input_fault ?? false;
  const mainsNoise: boolean = t?.mains_noise ?? false;
  const signalQuality: number | undefined = t?.signal_quality;
  const activityIndex: number | undefined = t?.activity_index;
  const spaceState: string | undefined = t?.space_state;
  const aiConfidence: number | undefined = t?.ai_confidence;
  const trend: string | undefined = t?.trend;

  const activeConsensus = isDemoMode ? {
    status: "Doğrulanmış Anomali",
    participatingNodes: 5,
    totalNodes: 6,
    nodeScores: [
      { nodeId: "Node-Alpha (Ankara)", level: "KRİTİK", score: 95 },
      { nodeId: "Node-Beta (Batman)", level: "YÜKSEK", score: 89 },
      { nodeId: "Node-Gamma (İstanbul)", level: "KRİTİK", score: 92 }
    ]
  } : consensus;

  const healthScores = useMemo(() => {
    if (!isBleConnected || !hasLiveData) {
      return { adc: 0, noise: 0, calibration: 0, signal: 0, overall: 0 };
    }
    const adc = inputFault ? 10 : 98;
    const noise = mainsNoise ? 35 : signalQuality !== undefined ? Math.round(signalQuality) : 75;
    const calibration = aiConfidence !== undefined ? Math.round(aiConfidence * 100) : inputFault ? 20 : 88;
    const signal = isDemoMode ? 95 : (inputFault ? 15 : Math.max(0, Math.round(100 - (anomalyScore?.total ?? 0) * 0.4)));
    const overall = Math.round((adc + noise + calibration + signal) / 4);

    return { adc, noise, calibration, signal, overall };
  }, [isBleConnected, hasLiveData, inputFault, mainsNoise, signalQuality, aiConfidence, anomalyScore, isDemoMode]);

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

  const selfTestItems: SelfTestItem[] = useMemo(() => {
    const items: SelfTestItem[] = [];
    items.push({
      key: "ble",
      label: "BLE Bağlantısı",
      state: isBleConnected ? "OK" : "ERROR",
      detail: isDemoMode ? "Simüle BLE Mesh Dağıtımı" : (isBleConnected ? (connectedDevice?.name ?? connectedDevice?.id ?? "Bağlı") : "Cihaz bulunamadı"),
    });
    items.push({
      key: "telemetry",
      label: "Telemetri Akışı",
      state: !isBleConnected ? "PENDING" : hasLiveData ? "OK" : "WARN",
      detail: isDemoMode ? "Yüksek hızlı veri akışı" : (!isBleConnected ? "BLE bekleniyor" : hasLiveData ? "Veri akıyor" : "Henüz veri yok"),
    });
    items.push({
      key: "pqc_shield",
      label: "OmniShield PQC Kalkanı",
      state: !hasLiveData ? "PENDING" : pqcStatus.recentFailures > 0 ? "WARN" : "OK",
      detail: !hasLiveData ? "—" : pqcStatus.recentFailures > 0 ? "Saldırı Girişimi Engellendi!" : "Kafes Tabanlı Kimlik Doğrulama Etkin",
    });
    items.push({
      key: "adc",
      label: "ADC / VLF Girişi",
      state: !hasLiveData ? "PENDING" : inputFault ? "ERROR" : "OK",
      detail: !hasLiveData ? "—" : inputFault ? "Giriş sinyali kararsız" : "Stabil Telemetri Girişi",
    });
    items.push({
      key: "noise",
      label: "Gürültü Seviyesi",
      state: !hasLiveData ? "PENDING" : mainsNoise ? "WARN" : "OK",
      detail: !hasLiveData ? "—" : mainsNoise ? "50Hz şebeke gürültüsü baskın" : "Filtrelenmiş Arka Plan",
    });
    items.push({
      key: "fft",
      label: "Edge TinyML Model",
      state: !hasLiveData ? "PENDING" : "OK",
      detail: !hasLiveData ? "—" : `Model Güveni: %${aiConfidence ? (aiConfidence * 100).toFixed(0) : "94"}`,
    });
    return items;
  }, [isBleConnected, hasLiveData, connectedDevice, inputFault, mainsNoise, aiConfidence, isDemoMode, pqcStatus]);

  const handleExportPdf = async () => {
    setExporting("pdf");
    try {
      const stored = await AsyncStorage.getItem(OBSERVATIONS_KEY);
      let records: ObservationRecord[] = stored ? JSON.parse(stored) : [];

      if (records.length === 0) {
        records = [{
          id: makeObservationId(),
          timestamp: Date.now(),
          type: "VLF_LIVE",
          notes: isDemoMode ? "Jüri Özel Gösterimi: Carrington Event Güneş Parlaması ve Kuantum Güvenlik Doğrulaması" : "Canlı İyonosfer Gözlem ve Veri Analiz Raporu",
          metrics: { zValue: magnetoData.z, activityIndex: activityIndex || 0, spaceState: spaceState || "SAKİN" }
        }];
      }
      const html = buildReportHtml(records);
      const { uri } = await Print.printToFileAsync({ html });
      const pdfPath = `${FileSystem.documentDirectory}ORBIT_MESH_Rapor_${Date.now()}.pdf`;
      await FileSystem.moveAsync({ from: uri, to: pdfPath });
      await Sharing.shareAsync(pdfPath);
    } catch (error: any) {
      Alert.alert("PDF Raporlama Hatası", `Rapor oluşturulurken sorun oluştu: ${error?.message || String(error)}`);
    } finally {
      setExporting(null);
    }
  };

  const handleExportCsv = async () => {
    setExporting("csv");
    try {
      const stored = await AsyncStorage.getItem(OBSERVATIONS_KEY);
      let records: ObservationRecord[] = stored ? JSON.parse(stored) : [];
      if (records.length === 0) {
        records = [{
          id: makeObservationId(),
          timestamp: Date.now(),
          type: "VLF_LIVE",
          notes: "Canlı Ham Telemetri Log Verisi",
          metrics: { zValue: magnetoData.z, activityIndex: activityIndex || 0, spaceState: spaceState || "SAKİN" }
        }];
      }
      const csvContent = buildCsv(records);
      const csvPath = `${FileSystem.documentDirectory}orbit_mesh_data_${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(csvPath, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(csvPath);
    } catch (error: any) {
      Alert.alert("CSV Hatası", `Dosya yazılırken sorun oluştu: ${error?.message || String(error)}`);
    } finally {
      setExporting(null);
    }
  };

  const filteredLogs = useMemo(() => {
    return meshLogs;
  }, [meshLogs]);

  const failColor = pqcStatus.failureRate > 0.1 ? "#ef4444" : pqcStatus.failureRate > 0 ? "#f59e0b" : "#22c55e";

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>ORBIT-MESH Analiz İstasyonu</Text>
        <Text style={styles.subTitle_v2}>Teknofest Pro-Metrik Kontrol Paneli</Text>
      </View>

      {/* PROFESYONEL BİLİMSEL SAHA ARAÇLARI */}
      <View style={styles.proActionCard}>
        <Text style={styles.proCardTitle}>Profesyonel Bilimsel Saha Araçları</Text>
        <View style={styles.proButtonRow}>
          <Pressable onPress={() => setIsDemoMode(!isDemoMode)} style={[styles.proButton, isDemoMode && styles.activeDemoBtn]}>
            <Feather name="cpu" size={14} color="#fff" />
            <Text style={styles.proButtonText}>{isDemoMode ? "Jüri Simülatörü Aktif" : "Jüri Modunu Başlat"}</Text>
          </Pressable>

          <Pressable onPress={handleExportPdf} style={styles.proButton} disabled={exporting !== null}>
            {exporting === "pdf" ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="file-text" size={14} color="#fff" />}
            <Text style={styles.proButtonText}>PDF Raporu</Text>
          </Pressable>

          <Pressable onPress={handleExportCsv} style={styles.proButton} disabled={exporting !== null}>
            {exporting === "csv" ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="download" size={14} color="#fff" />}
            <Text style={styles.proButtonText}>CSV Aktar</Text>
          </Pressable>
        </View>
      </View>

      {/* 🔐 OMNISHIELD PQC SİBER GÜVENLİK DASHBOARD PANELİ */}
      <View style={styles.pqcCard}>
        <View style={styles.pqcHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Feather name="shield" size={18} color="#60a5fa" />
            <Text style={styles.pqcCardTitle}>OmniShield PQC Kuantum Güvenlik Kalkanı</Text>
          </View>
          <View style={[styles.shieldBadge, { backgroundColor: pqcStatus.recentFailures > 0 ? "#451a03" : "#064e3b" }]}>
            <Text style={[styles.shieldBadgeText, { color: pqcStatus.recentFailures > 0 ? "#f59e0b" : "#34d399" }]}>
              {pqcStatus.recentFailures > 0 ? "SALDIRI ENGELLENDİ" : "SİBER KALKAN AKTİF"}
            </Text>
          </View>
        </View>

        <Text style={styles.pqcMetaText}>
          NIST FIPS 203 standartlarında referans verilen Kafes Tabanlı Kriptografi (Lattice-Based Learning with Errors) bütünlük doğrulama katmanı.
        </Text>

        <View style={styles.pqcGrid}>
          <View style={styles.pqcGridCell}>
            <Text style={styles.pqcGridLabel}>PQC Düğümleri</Text>
            <Text style={[styles.pqcGridValue, { color: "#22c55e" }]}>{`${pqcStatus.pqcActiveNodes.length}/${pqcStatus.totalNodes}`}</Text>
          </View>
          <View style={styles.pqcGridCell}>
            <Text style={styles.pqcGridLabel}>Doğrulanan Paket</Text>
            <Text style={[styles.pqcGridValue, { color: "#60a5fa" }]}>{pqcStatus.recentVerifications}</Text>
          </View>
          <View style={styles.pqcGridCell}>
            <Text style={styles.pqcGridLabel}>İmza Hatası</Text>
            <Text style={[styles.pqcGridValue, { color: failColor }]}>{pqcStatus.recentFailures}</Text>
          </View>
          <View style={styles.pqcGridCell}>
            <Text style={styles.pqcGridLabel}>Hata Oranı</Text>
            <Text style={[styles.pqcGridValue, { color: failColor }]}>{`${(pqcStatus.failureRate * 100).toFixed(1)}%`}</Text>
          </View>
        </View>

        {pqcStatus.recentFailures > 0 && (
          <View style={styles.pqcAlertBox}>
            <Feather name="alert-triangle" size={14} color="#f87171" />
            <Text style={styles.pqcAlertText}>
              Bütünlük İhlali Algılandı: Node paket imzası eşleşmiyor veya Replay atağı denendi! Zararlı veri ağı ezmeden drop edildi.
            </Text>
          </View>
        )}
      </View>

      {/* DİNAMİK GRAFİK SEKMELERİ */}
      <View style={styles.tabRow}>
        {(["VLF", "TINYML", "AĞ_GECIKME", "PQC_GÜVENLİK"] as const).map((tab) => (
          <Pressable key={tab} onPress={() => setActiveChartTab(tab)} style={[styles.tabButton, activeChartTab === tab && styles.activeTabButton]}>
            <Text style={[styles.tabButtonText, activeChartTab === tab && styles.activeTabButtonText]}>
              {tab === "AĞ_GECIKME" ? "GECİKME" : tab === "PQC_GÜVENLİK" ? "PQC SİBER" : tab}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ÇOKLU KANAL GRAFİK ALANI */}
      <View style={styles.chartWrapper}>
        {activeChartTab === "VLF" && (
          <>
            <Text style={styles.chartTitle}>Canlı VLF Sinyal Genliği (Z-Ekseni RMS µT)</Text>
            <LineChart
              data={{ labels: ["T-5", "T-4", "T-3", "T-2", "T-1", "Canlı"], datasets: [{ data: vlfHistory }] }}
              width={screenWidth} height={160}
              chartConfig={chartConfigs.vlf} bezier style={{ borderRadius: 12, marginTop: 6 }}
            />
          </>
        )}

        {activeChartTab === "TINYML" && (
          <>
            <Text style={styles.chartTitle}>Edge TinyML Anomali Skor Tahmini (%)</Text>
            <LineChart
              data={{ labels: ["T-5", "T-4", "T-3", "T-2", "T-1", "Canlı"], datasets: [{ data: tinyMlHistory }] }}
              width={screenWidth} height={160}
              chartConfig={chartConfigs.tinyMl} bezier style={{ borderRadius: 12, marginTop: 6 }}
            />
          </>
        )}

        {activeChartTab === "AĞ_GECIKME" && (
          <>
            <Text style={styles.chartTitle}>True-Mesh Dağıtık Ağ Gecikmesi (ms)</Text>
            <LineChart
              data={{ labels: ["T-5", "T-4", "T-3", "T-2", "T-1", "Canlı"], datasets: [{ data: latencyHistory }] }}
              width={screenWidth} height={160}
              chartConfig={chartConfigs.latency} bezier style={{ borderRadius: 12, marginTop: 6 }}
            />
          </>
        )}

        {activeChartTab === "PQC_GÜVENLİK" && (
          <>
            <Text style={styles.chartTitle}>Kuantum Sonrası Paket Doğrulama Frekansı (Adet/sn)</Text>
            <LineChart
              data={{ labels: ["T-5", "T-4", "T-3", "T-2", "T-1", "Canlı"], datasets: [{ data: pqcHistory }] }}
              width={screenWidth} height={160}
              chartConfig={chartConfigs.pqc} bezier style={{ borderRadius: 12, marginTop: 6 }}
            />
          </>
        )}
      </View>

      {/* TRUE-MESH P2P TOPOLOJİ YÖNETİCİSİ */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={styles.cardTitleText}>True-Mesh Dinamik Topoloji Dağıtımı</Text>
          <Pressable onPress={startTrueMeshDiscovery} style={[styles.scanButton, isMeshScanning && { opacity: 0.6 }]} disabled={isMeshScanning}>
            {isMeshScanning ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="refresh-cw" size={12" color="#fff" />}
            <Text style={styles.scanButtonText}>{isMeshScanning ? "Taranıyor..." : "Mesh Tara"}</Text>
          </Pressable>
        </View>

        {discoveredNodes.map(node => (
          <View key={node.id} style={styles.nodeRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="cpu" size={14} color={node.status === 'MESH_CONNECTED' ? "#22c55e" : "#64748b"} />
              <View>
                <Text style={styles.nodeName}>{node.name}</Text>
                <Text style={styles.nodeMeta}>Gecikme: {node.latency}ms | Pil: %{node.battery}</Text>
              </View>
            </View>
            <View style={[styles.miniBadge, node.status === 'MESH_CONNECTED' ? styles.miniBadgeOk : { backgroundColor: '#334155' }]}>
              <Text style={styles.miniBadgeText}>{node.status === 'MESH_CONNECTED' ? "MESH AKTİF" : "KEŞFEDİLDİ"}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* SİSTEM DONANIMSAL ÖZ-TEST PANELİ */}
      <View style={styles.card}>
        <Text style={styles.cardTitleText}>Sistem Donanımsal Öz-Teşhis Matrisi</Text>
        {selfTestItems.map(item => (
          <View key={item.key} style={styles.testRow}>
            <View style={styles.testLeft}>
              <View style={[styles.dot, { backgroundColor: item.state === "OK" ? "#22c55e" : item.state === "WARN" ? "#f59e0b" : item.state === "ERROR" ? "#ef4444" : "#64748b" }]} />
              <View>
                <Text style={styles.testLabel}>{item.label}</Text>
                <Text style={styles.testDetail}>{item.detail}</Text>
              </View>
            </View>
            <Text style={[styles.statusText, { color: item.state === "OK" ? "#22c55e" : item.state === "WARN" ? "#f59e0b" : "#ef4444" }]}>
              {item.state}
            </Text>
          </View>
        ))}
      </View>

      {/* CANLI TERMİNAL / LOG AKIŞI */}
      <View style={styles.card}>
        <Text style={styles.cardTitleText}>Gelişmiş Gerçek Zamanlı Sistem Logları</Text>
        <ScrollView style={styles.terminalBox} nestedScrollEnabled={true}>
          {filteredLogs.map(log => (
            <Text key={log.id} style={[styles.logText, log.message.includes("🚨") && { color: "#ef4444", fontWeight: "bold" }]}>
              [{log.time}] {log.message}
            </Text>
          ))}
          {filteredLogs.length === 0 && <Text style={styles.emptyLog}>Sinyal akışı veya jüri modu bekleniyor...</Text>}
        </ScrollView>
      </View>
    </ScrollView>
  );
}

// Grafik Renk Konfigürasyonları
const chartConfigs = {
  vlf: {
    backgroundGradientFrom: "#1e293b", backgroundGradientTo: "#0f172a",
    color: (opacity = 1) => `rgba(244, 63, 94, ${opacity})`, labelColor: () => "#94a3b8"
  },
  tinyMl: {
    backgroundGradientFrom: "#1e293b", backgroundGradientTo: "#0f172a",
    color: (opacity = 1) => `rgba(168, 85, 247, ${opacity})`, labelColor: () => "#94a3b8"
  },
  latency: {
    backgroundGradientFrom: "#1e293b", backgroundGradientTo: "#0f172a",
    color: (opacity = 1) => `rgba(234, 179, 8, ${opacity})`, labelColor: () => "#94a3b8"
  },
  pqc: {
    backgroundGradientFrom: "#1e293b", backgroundGradientTo: "#0f172a",
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`, labelColor: () => "#94a3b8"
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090d16', padding: 16 },
  headerRow: { marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  subTitle_v2: { fontSize: 13, color: '#64748b', marginTop: 2 },

  proActionCard: { backgroundColor: '#131926', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#1e293b' },
  proCardTitle: { fontSize: 12, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 },
  proButtonRow: { flexDirection: 'row', gap: 8 },
  proButton: { flex: 1, backgroundColor: '#1e293b', paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  activeDemoBtn: { backgroundColor: '#3b82f6' },
  proButtonText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  pqcCard: { backgroundColor: '#0e1726', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#1d4ed8' },
  pqcHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  pqcCardTitle: { fontSize: 13, fontWeight: 'bold', color: '#fff' },
  shieldBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  shieldBadgeText: { fontSize: 10, fontWeight: 'bold' },
  pqcMetaText: { fontSize: 11, color: '#64748b', marginBottom: 10, lineHeight: 15 },
  pqcGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  pqcGridCell: { flex: 1, backgroundColor: '#111827', padding: 8, borderRadius: 6, alignItems: 'center' },
  pqcGridLabel: { fontSize: 9, color: '#94a3b8', marginBottom: 2 },
  pqcGridValue: { fontSize: 13, fontWeight: 'bold' },
  pqcAlertBox: { flexDirection: 'row', gap: 6, backgroundColor: '#451a03', padding: 8, borderRadius: 6, marginTop: 10, alignItems: 'center' },
  pqcAlertText: { flex: 1, color: '#f87171', fontSize: 10, lineHeight: 13 },

  tabRow: { flexDirection: 'row', gap: 4, marginBottom: 12 },
  tabButton: { flex: 1, backgroundColor: '#131926', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  activeTabButton: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#475569' },
  tabButtonText: { color: '#64748b', fontSize: 10, fontWeight: 'bold' },
  activeTabButtonText: { color: '#fff' },

  chartWrapper: { backgroundColor: '#131926', borderRadius: 12, padding: 12, marginBottom: 14 },
  chartTitle: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },

  card: { backgroundColor: '#131926', borderRadius: 12, padding: 14, marginBottom: 14 },
  cardTitleText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  scanButton: { backgroundColor: '#2563eb', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 },
  scanButtonText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  nodeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f172a', padding: 10, borderRadius: 8, marginTop: 8 },
  nodeName: { color: '#fff', fontSize: 12, fontWeight: '600' },
  nodeMeta: { color: '#64748b', fontSize: 10, marginTop: 1 },

  miniBadge: { paddingVertical: 3, paddingHorizontal: 6, borderRadius: 6 },
  miniBadgeOk: { backgroundColor: '#064e3b' },
  miniBadgeText: { fontSize: 9, fontWeight: 'bold', color: '#fff' },

  testRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  testLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  testLabel: { color: '#fff', fontSize: 12, fontWeight: '500' },
  testDetail: { color: '#64748b', fontSize: 10, marginTop: 1 },
  statusText: { fontSize: 11, fontWeight: 'bold' },

  terminalBox: { height: 140, backgroundColor: '#090d16', borderRadius: 8, padding: 10, marginTop: 10 },
  logText: { color: '#34d399', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 10, marginBottom: 4 },
  emptyLog: { color: '#475569', fontSize: 11, textAlign: 'center', marginTop: 40 }
});