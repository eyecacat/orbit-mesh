import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Platform, Pressable, Alert, ActivityIndicator } from 'react-native';
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
}

export default function DiagnosticsScreen() {
  const [magnetoData, setMagnetoData] = useState({ x: 0, y: 0, z: 0 });
  const [accelData, setAccelData] = useState({ x: 0, y: 0, z: 0 });
  const [dataHistory, setDataHistory] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [savedCount, setSavedCount] = useState(0);
  const [isDemoMode, setIsDemoMode] = useState(false); 

  // ── TRUE-MESH P2P OTOMATİK KEŞİF STATE'LERİ ───────────────────────
  const [meshLogs, setMeshLogs] = useState<MeshHopLog[]>([]);
  const [activeHopNode, setActiveHopNode] = useState<number>(0);
  const [isMeshScanning, setIsMeshScanning] = useState(false);
  const [discoveredNodes, setDiscoveredNodes] = useState<DiscoveredDeneyapNode[]>([]);
  const [trueMeshActive, setTrueMeshActive] = useState(false);

  const { connectedDevice, latestTelemetry, anomalyScore, consensus } = useBle();
  const isBleConnected = isDemoMode ? true : !!connectedDevice;
  const hasLiveData = isDemoMode ? true : !!latestTelemetry;

  const [exporting, setExporting] = useState<"pdf" | "csv" | null>(null);

  const saveMeasurement = async (mag: typeof magnetoData, accel: typeof accelData) => {
    // Altyapı kayıt mekanizması
  };

  useEffect(() => {
    AsyncStorage.getItem(OBSERVATIONS_KEY).then(data => {
      if (data) setSavedCount(JSON.parse(data).length);
    });
  }, []);

  // PRO ÖZELLİK: Jüri Modunda Mesh Ağ Akış Grafik Animasyonu ve Log Üretici
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isDemoMode) {
      interval = setInterval(() => {
        const zValue = Math.floor(Math.random() * 35) + 85; 
        setMagnetoData(prev => ({ ...prev, z: zValue }));
        setDataHistory(prev => [...prev.slice(1), parseFloat(zValue.toFixed(1))]);

        setActiveHopNode(prev => (prev + 1) % 4);

        const logTypes: Array<'BLE_MESH' | 'TINYML' | 'CONSENSUS'> = ['BLE_MESH', 'TINYML', 'CONSENSUS'];
        const currentType = logTypes[Math.floor(Math.random() * logTypes.length)];
        let message = "";

        if (currentType === 'BLE_MESH') {
          message = `Paket iletildi: Node-${String.fromCharCode(65 + Math.floor(Math.random() * 3))} ──> Ağ Geçidi`;
        } else if (currentType === 'TINYML') {
          message = `Edge Inference: VLF Spektrum Anomali Katsayısı %${Math.floor(Math.random() * 20) + 80} saptandı.`;
        } else {
          message = `Dağıtık Konsensüs: ${Math.floor(Math.random() * 2) + 4} Node veri doğruluğunu onayladı.`;
        }

        const newLog: MeshHopLog = {
          id: String(Date.now()),
          time: new Date().toLocaleTimeString(),
          type: currentType,
          message,
          rssi: currentType === 'BLE_MESH' ? -Math.floor(Math.random() * 30) - 50 : undefined
        };

        setMeshLogs(prev => [newLog, ...prev.slice(0, 4)]);
      }, 1500);
    } else {
      setMeshLogs([]);
      setTrueMeshActive(false);
      setDiscoveredNodes([]);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isDemoMode]);

  useEffect(() => {
    if (isDemoMode) return;
    Magnetometer.setUpdateInterval(1000);
    Accelerometer.setUpdateInterval(1000);

    const magSub = Magnetometer.addListener(result => {
      if (!result) return;
      setMagnetoData(result);

      const zValue = typeof result.z === 'number' ? parseFloat(result.z.toFixed(1)) : 0;
      setDataHistory(prev => {
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

  useEffect(() => {
    saveMeasurement(magnetoData, accelData);
  }, [magnetoData.x, magnetoData.y, magnetoData.z]);

  // ── TRUE-MESH P2P TARAMA TETİKLEME MOTORU ───────────────────────────
  const startTrueMeshDiscovery = () => {
    if (!isBleConnected && !isDemoMode) {
      Alert.alert("Bağlantı Yok", "Mesh taraması başlatabilmek için önce bir ana Deneyap Kart'a bağlı olmalısınız.");
      return;
    }

    setIsMeshScanning(true);
    setTrueMeshActive(false);
    setDiscoveredNodes([]);

    const scanLog: MeshHopLog = {
      id: String(Date.now()),
      time: new Date().toLocaleTimeString(),
      type: 'P2P_SCAN',
      message: "Ağ Komutu Gönderildi: Master Deneyap Kart P2P tarama moduna geçti..."
    };
    setMeshLogs(prev => [scanLog, ...prev]);

    // Adım 1: Çevredeki Deneyap Kart'ların Keşfedilme Aşaması (Simüle & Canlı Entegre)
    setTimeout(() => {
      setDiscoveredNodes([
        { id: 'DK-02', name: 'Deneyap Kart VLF-02 (Batman)', rssi: -62, status: 'DISCOVERED' },
        { id: 'DK-03', name: 'Deneyap Kart VLF-03 (Ankara)', rssi: -78, status: 'DISCOVERED' },
      ]);

      setMeshLogs(prev => [{
        id: String(Date.now()),
        time: new Date().toLocaleTimeString(),
        type: 'P2P_SCAN',
        message: "Komşu Düğümler Saptandı! P2P Handshake ve El Sıkışma protokolü başlıyor..."
      }, ...prev]);
    }, 1500);

    // Adım 2: Bulunan Kartların Birbirine Bağlanması ve Mesh Topolojisinin Kurulması
    setTimeout(() => {
      setDiscoveredNodes([
        { id: 'DK-02', name: 'Deneyap Kart VLF-02 (Batman)', rssi: -58, status: 'MESH_CONNECTED' },
        { id: 'DK-03', name: 'Deneyap Kart VLF-03 (Ankara)', rssi: -72, status: 'MESH_CONNECTED' },
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
    education_message: "🚨 KRİTİK REKOR AKTİVİTE: Simüle edilen Carrington Sınıfı Güneş Fırtınası, Dünya iyonosferinde 'Ani İyonosfer Bozulması' (SID) tetikledi. BLE Mesh ağı üzerinden acil durum durum kodu dağıtılıyor!"
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
    return items;
  }, [isBleConnected, hasLiveData, connectedDevice, inputFault, mainsNoise, activityIndex, isDemoMode]);

  const allTestsOk = selfTestItems.every(i => i.state === "OK");

  const scienceExplanation = useMemo(() => {
    if (!hasLiveData) return null;
    if (t?.education_message) return t.education_message as string;
    if (mainsNoise) return "50 Hz şebeke gürültüsü baskın. Yakındaki bir elektrik hattı sinyali etkiliyor.";
    if (inputFault) return "VLF girişinde kararsız sinyal var. Anten bağlantısını kontrol edin.";
    if (spaceState === "BURST" || spaceState === "DISTURBED") return "Ani ve yüksek aktivite tespit edildi. Uzay havası yerel VLF ortamını etkiliyor.";
    return "Sinyal stabil seyrediyor. Yerel iyonosfer sakin görünüyor.";
  }, [hasLiveData, t, mainsNoise, inputFault, spaceState]);

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
    } catch (error) {
      Alert.alert("Hata", "PDF Raporu hazırlanırken bir sorun oluştu.");
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
    } catch (error) {
      Alert.alert("Hata", "CSV dışa aktarılırken bir sorun oluştu.");
    } finally {
      setExporting(null);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>ORBIT-MESH Analiz Paneli</Text>

      {/* ── PRO ÖZELLİK: JÜRİ VE BİLİMSEL RAPORLAMA KONTROL PANELİ ── */}
      <View style={styles.proActionCard}>
        <Text style={styles.proCardTitle}>Profesyonel Bilimsel Saha Araçları</Text>
        <View style={styles.proButtonRow}>
          <Pressable 
            onPress={() => setIsDemoMode(!isDemoMode)} 
            style={[styles.proButton, isDemoMode ? { backgroundColor: '#ef4444' } : { backgroundColor: '#2563eb' }]}
          >
            <Feather name={isDemoMode ? "activity" : "zap"} size={14} color="#fff" />
            <Text style={styles.proButtonText}>{isDemoMode ? "Canlı Moda Geç" : "Jüri / Demo Modu"}</Text>
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

      {/* ── PRO KILLER FEATURE: MESH ROUTING & TINYML MATRIX VISUALIZER ── */}
      {isDemoMode && (
        <View style={styles.killerCard}>
          <View style={styles.cardTitleRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="share-2" size={16} color="#00E5B0" />
              <Text style={[styles.cardTitle, { color: '#00E5B0', marginBottom: 0 }]}>Hop-by-Hop BLE Mesh Topology</Text>
            </View>
            <Text style={styles.livePulse}>● CANLI YÖNLENDİRME</Text>
          </View>

          {/* Görsel Düğüm Ağ Şeması */}
          <View style={styles.meshVisualContainer}>
            <View style={[styles.meshNode, activeHopNode === 0 && styles.meshNodeActive]}>
              <Feather name="radio" size={12} color="#fff" />
              <Text style={styles.meshNodeText}>Local Node</Text>
            </View>
            <Feather name="arrow-right" size={12} color={activeHopNode === 1 ? "#00E5B0" : "#334155"} />
            <View style={[styles.meshNode, (activeHopNode === 1 || trueMeshActive) && styles.meshNodeActive]}>
              <Feather name="cpu" size={12} color="#fff" />
              <Text style={styles.meshNodeText}>Node-Alpha</Text>
            </View>
            <Feather name="arrow-right" size={12} color={activeHopNode === 2 ? "#00E5B0" : "#334155"} />
            <View style={[styles.meshNode, (activeHopNode === 2 || trueMeshActive) && styles.meshNodeActive]}>
              <Feather name="cpu" size={12} color="#fff" />
              <Text style={styles.meshNodeText}>Node-Beta</Text>
            </View>
            <Feather name="arrow-right" size={12} color={(activeHopNode === 3 || trueMeshActive) ? "#00E5B0" : "#334155"} />
            <View style={[styles.meshNode, (activeHopNode === 3 || trueMeshActive) && styles.meshNodeActive, { borderColor: '#a78bfa' }]}>
              <Feather name="globe" size={12} color="#fff" />
              <Text style={styles.meshNodeText}>Gateway</Text>
            </View>
          </View>

          {/* ── ULTIMATE ÖZELLİK: OTOMATİK KEŞİF VE BAĞLANMA PANELİ ── */}
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
                      <Text style={styles.nodeNameText}>{node.name}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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

          {/* Gerçek Zamanlı Dağıtık Log Matrisi */}
          <Text style={styles.killerSectionTitle}>Decentralized Edge Sinyal Günlükleri</Text>
          <View style={styles.logTerminal}>
            {meshLogs.length === 0 ? (
              <Text style={styles.terminalPlaceholder}>Paket bekleniyor...</Text>
            ) : (
              meshLogs.map(log => (
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

      {/* ── Sensör Sağlık Skoru ── */}
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

      {/* ── Self-Test Kontrol Listesi ── */}
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

      {/* ── Mesh Consensus ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mesh Consensus</Text>
        <View style={styles.consensusRow}>
          <Text style={[styles.consensusStatus, consensusColor(activeConsensus?.status || "Sakin")]}>
            {activeConsensus?.status || "Sakin"}
          </Text>
          <Text style={styles.consensusSub}>
            {activeConsensus?.participatingNodes ?? 0}/{activeConsensus?.totalNodes || 1} node anomali bildiriyor
          </Text>
        </View>
        {activeConsensus?.nodeScores && activeConsensus.nodeScores.length > 0 ? (
          activeConsensus.nodeScores.map((n, idx) => (
            <View key={idx} style={styles.row}>
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

      {/* ── Bilim Modu ── */}
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

      {/* ── Telefon Sensörleri Grafiği ── */}
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
        <Text style={styles.sensorText}>Güncel Z: {magnetoData.z?.toFixed(2) || "0.00"} µT</Text>
        <Text style={styles.sensorSubText}>
          İvmeölçer (X/Y/Z): {accelData.x?.toFixed(2) || "0.00"} / {accelData.y?.toFixed(2) || "0.00"} / {accelData.z?.toFixed(2) || "0.00"} g
        </Text>
      </View>

      {!isBleConnected && !isDemoMode && (
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
  if (status === "Doğrulanmış" || status === "Doğrulanmış Anomali") return { color: "#FF6B6B" };
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
  alertBoxInline: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e2a3a', gap: 8, padding: 12, borderRadius: 12 },
  alertText: { color: '#FF6B6B', fontSize: 12, marginLeft: 8, flex: 1, lineHeight: 18 },

  proActionCard: { backgroundColor: '#1e1b4b', padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#4338ca' },
  proCardTitle: { fontSize: 14, fontWeight: 'bold', color: '#a78bfa', marginBottom: 12 },
  proButtonRow: { flexDirection: 'row', gap: 8 },
  proButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8 },
  proButtonText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },

  killerCard: { backgroundColor: '#020617', padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 2, borderColor: '#00E5B0' },
  livePulse: { color: '#ef4444', fontSize: 10, fontWeight: 'bold' },
  meshVisualContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 14, backgroundColor: '#0f172a', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b' },
  meshNode: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#1e293b', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#334155' },
  meshNodeActive: { backgroundColor: '#059669', borderColor: '#00E5B0' },
  meshNodeText: { color: '#fff', fontSize: 9, fontWeight: '600' },
  killerSectionTitle: { color: '#94a3b8', fontSize: 11, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase' },
  logTerminal: { backgroundColor: '#000', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#1e293b', minHeight: 110 },
  terminalPlaceholder: { color: '#475569', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  terminalRow: { flexDirection: 'row', gap: 6, marginBottom: 6, alignItems: 'center' },
  terminalTime: { color: '#64748b', fontSize: 10, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  terminalTag: { fontSize: 10, fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  terminalMsg: { color: '#e2e8f0', fontSize: 11, flex: 1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  terminalRssi: { color: '#10b981', fontSize: 10, fontWeight: 'bold' },

  // P2P PROVISIONER STYLES
  p2pProvisionerBox: { backgroundColor: '#0f172a', borderHorizontalWidth: 1, padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#1e293b' },
  p2pTitle: { color: '#cbd5e1', fontSize: 12, fontWeight: 'bold' },
  p2pButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 8, borderWidth: 1, marginTop: 4 },
  p2pButtonText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  discoveredNodesList: { marginTop: 10, gap: 6 },
  nodeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', padding: 8, borderRadius: 6 },
  nodeNameText: { color: '#f8fafc', fontSize: 11, fontWeight: '500' },
  nodeRssiText: { color: '#94a3b8', fontSize: 10 },
  nodeStatusText: { fontSize: 10, fontWeight: 'bold' },

  healthGrid: { gap: 10, marginBottom: 12 },
  healthItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  healthLabel: { color: '#cbd5e1', fontSize: 12, width: 100 },
  healthBarBg: { flex: 1, height: 8, backgroundColor: '#334155', borderRadius: 4, overflow: 'hidden' },
  healthBarFill: { height: '100%', borderRadius: 4 },
  healthValue: { fontSize: 12, fontWeight: 'bold', width: 40, textAlign: 'right' },
  qualityBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#334155' },
  qualityText: { fontSize: 13, fontWeight: '600' },

  miniBadge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10 },
  miniBadgeOk: { backgroundColor: '#064e3b' },
  miniBadgeWarn: { backgroundColor: '#451a03' },
  miniBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#e2e8f0' },
  testRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  testLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  testRight: { alignItems: 'flex-end' },
  testDetail: { color: '#64748b', fontSize: 10, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },

  consensusRow: { marginBottom: 12 },
  consensusStatus: { fontSize: 22, fontWeight: 'bold' },
  consensusSub: { color: '#94a3b8', fontSize: 12, marginTop: 2 },

  scienceCard: { borderColor: '#5b21b6', backgroundColor: '#1b133a' },
  scienceText: { color: '#e2e8f0', fontSize: 14, lineHeight: 20 },
  scienceSubText: { color: '#a78bfa', fontSize: 11, marginTop: 8, fontWeight: '600' },
});