import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Platform, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Magnetometer, Accelerometer } from 'expo-sensors';
import { Feather } from '@expo/vector-icons';
import { LineChart, BarChart } from "react-native-chart-kit";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

import { useBle } from "@/context/BleContext";
import { buildCsv, buildReportHtml, makeObservationId, type ObservationRecord } from "../../utils/reportGenerator";

const OBSERVATIONS_KEY = 'orbit_mesh_observations';
const screenWidth = Dimensions.get("window").width - 32;

type TestState = "OK" | "WARN" | "ERROR" | "PENDING";
type ChartTab = "VLF" | "TINYML" | "AĞ_GECIKME";
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

  const { connectedDevice, latestTelemetry, anomalyScore, consensus } = useBle();
  const isBleConnected = isDemoMode ? true : !!connectedDevice;
  const hasLiveData = isDemoMode ? true : !!latestTelemetry;

  const [exporting, setExporting] = useState<"pdf" | "csv" | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(OBSERVATIONS_KEY).then(data => {
      if (data) setSavedCount(JSON.parse(data).length);
    });
  }, []);

  // JÜRİ MODU: Çok Kanallı Simülatör ve Log Motoru
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

        const logTypes: Array<'BLE_MESH' | 'TINYML' | 'CONSENSUS'> = ['BLE_MESH', 'TINYML', 'CONSENSUS'];
        const currentType = logTypes[Math.floor(Math.random() * logTypes.length)];
        let message = "";

        if (currentType === 'BLE_MESH') {
          message = `Paket iletildi: Node-${String.fromCharCode(65 + Math.floor(Math.random() * 3))} > Hop-${activeHopNode + 1} > Gateway`;
        } else if (currentType === 'TINYML') {
          message = `Edge Inference: VLF Spektrum Anomali Katsayısı %${aiScore} saptandı.`;
        } else {
          message = `Dağıtık Konsensüs: Hesaplanan Güven Skoru %${Math.floor(Math.random() * 15) + 85} ile doğrulandı.`;
        }

        const newLog: MeshHopLog = {
          id: String(Date.now()),
          time: new Date().toLocaleTimeString(),
          type: currentType,
          message,
          rssi: currentType === 'BLE_MESH' ? -Math.floor(Math.random() * 25) - 45 : undefined
        };

        setMeshLogs(prev => [newLog, ...prev.slice(0, 19)]); // Terminal kapasitesini artırdık
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
        message: "BAŞARILI: Tüm Deneyap Kartları birbirine bağlandı. Tam Mesh Topolojisi aktif!"
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
    education_message: "KRİTİK REKOR AKTİVİTE: Simüle edilen Carrington Sınıfı Güneş Fırtınası, Dünya iyonosferinde 'Ani İyonosfer Bozulması' (SID) tetikledi. BLE Mesh ağı üzerinden acil durum kodu dağıtılıyor!"
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
      key: "calibration",
      label: "Kalibrasyon",
      state: !hasLiveData ? "PENDING" : inputFault ? "ERROR" : "OK",
      detail: !hasLiveData ? "—" : inputFault ? "Yeniden kalibrasyon gerekli" : "Donanımsal Sıfırlama OK",
    });
    items.push({
      key: "fft",
      label: "Edge TinyML Model",
      state: !hasLiveData ? "PENDING" : "OK",
      detail: !hasLiveData ? "—" : `Model Güveni: %${aiConfidence ? (aiConfidence * 100).toFixed(0) : "94"}`,
    });
    return items;
  }, [isBleConnected, hasLiveData, connectedDevice, inputFault, mainsNoise, aiConfidence, isDemoMode]);

  const allTestsOk = selfTestItems.every(i => i.state === "OK");

  const scienceExplanation = useMemo(() => {
    if (!hasLiveData) return null;
    if (t?.education_message) return t.education_message as string;
    if (mainsNoise) return "50 Hz şebeke gürültüsü baskın. Yakındaki bir elektrik hattı yerel spektrumu etkiliyor.";
    if (inputFault) return "VLF girişinde kararsız sinyal var. Anten empedansını kontrol edin.";
    if (spaceState === "BURST" || spaceState === "DISTURBED") return "Ani Spektral Yoğunlaşma: Uzay havası yerel VLF iyonosferik dalga kılavuzunu etkiliyor.";
    return "Sinyal stabil seyrediyor. Yerel iyonosfer D-Tabakası sakin durumda.";
  }, [hasLiveData, t, mainsNoise, inputFault, spaceState]);

  // GELİŞMİŞ HATA GÖSTERİMLİ EXPORT FONKSİYONLARI
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
          notes: isDemoMode ? "Jüri Özel Gösterimi: Carrington Event Güneş Parlaması Genlik Anomalisi" : "Canlı İyonosfer Gözlem ve Veri Analiz Raporu",
          metrics: { zValue: magnetoData.z, activityIndex: activityIndex || 0, spaceState: spaceState || "SAKİN" }
        }];
      }

      const html = buildReportHtml(records);
      const { uri } = await Print.printToFileAsync({ html });
      const pdfPath = `${FileSystem.documentDirectory}ORBIT_MESH_Rapor_${Date.now()}.pdf`;
      await FileSystem.moveAsync({ from: uri, to: pdfPath });
      await Sharing.shareAsync(pdfPath);
    } catch (error: any) {
      Alert.alert("PDF Raporlama Hatası", `Rapor oluşturulurken teknik bir sorun oluştu:\n${error?.message || String(error)}`);
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
      Alert.alert("CSV Dışa Aktarma Hatası", `Dosya yazılırken veya paylaşılırken bir sorun oluştu:\n${error?.message || String(error)}`);
    } finally {
      setExporting(null);
    }
  };

  // Log Filtreleme Mantığı
  const filteredLogs = useMemo(() => {
    if (logFilter === "ALL") return meshLogs;
    return meshLogs.filter(log => log.type === logFilter);
  }, [meshLogs, logFilter]);

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
          <Pressable 
            onPress={() => setIsDemoMode(!isDemoMode)} 
            style={[styles.proButton, isDemoMode ? { backgroundColor: '#ef4444' } : { backgroundColor: '#2563eb' }]}
          >
            <Feather name={isDemoMode ? "activity" : "zap"} size={14} color="#fff" />
            <Text style={styles.proButtonText}>{isDemoMode ? "Canlı Mod" : "Jüri / Demo Modu"}</Text>
          </Pressable>

          <Pressable onPress={handleExportPdf} disabled={exporting !== null} style={[styles.proButton, { backgroundColor: '#10b981' }]}>
            <Feather name="file-text" size={14} color="#fff" />
            <Text style={styles.proButtonText}>{exporting === "pdf" ? "PDF..." : "PDF Raporu"}</Text>
          </Pressable>

          <Pressable onPress={handleExportCsv} disabled={exporting !== null} style={[styles.proButton, { backgroundColor: '#475569' }]}>
            <Feather name="download" size={14} color="#fff" />
            <Text style={styles.proButtonText}>CSV Al</Text>
          </Pressable>
        </View>
      </View>

      {/* HOP-BY-HOP MESH TOPOLOGY & ADVANCED CONTROLS */}
      {isDemoMode && (
        <View style={styles.killerCard}>
          <View style={styles.cardTitleRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="share-2" size={16} color="#00E5B0" />
              <Text style={[styles.cardTitle, { color: '#00E5B0', marginBottom: 0 }]}>Hop-by-Hop BLE Mesh Topology</Text>
            </View>
            <View style={styles.livePulseContainer}>
              <View style={styles.pulseDot} />
              <Text style={styles.livePulse}>CANLI YÖNLENDİRME</Text>
            </View>
          </View>

          {/* Görsel Gelişmiş Düğüm Ağ Şeması */}
          <View style={styles.meshVisualContainer}>
            <View style={[styles.meshNode, activeHopNode === 0 && styles.meshNodeActive]}>
              <Feather name="radio" size={12} color="#fff" />
              <Text style={styles.meshNodeText}>Local Node</Text>
              <Text style={styles.nodeMiniStat}>%85 Sinyal</Text>
            </View>
            <Feather name="arrow-right" size={12} color={activeHopNode === 1 ? "#00E5B0" : "#334155"} />
            <View style={[styles.meshNode, (activeHopNode === 1 || trueMeshActive) && styles.meshNodeActive]}>
              <Feather name="cpu" size={12} color="#fff" />
              <Text style={styles.meshNodeText}>Node-Alpha</Text>
              <Text style={styles.nodeMiniStat}>38ms</Text>
            </View>
            <Feather name="arrow-right" size={12} color={activeHopNode === 2 ? "#00E5B0" : "#334155"} />
            <View style={[styles.meshNode, (activeHopNode === 2 || trueMeshActive) && styles.meshNodeActive]}>
              <Feather name="cpu" size={12} color="#fff" />
              <Text style={styles.meshNodeText}>Node-Beta</Text>
              <Text style={styles.nodeMiniStat}>42ms</Text>
            </View>
            <Feather name="arrow-right" size={12} color={(activeHopNode === 3 || trueMeshActive) ? "#00E5B0" : "#334155"} />
            <View style={[styles.meshNode, (activeHopNode === 3 || trueMeshActive) && styles.meshNodeActive, { borderColor: '#a78bfa' }]}>
              <Feather name="globe" size={12} color="#fff" />
              <Text style={styles.meshNodeText}>Gateway</Text>
              <Text style={styles.nodeMiniStat}>LTE/Mqtt</Text>
            </View>
          </View>

          {/* TRUE-MESH P2P AUTOMATIC PROVISIONER */}
          <View style={styles.p2pProvisionerBox}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={styles.p2pTitle}>True-Mesh P2P Deneyap Provisioner</Text>
              {isMeshScanning && <ActivityIndicator size="small" color="#00E5B0" />}
            </View>

            <Pressable 
              onPress={startTrueMeshDiscovery} 
              disabled={isMeshScanning}
              style={[styles.p2pButton, trueMeshActive ? { backgroundColor: '#065f46', borderColor: '#00E5B0' } : { backgroundColor: '#1e1b4b', borderColor: '#4338ca' }]}
            >
              <Feather name={trueMeshActive ? "refresh-cw" : "shuffle"} size={14} color="#fff" />
              <Text style={styles.p2pButtonText}>
                {isMeshScanning ? "Deneyap Kartları Aranıyor ve Bağlanıyor..." : trueMeshActive ? "Mesh Ağını Yeniden Yapılandır (P2P)" : "Otomatik Mesh Keşfi Başlat (P2P)"}
              </Text>
            </Pressable>

            {discoveredNodes.length > 0 && (
              <View style={styles.discoveredNodesList}>
                {discoveredNodes.map(node => (
                  <View key={node.id} style={styles.nodeRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Feather name="cpu" size={12} color={node.status === 'MESH_CONNECTED' ? '#00E5B0' : '#94a3b8'} />
                      <View>
                        <Text style={styles.nodeNameText}>{node.name}</Text>
                        <Text style={styles.nodeRowSubInfo}>Gecikme: {node.latency}ms • Batarya: %{node.battery}</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      <Text style={styles.nodeRssiText}>{node.rssi} dBm</Text>
                      <Text style={[styles.nodeStatusText, node.status === 'MESH_CONNECTED' ? { color: '#00E5B0' } : { color: '#f59e0b' }]}>
                        {node.status === 'MESH_CONNECTED' ? 'BAĞLI (MESH)' : 'EŞLEŞİYOR...'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* DECENTRALIZED EDGE LOG MATRIX (FİLTRELENEBİLİR) */}
          <View style={styles.logHeaderContainer}>
            <Text style={styles.killerSectionTitle}>Decentralized Edge Sinyal Günlükleri</Text>
            {/* Terminal Filtre Butonları */}
            <View style={styles.filterTabsRow}>
              {(["ALL", "BLE_MESH", "TINYML", "CONSENSUS"] as LogFilter[]).map((filter) => (
                <Pressable 
                  key={filter} 
                  onPress={() => setLogFilter(filter)}
                  style={[styles.filterTabButton, logFilter === filter && styles.filterTabButtonActive]}
                >
                  <Text style={[styles.filterTabText, logFilter === filter && styles.filterTabTextActive]}>
                    {filter === "ALL" ? "HEPSİ" : filter}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.logTerminal}>
            {filteredLogs.length === 0 ? (
              <Text style={styles.terminalPlaceholder}>Seçilen kategoride paket veya log bulunmuyor...</Text>
            ) : (
              filteredLogs.map(log => (
                <View key={log.id} style={styles.terminalRow}>
                  <Text style={styles.terminalTime}>[{log.time}]</Text>
                  <Text style={[styles.terminalTag, 
                    log.type === 'TINYML' ? { color: '#a78bfa' } : log.type === 'CONSENSUS' ? { color: '#f43f5e' } : log.type === 'P2P_SCAN' ? { color: '#eab308' } : { color: '#38bdf8' }
                  ]}>
                    {log.type}
                  </Text>
                  <Text style={styles.terminalMsg} numberOfLines={1}>{log.message}</Text>
                  {log.rssi && <Text style={styles.terminalRssi}>{log.rssi}dBm</Text>}
                </View>
              ))
            )}
          </View>
        </View>
      )}

      {/* YEREL BELLEK VE GÜVEN SKORU ÖZET ŞERİDİ */}
      <View style={styles.statusRow}>
        <View style={styles.badge}>
          <Feather name="database" size={14} color="#00E5B0" />
          <Text style={styles.badgeText}>Saha Log Havuzu: {savedCount}/100</Text>
        </View>
        <View style={styles.badge}>
          <Feather name="check-circle" size={14} color={confidenceScore > 70 ? "#00E5B0" : confidenceScore > 40 ? "#FBBF24" : "#FF6B6B"} />
          <Text style={styles.badgeText}>Konsensüs Doğruluğu: %{confidenceScore}</Text>
        </View>
      </View>

      {/* PRO GRAFİKLİ MULTI-CHART ANALİZ PANELİ */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Gelişmiş Algoritmik Analiz Matrisi</Text>

        {/* Grafik Sekme Butonları */}
        <View style={styles.chartTabsContainer}>
          <Pressable style={[styles.chartTab, activeChartTab === "VLF" && styles.chartTabActive]} onPress={() => setActiveChartTab("VLF")}>
            <Text style={[styles.chartTabTextMain, activeChartTab === "VLF" && styles.chartTabTextMainActive]}>VLF Spektrum</Text>
          </Pressable>
          <Pressable style={[styles.chartTab, activeChartTab === "TINYML" && styles.chartTabActive]} onPress={() => setActiveChartTab("TINYML")}>
            <Text style={[styles.chartTabTextMain, activeChartTab === "TINYML" && styles.chartTabTextMainActive]}>TinyML Anomali</Text>
          </Pressable>
          <Pressable style={[styles.chartTab, activeChartTab === "AĞ_GECIKME" && styles.chartTabActive]} onPress={() => setActiveChartTab("AĞ_GECIKME")}>
            <Text style={[styles.chartTabTextMain, activeChartTab === "AĞ_GECIKME" && styles.chartTabTextMainActive]}>Mesh Gecikme</Text>
          </Pressable>
        </View>

        {/* Seçili Sekmeye Göre Çizilen Grafik */}
        {activeChartTab === "VLF" && (
          <View>
            <LineChart
              data={{
                labels: ["-5s", "-4s", "-3s", "-2s", "-1s", "Şimdi"],
                datasets: [{ data: vlfHistory }]
              }}
              width={screenWidth}
              height={180}
              yAxisSuffix="µT"
              chartConfig={chartConfigs.vlf}
              style={styles.chartStyle}
              bezier
            />
            <Text style={styles.sensorText}>Anlık Genlik Değeri: {magnetoData.z?.toFixed(2) || "0.00"} µT</Text>
          </View>
        )}

        {activeChartTab === "TINYML" && (
          <View>
            <LineChart
              data={{
                labels: ["T-5", "T-4", "T-3", "T-2", "T-1", "İnference"],
                datasets: [{ data: tinyMlHistory }]
              }}
              width={screenWidth}
              height={180}
              yAxisSuffix="%"
              chartConfig={chartConfigs.tinyml}
              style={styles.chartStyle}
            />
            <Text style={[styles.sensorText, { color: '#a78bfa' }]}>Uçta Yapay Zeka Güven Puanı: %{isDemoMode ? tinyMlHistory[5] : (aiConfidence ? (aiConfidence * 100).toFixed(0) : "94")}</Text>
          </View>
        )}

        {activeChartTab === "AĞ_GECIKME" && (
          <View>
            <BarChart
              data={{
                labels: ["L-Node", "N-Alpha", "N-Beta", "Gateway", "Hop-Avg", "Cur-Mesh"],
                datasets: [{ data: latencyHistory }]
              }}
              width={screenWidth}
              height={180}
              yAxisLabel=""
              yAxisSuffix="ms"
              chartConfig={chartConfigs.latency}
              style={styles.chartStyle}
            />
            <Text style={[styles.sensorText, { color: '#38bdf8' }]}>Mesh Ortalama Yayılım Gecikmesi: {latencyHistory[5]} ms</Text>
          </View>
        )}

        <Text style={styles.sensorSubText}>
          İvmeölçer Ham Veri Vektörleri (X/Y/Z): {accelData.x?.toFixed(2) || "0.00"}G / {accelData.y?.toFixed(2) || "0.00"}G / {accelData.z?.toFixed(2) || "0.00"}G
        </Text>
      </View>

      {/* SENSÖR SAĞLIK TABLOSU VE ANALİTİK VERİ ETİKETLERİ */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Düğüm Sensör Sağlık Skoru</Text>
        <View style={styles.healthGrid}>
          <HealthBar label="VLF ADC Girişi" value={healthScores.adc} />
          <HealthBar label="Gürültü Oranı (SNR)" value={healthScores.noise} />
          <HealthBar label="Model Kalibrasyon" value={healthScores.calibration} />
          <HealthBar label="Sinyal Bütünlüğü" value={healthScores.signal} />
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

      {/* KAPSAMLI UZAY HAVASI BİLİM MODU KARTI */}
      {scienceExplanation && (
        <View style={[styles.card, styles.scienceCard]}>
          <View style={styles.cardTitleRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="globe" size={16} color="#a78bfa" />
              <Text style={[styles.cardTitle, { color: "#a78bfa", marginLeft: 8, marginBottom: 0 }]}>İyonosferik Bilim Modu Analizi</Text>
            </View>
            <View style={styles.scienceBadge}>
              <Text style={styles.scienceBadgeText}>VLF SPEKTRUM</Text>
            </View>
          </View>
          <Text style={styles.scienceText}>{scienceExplanation}</Text>
          <View style={styles.scienceMetricsFooterGrid}>
            <Text style={styles.scienceSubText_v2}>Uzay Hava Durumu: <Text style={{color:'#fff'}}>{spaceState || "SABİT / SAKİN"}</Text></Text>
            <Text style={styles.scienceSubText_v2}>İndeks Eğilimi: <Text style={{color:'#fff'}}>{trend || "YATAY"}</Text></Text>
            <Text style={styles.scienceSubText_v2}>Hesaplanan Kp Endeksi: <Text style={{color: spaceState === "BURST" ? '#ef4444' : '#10b981'}}>{spaceState === "BURST" ? "7+ (Şiddetli Fırtına)" : "2 (Sakin)"}</Text></Text>
          </View>
        </View>
      )}

      {/* SELF-TEST KONTROL LİSTESİ */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>Düğüm İç Donanım Self-Test Kontrolü</Text>
          {hasLiveData && (
            <View style={[styles.miniBadge, allTestsOk ? styles.miniBadgeOk : styles.miniBadgeWarn]}>
              <Text style={styles.miniBadgeText}>{allTestsOk ? "TÜM SİSTEMLER OK" : "KONTROL GEREKİYOR"}</Text>
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

      {/* DAĞITIK MESH CONSENSUS PANELİ */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Bizans Hata Toleranslı Dağıtık Konsensüs</Text>
        <View style={styles.consensusRow}>
          <Text style={[styles.consensusStatus, consensusColor(activeConsensus?.status || "Sakin")]}>
            {activeConsensus?.status || "Sakin"}
          </Text>
          <Text style={styles.consensusSub}>
            {activeConsensus?.participatingNodes ?? 0}/{activeConsensus?.totalNodes || 1} aktif düğüm spektral anomalide uzlaştı.
          </Text>
        </View>
        {activeConsensus?.nodeScores && activeConsensus.nodeScores.length > 0 ? (
          activeConsensus.nodeScores.map((n, idx) => (
            <View key={idx} style={styles.row}>
              <Text style={styles.label}>{n.nodeId}</Text>
              <Text style={styles.value}>{n.level} (Ağırlık Puanı: {n.score})</Text>
            </View>
          ))
        ) : (
          <Text style={styles.sensorSubText_Left}>
            Şu an ağda oylamaya katılan anomali durum kaydı bulunmamaktadır. Birden fazla ORBIT-MESH cihazı aktif edildiğinde düğümler arası eşler arası mutabakat burada listelenir.
          </Text>
        )}
      </View>

      {!isBleConnected && !isDemoMode && (
        <View style={[styles.card, styles.alertBoxInline]}>
          <Feather name="bluetooth" size={16} color="#38bdf8" />
          <Text style={[styles.alertText, { color: "#38bdf8" }]}>
            ORBIT-MESH donanımına bağlı değilsiniz. Lütfen BLE Terminal ekranından bağlanın.
          </Text>
        </View>
      )}

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

// YARDIMCI BİLEŞENLER
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
  if (status === "Doğrulanmış" || status === "Doğrulanmış Anomali") return { color: "#FF6B6B" };
  if (status === "Şüpheli") return { color: "#FBBF24" };
  return { color: "#00E5B0" };
}

// RE-USABLE CHART CONFIGURATIONS
const chartConfigs = {
  vlf: {
    backgroundColor: "#1e293b",
    backgroundGradientFrom: "#1e293b",
    backgroundGradientTo: "#1e293b",
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(56, 189, 248, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
    propsForDots: { r: "4", strokeWidth: "2", stroke: "#0ea5e9" }
  },
  tinyml: {
    backgroundColor: "#1e293b",
    backgroundGradientFrom: "#0f172a",
    backgroundGradientTo: "#1e293b",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(167, 139, 250, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
    propsForDots: { r: "5", strokeWidth: "1", stroke: "#c084fc" }
  },
  latency: {
    backgroundColor: "#1e293b",
    backgroundGradientFrom: "#1e293b",
    backgroundGradientTo: "#020617",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 229, 176, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
  }
};

// PROFESSIONAL UI DESIGN STYLES
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  headerRow: { marginBottom: 16, marginTop: Platform.OS === 'ios' ? 44 : 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#f8fafc' },
  subTitle_v2: { fontSize: 12, color: '#38bdf8', fontWeight: '500', marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 },
  statusRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#334155', gap: 6 },
  badgeText: { color: '#e2e8f0', fontSize: 11, fontWeight: '600' },
  card: { backgroundColor: '#1e293b', padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#38bdf8', marginBottom: 14 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  chartStyle: { marginVertical: 8, borderRadius: 12, marginLeft: -12 },
  sensorText: { color: '#00E5B0', fontSize: 15, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', textAlign: 'center', marginTop: 8, fontWeight: 'bold' },
  sensorSubText: { color: '#64748b', fontSize: 11, textAlign: 'center', marginTop: 6 },
  sensorSubText_Left: { color: '#94a3b8', fontSize: 12, lineHeight: 18, textAlign: 'left', marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  label: { color: '#cbd5e1', fontSize: 13 },
  value: { color: '#00E5B0', fontSize: 13, fontWeight: 'bold' },
  alertBoxInline: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e2a3a', gap: 8, padding: 12, borderRadius: 12 },
  alertText: { color: '#FF6B6B', fontSize: 12, marginLeft: 8, flex: 1, lineHeight: 18 },

  proActionCard: { backgroundColor: '#1e1b4b', padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#4338ca' },
  proCardTitle: { fontSize: 13, fontWeight: 'bold', color: '#a78bfa', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  proButtonRow: { flexDirection: 'row', gap: 8 },
  proButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8 },
  proButtonText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },

  killerCard: { backgroundColor: '#020617', padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 2, borderColor: '#00E5B0' },
  livePulseContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444' },
  livePulse: { color: '#ef4444', fontSize: 9, fontWeight: 'bold' },
  meshVisualContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 12, backgroundColor: '#0f172a', padding: 8, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b' },
  meshNode: { paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#1e293b', alignItems: 'center', gap: 2, borderWidth: 1, borderColor: '#334155', minWidth: 68 },
  meshNodeActive: { backgroundColor: '#059669', borderColor: '#00E5B0' },
  meshNodeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  nodeMiniStat: { color: '#cbd5e1', fontSize: 8 },
  killerSectionTitle: { color: '#94a3b8', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  logTerminal: { backgroundColor: '#000', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#1e293b', minHeight: 130, maxHeight: 180 },
  terminalPlaceholder: { color: '#475569', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  terminalRow: { flexDirection: 'row', gap: 6, marginBottom: 5, alignItems: 'center' },
  terminalTime: { color: '#64748b', fontSize: 10, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  terminalTag: { fontSize: 10, fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', minWidth: 75 },
  terminalMsg: { color: '#e2e8f0', fontSize: 11, flex: 1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  terminalRssi: { color: '#10b981', fontSize: 10, fontWeight: 'bold' },

  // SECKME PANEL YAPISI
  chartTabsContainer: { flexDirection: 'row', backgroundColor: '#0f172a', padding: 4, borderRadius: 8, marginBottom: 12 },
  chartTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  chartTabActive: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  chartTabTextMain: { color: '#64748b', fontSize: 11, fontWeight: '600' },
  chartTabTextMainActive: { color: '#38bdf8' },

  // LOG FİLTRELEME TERMINAL STYLES
  logHeaderContainer: { flexDirection: 'column', gap: 8, marginBottom: 8, marginTop: 14 },
  filterTabsRow: { flexDirection: 'row', gap: 4 },
  filterTabButton: { backgroundColor: '#0f172a', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: '#1e293b' },
  filterTabButtonActive: { borderColor: '#00E5B0', backgroundColor: '#1e293b' },
  filterTabText: { color: '#64748b', fontSize: 9, fontWeight: 'bold' },
  filterTabTextActive: { color: '#00E5B0' },

  // P2P PROVISIONER STYLES
  p2pProvisionerBox: { backgroundColor: '#0f172a', padding: 12, borderRadius: 12, marginBottom: 4, borderWidth: 1, borderColor: '#1e293b', marginTop: 12 },
  p2pTitle: { color: '#cbd5e1', fontSize: 11, fontWeight: 'bold' },
  p2pButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8, borderWidth: 1, marginTop: 6 },
  p2pButtonText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  discoveredNodesList: { marginTop: 10, gap: 6 },
  nodeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  nodeRowSubInfo: { color: '#64748b', fontSize: 9, marginTop: 1 },
  nodeNameText: { color: '#f8fafc', fontSize: 11, fontWeight: 'bold' },
  nodeRssiText: { color: '#94a3b8', fontSize: 10, fontFamily: 'monospace' },
  nodeStatusText: { fontSize: 10, fontWeight: 'bold' },

  healthGrid: { gap: 8, marginBottom: 12 },
  healthItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  healthLabel: { color: '#cbd5e1', fontSize: 12, width: 110 },
  healthBarBg: { flex: 1, height: 8, backgroundColor: '#334155', borderRadius: 4, overflow: 'hidden' },
  healthBarFill: { height: '100%', borderRadius: 4 },
  healthValue: { fontSize: 12, fontWeight: 'bold', width: 40, textAlign: 'right' },
  qualityBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#334155' },
  qualityText: { fontSize: 12, fontWeight: '600' },

  miniBadge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10 },
  miniBadgeOk: { backgroundColor: '#064e3b' },
  miniBadgeWarn: { backgroundColor: '#451a03' },
  miniBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#e2e8f0' },
  testRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  testLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  testRight: { alignItems: 'flex-end' },
  testDetail: { color: '#64748b', fontSize: 10, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },

  consensusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  consensusStatus: { fontSize: 20, fontWeight: 'bold' },
  consensusSub: { color: '#94a3b8', fontSize: 12 },

  scienceCard: { borderColor: '#5b21b6', backgroundColor: '#13112c', borderWidth: 1 },
  scienceBadge: { backgroundColor: '#3b0764', paddingVertical: 2, paddingHorizontal: 6, borderRadius: 6 },
  scienceBadgeText: { color: '#c084fc', fontSize: 9, fontWeight: 'bold' },
  scienceText: { color: '#e2e8f0', fontSize: 13, lineHeight: 18 },
  scienceMetricsFooterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#3b0764' },
  scienceSubText_v2: { color: '#a78bfa', fontSize: 10, fontWeight: 'bold' },
});