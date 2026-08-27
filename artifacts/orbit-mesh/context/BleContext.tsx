// context/BleContext.tsx
// ORBIT-MESH PRO V2.1 ULTRA — ÇOKLU BLE BAĞLANTI (MESH) DESTEĞİ
// Tüm IMU alanları kaldırıldı, yeni şema (OrbitMeshTelemetry) kullanılıyor.
// Artık birden fazla Deneyap Kart aynı anda bağlanabilir.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import { parseTelemetry, OrbitMeshTelemetry } from "@/utils/telemetryParser";
import { computeAnomalyScore, AnomalyScore } from "@/services/anomalyEngine";
import {
  recordScore,
  removeNode,
  getConsensus,
} from "@/services/meshConsensus";
import type { ConsensusResult } from "@/services/meshConsensus";
import { pqcManager } from "@/services/pqcEngine";
import type { PQCPacket } from "@/services/pqcEngine";

type BleManagerType = import("react-native-ble-plx").BleManager;
type BleDeviceType = import("react-native-ble-plx").Device;
type SubType = { remove(): void };

let _manager: BleManagerType | null = null;
let _stateChangeSub: SubType | null = null;
let _notifySubs: SubType[] = [];
let _disconnectSubs: Map<string, SubType> = new Map();

function getManager(): BleManagerType | null {
  if (_manager) return _manager;
  if (Platform.OS === "web") return null;
  try {
    const { BleManager } =
      require("react-native-ble-plx") as typeof import("react-native-ble-plx");
    _manager = new BleManager();
    return _manager;
  } catch {
    return null;
  }
}

function isExpoGo(): boolean {
  try {
    const C = require("expo-constants").default;
    return C.appOwnership === "expo";
  } catch {
    return false;
  }
}

export interface BleDeviceInfo {
  id: string;
  name: string | null;
  rssi: number | null;
  isConnectable: boolean | null;
  serviceUUIDs: string[] | null;
  manufacturerData: string | null;
}

export type LogLevel = "info" | "warn" | "error" | "scan";
export interface LogEntry {
  id: string;
  time: string;
  level: LogLevel;
  message: string;
}

export interface MeshNodeStatus {
  id: string;
  name: string | null;
  lastSeen: number;
  telemetry: OrbitMeshTelemetry | null;
  anomalyScore: AnomalyScore | null;
  health: string;
  isConnected: boolean;
  rssi: number | null;
}

export interface BleContextValue {
  isAvailable: boolean | null;
  isExpoGoEnv: boolean;
  permissionsGranted: boolean | null;
  scanning: boolean;
  devices: BleDeviceInfo[];
  connectedDevices: BleDeviceInfo[];         // ÇOKLU cihaz listesi
  telemetry: OrbitMeshTelemetry[];
  latestTelemetry: OrbitMeshTelemetry | null;
  logs: LogEntry[];
  anomalyScore: AnomalyScore | null;
  consensus: ConsensusResult;
  meshNodes: MeshNodeStatus[];
  nodeMoving: boolean;
  pqcStatus: {
    totalNodes: number;
    pqcActiveNodes: string[];
    recentVerifications: number;
    recentFailures: number;
    failureRate: number;
  };
  requestPermissions(): Promise<boolean>;
  startScan(): void;
  stopScan(): void;
  connectToDevice(device: BleDeviceInfo): Promise<void>;
  disconnect(deviceId?: string): void;
  clearLogs(): void;
}

const BleContext = createContext<BleContextValue | null>(null);

const SERVICE_UUID = "12345678-1234-1234-1234-123456789abc";
const COMMAND_UUID = "abcdefab-cdef-abcd-efab-cdefabcdefac";
const STATUS_UUID = "abcdefab-cdef-abcd-efab-cdefabcdefad";
const ORBIT_NAME_PREFIX = "ORBIT-MESH";
const SCAN_TIMEOUT = 15000;

const DEFAULT_CONSENSUS: ConsensusResult = {
  status: "Normal",
  anomalyCount: 0,
  totalNodes: 0,
  participatingNodes: 0,
  nodeScores: [],
  lastUpdated: Date.now(),
};

export function BleProvider({ children }: { children: React.ReactNode }) {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [permissionsGranted, setPermissionsGranted] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<BleDeviceInfo[]>([]);
  const [connectedDevices, setConnectedDevices] = useState<BleDeviceInfo[]>([]);
  const [telemetry, setTelemetry] = useState<OrbitMeshTelemetry[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [anomalyScore, setAnomalyScore] = useState<AnomalyScore | null>(null);
  const [consensus, setConsensus] = useState<ConsensusResult>(DEFAULT_CONSENSUS);
  const [meshNodes, setMeshNodes] = useState<MeshNodeStatus[]>([]);
  const [nodeMoving, setNodeMoving] = useState(false);

  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const discoveredIds = useRef<Set<string>>(new Set());
  const rawDeviceRefs = useRef<Map<string, BleDeviceType>>(new Map());
  const isExpoGoEnv = isExpoGo();
  const meshNodeRef = useRef<Map<string, MeshNodeStatus>>(new Map());

  const addLog = useCallback((level: LogLevel, message: string) => {
    const time = new Date().toLocaleTimeString("tr-TR", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setLogs((prev) =>
      [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          time,
          level,
          message,
        },
        ...prev,
      ].slice(0, 300)
    );
  }, []);

  // Mesh node güncelleme
  const updateMeshNode = useCallback(
    (t: OrbitMeshTelemetry, connected: boolean, rssi: number | null = null) => {
      const score = computeAnomalyScore(t);
      const moving = t.mot_vel > 0.5 && t.mot_conf > 50;
      setNodeMoving(moving);
      // Anomali skorunu global olarak güncelle (son gelen veriye göre)
      setAnomalyScore(score);

      const health =
        score.level === "Kritik"
          ? "Kritik"
          : score.level === "Yüksek"
          ? "Yüksek"
          : score.level === "Şüpheli"
          ? "Şüpheli"
          : moving
          ? "Hareket"
          : "Sağlıklı";

      const node: MeshNodeStatus = {
        id: t.nodeId,
        name: connected ? (connectedDevices.find(d => d.id === t.nodeId)?.name ?? null) : null,
        lastSeen: t.receivedAt,
        telemetry: t,
        anomalyScore: score,
        health,
        isConnected: connected,
        rssi,
      };

      meshNodeRef.current.set(t.nodeId, node);
      setMeshNodes(Array.from(meshNodeRef.current.values()));
      recordScore(score);
      setConsensus(getConsensus());
    },
    [connectedDevices]
  );

  // BLE durumu
  useEffect(() => {
    if (Platform.OS === "web") {
      setIsAvailable(false);
      return;
    }
    if (isExpoGoEnv) {
      setIsAvailable(false);
      addLog("warn", "Expo Go: BLE native modülü çalışmaz. EAS Development Build gerekli.");
      return;
    }
    const mgr = getManager();
    if (!mgr) {
      setIsAvailable(false);
      addLog("error", "react-native-ble-plx bulunamadı.");
      return;
    }
    if (!_stateChangeSub) {
      _stateChangeSub = mgr.onStateChange((state) => {
        const ok = state === "PoweredOn";
        setIsAvailable(ok);
        addLog("info", `Bluetooth durumu: ${state}`);
      }, true);
    } else {
      mgr.state().then((state) => setIsAvailable(state === "PoweredOn")).catch(() => {});
    }
  }, [addLog, isExpoGoEnv]);

  // Uygulama ön plana gelince bağlantı kontrolü
  useEffect(() => {
    const handler = (next: AppStateStatus) => {
      if (next === "active") {
        rawDeviceRefs.current.forEach((raw, id) => {
          raw
            .isConnected()
            .then((connected) => {
              if (!connected) {
                addLog("warn", `Cihaz ${id} bağlantısı kopmuş.`);
                _cleanupConnection(id);
                setConnectedDevices((prev) => prev.filter((d) => d.id !== id));
                removeNode(id);
                meshNodeRef.current.delete(id);
                setMeshNodes(Array.from(meshNodeRef.current.values()));
                setConsensus(getConsensus());
              }
            })
            .catch(() => {});
        });
      }
    };
    const sub = AppState.addEventListener("change", handler);
    return () => sub.remove();
  }, [addLog]);

  // İzinler
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== "android") {
      setPermissionsGranted(true);
      return true;
    }
    try {
      const { PermissionsAndroid } = require("react-native");
      let granted = false;
      if ((Platform.Version as number) >= 31) {
        const res = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        granted = Object.values(res).every((v) => v === PermissionsAndroid.RESULTS.GRANTED);
      } else {
        const res = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        granted = res === PermissionsAndroid.RESULTS.GRANTED;
      }
      setPermissionsGranted(granted);
      addLog(granted ? "info" : "error", granted ? "Android BLE izinleri verildi." : "Android BLE izinleri reddedildi.");
      return granted;
    } catch (err: any) {
      addLog("error", `İzin hatası: ${err?.message ?? err}`);
      setPermissionsGranted(false);
      return false;
    }
  }, [addLog]);

  // Tarama
  const stopScan = useCallback(() => {
    const mgr = getManager();
    if (mgr) mgr.stopDeviceScan();
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    setScanning(false);
    addLog("info", "Tarama durduruldu.");
  }, [addLog]);

  const startScan = useCallback(() => {
    const mgr = getManager();
    if (!mgr) {
      addLog("error", "BLE manager yok.");
      return;
    }
    setScanning(true);
    setDevices([]);
    discoveredIds.current.clear();
    addLog("info", "BLE taraması başlatıldı...");

    mgr.startDeviceScan(
      [SERVICE_UUID],
      { scanMode: 2, allowDuplicates: true },
      (error, device) => {
        if (error) {
          addLog("error", `Tarama hatası: ${error.message} (${error.errorCode})`);
          setScanning(false);
          return;
        }
        if (!device) return;
        const name = device.name ?? device.localName ?? null;
        const id = device.id;
        const rssi = device.rssi ?? null;
        const matchesName = name ? name.startsWith(ORBIT_NAME_PREFIX) : false;
        const matchesService = device.serviceUUIDs
          ? device.serviceUUIDs.some((u) => u.toLowerCase() === SERVICE_UUID.toLowerCase())
          : false;
        if (!matchesName && !matchesService) return;

        const info: BleDeviceInfo = {
          id,
          name,
          rssi,
          isConnectable: device.isConnectable ?? null,
          serviceUUIDs: device.serviceUUIDs ?? null,
          manufacturerData: device.manufacturerData ?? null,
        };

        if (!discoveredIds.current.has(id)) {
          discoveredIds.current.add(id);
          addLog("scan", `Cihaz bulundu: ${name ?? id} (RSSI: ${rssi ?? "?"} dBm)`);
          setDevices((prev) => [...prev, info].sort((a, b) => (b.rssi ?? -100) - (a.rssi ?? -100)));
        } else {
          setDevices((prev) =>
            prev
              .map((d) => (d.id === id ? { ...d, rssi, isConnectable: info.isConnectable } : d))
              .sort((a, b) => (b.rssi ?? -100) - (a.rssi ?? -100))
          );
        }
      }
    );

    scanTimerRef.current = setTimeout(() => {
      mgr.stopDeviceScan();
      setScanning(false);
      addLog("info", "Tarama zaman aşımı (15s).");
    }, SCAN_TIMEOUT);
  }, [addLog]);

  // Bağlantı temizliği
  function _cleanupConnection(deviceId: string) {
    const subs = _notifySubs.filter((s) => (s as any)._deviceId === deviceId);
    subs.forEach((s) => {
      try {
        s.remove();
      } catch {}
    });
    _notifySubs = _notifySubs.filter((s) => !subs.includes(s));
    const disSub = _disconnectSubs.get(deviceId);
    if (disSub) {
      try {
        disSub.remove();
      } catch {}
      _disconnectSubs.delete(deviceId);
    }
    rawDeviceRefs.current.delete(deviceId);
  }

  // Komut gönderme
  const sendCommand = useCallback(
    async (deviceId: string, text: string) => {
      const raw = rawDeviceRefs.current.get(deviceId);
      if (!raw) {
        addLog("warn", `Komut gönderilemedi (bağlantı yok): ${text}`);
        return;
      }
      try {
        const b64 = btoa(text);
        await raw.writeCharacteristicWithResponseForService(SERVICE_UUID, COMMAND_UUID, b64);
        addLog("info", `[CMD→] ${text}`);
      } catch (err: any) {
        addLog("warn", `[CMD] Gönderilemedi "${text}": ${err?.message ?? err}`);
      }
    },
    [addLog]
  );

  const syncDeviceTime = useCallback(
    async (deviceId: string) => {
      const epochSec = Math.floor(Date.now() / 1000);
      await sendCommand(deviceId, `SET_TIME:${epochSec}`);
    },
    [sendCommand]
  );

  // Bağlan
  const connectToDevice = useCallback(
    async (device: BleDeviceInfo) => {
      const mgr = getManager();
      if (!mgr) return;

      // Zaten bağlı mı kontrol et
      if (connectedDevices.some((d) => d.id === device.id)) {
        addLog("info", `Cihaz zaten bağlı: ${device.name ?? device.id}`);
        return;
      }

      addLog("info", `Bağlanıyor: ${device.name ?? device.id}...`);

      try {
        mgr.stopDeviceScan();
        setScanning(false);

        const raw = await mgr.connectToDevice(device.id, { requestMTU: 512 });
        rawDeviceRefs.current.set(device.id, raw);
        addLog("info", `Bağlantı kuruldu: ${raw.id}`);
        setConnectedDevices((prev) => [...prev, device]);

        // Bağlantı kopma dinleyicisi
        const disSub = mgr.onDeviceDisconnected(device.id, (err, _d) => {
          addLog("warn", err ? `Bağlantı koptu: ${err.message}` : "Cihaz bağlantısı kesildi.");
          removeNode(device.id);
          meshNodeRef.current.delete(device.id);
          setMeshNodes(Array.from(meshNodeRef.current.values()));
          _cleanupConnection(device.id);
          setConnectedDevices((prev) => prev.filter((d) => d.id !== device.id));
          setConsensus(getConsensus());
        });
        _disconnectSubs.set(device.id, disSub);

        const discovered = await raw.discoverAllServicesAndCharacteristics();
        addLog("info", "Servisler ve karakteristikler keşfedildi.");

        const services = await discovered.services();
        let subscribedCount = 0;

        for (const svc of services) {
          const chars = await svc.characteristics();
          for (const ch of chars) {
            if (!ch.isNotifiable) continue;

            const sub = ch.monitor((err, characteristic) => {
              if (err) {
                if ((err as any).errorCode !== 205) {
                  addLog("error", `Bildirim hatası [${ch.uuid.slice(0, 8)}]: ${err.message}`);
                }
                return;
              }
              if (!characteristic?.value) return;

              const b64 = characteristic.value ?? "";
              addLog("scan", `[BASE64] ${b64}`);

              let rawJson: string;
              try {
                rawJson = atob(b64.replace(/\s/g, ""));
              } catch {
                addLog("error", "base64 decode hatası");
                return;
              }

              if (ch.uuid.toLowerCase() === COMMAND_UUID.toLowerCase()) {
                addLog(rawJson.startsWith("TIME_INVALID") ? "warn" : "info", `[CMD←] ${rawJson}`);
                return;
              }
              if (ch.uuid.toLowerCase() === STATUS_UUID.toLowerCase()) {
                addLog("info", `[STATUS] ${rawJson}`);
                return;
              }

              let telemetryJson = rawJson;
              let pqcActive = false;
              let pqcValid = true;

              if (rawJson.includes('"__pqc"')) {
                let pqcPacket: PQCPacket;
                try {
                  pqcPacket = JSON.parse(rawJson) as PQCPacket;
                } catch {
                  addLog("error", "[PQC] Paket parse hatası — düşürüldü");
                  return;
                }
                let tempNodeId = "ORBIT-UNKNOWN";
                try {
                  const tempPayload = JSON.parse(pqcPacket.payload);
                  tempNodeId = tempPayload.nodeId ?? tempNodeId;
                } catch {}
                const verifyResult = pqcManager.verifyPacket(tempNodeId, pqcPacket);
                pqcActive = true;
                if (!verifyResult.valid) {
                  addLog("error", `[PQC] DOĞRULAMA BAŞARISIZ [${tempNodeId}]: ${verifyResult.reason}`);
                  return;
                }
                pqcValid = true;
                telemetryJson = verifyResult.decryptedPayload ?? pqcPacket.payload;
                addLog("info", `[PQC] Paket doğrulandı [${tempNodeId}] — sayaç: ${pqcPacket.counter}`);
              } else {
                addLog("info", "[PQC] Legacy paket — PQC yok, geçiriliyor");
              }

              const parsed = parseTelemetry(btoa(telemetryJson));
              if (!parsed.data) {
                addLog("error", `[PARSE] ${parsed.error}`);
                return;
              }

              const t = parsed.data;
              addLog(
                "info",
                `[PARSED${pqcActive ? "+PQC" : ""}] node=${t.nodeId} vlf=${t.vlf_hz}Hz amp=${t.vlf_amp} bat=${t.bat}% state=${t.state}${t.anomaly ? " ANOMALI" : ""}`
              );

              setTelemetry((prev) => [t, ...prev].slice(0, 200));
              // Gelen veriyi ilgili node'a ata
              const nodeId = t.nodeId || device.id;
              // Node'un ismini güncelle
              const existingNode = meshNodeRef.current.get(nodeId);
              const nodeName = existingNode?.name ?? device.name ?? nodeId;
              updateMeshNode(t, true, device.rssi ?? null);
              // Ayrıca node adını da güncelle
              if (existingNode) {
                existingNode.name = nodeName;
                meshNodeRef.current.set(nodeId, existingNode);
                setMeshNodes(Array.from(meshNodeRef.current.values()));
              }
            });

            // Aboneliği kaydet
            (sub as any)._deviceId = device.id;
            _notifySubs.push(sub);
            subscribedCount++;
            addLog("info", `  Bildirim: ${ch.uuid.slice(0, 8)} (${svc.uuid.slice(0, 8)})`);
          }
        }

        if (subscribedCount === 0) {
          addLog("warn", "Notifiable karakteristik bulunamadı. Firmware SERVICE_UUID ile eşleşiyor mu?");
        }

        void syncDeviceTime(device.id);
      } catch (err: any) {
        addLog("error", `Bağlantı hatası: ${err?.message ?? err}`);
        _cleanupConnection(device.id);
        setConnectedDevices((prev) => prev.filter((d) => d.id !== device.id));
        throw err;
      }
    },
    [addLog, updateMeshNode, syncDeviceTime, connectedDevices]
  );

  // Bağlantıyı kes
  const disconnect = useCallback(
    (deviceId?: string) => {
      if (deviceId) {
        const raw = rawDeviceRefs.current.get(deviceId);
        if (raw) {
          raw
            .cancelConnection()
            .then(() => {
              addLog("info", `Cihaz ${deviceId} bağlantısı kesildi.`);
            })
            .catch((err: any) => {
              addLog("error", `Bağlantı kesme hatası: ${err?.message ?? err}`);
            })
            .finally(() => {
              removeNode(deviceId);
              meshNodeRef.current.delete(deviceId);
              setMeshNodes(Array.from(meshNodeRef.current.values()));
              _cleanupConnection(deviceId);
              setConnectedDevices((prev) => prev.filter((d) => d.id !== deviceId));
              setConsensus(getConsensus());
            });
        }
      } else {
        // Tüm bağlantıları kes
        rawDeviceRefs.current.forEach((raw, id) => {
          raw.cancelConnection().catch(() => {});
        });
        rawDeviceRefs.current.clear();
        setConnectedDevices([]);
        setMeshNodes([]);
        setTelemetry([]);
        setAnomalyScore(null);
        setConsensus(DEFAULT_CONSENSUS);
        addLog("info", "Tüm bağlantılar kesildi.");
      }
    },
    [addLog]
  );

  const clearLogs = useCallback(() => setLogs([]), []);

  const latestTelemetry = telemetry.length > 0 ? telemetry[0] : null;

  return (
    <BleContext.Provider
      value={{
        isAvailable,
        isExpoGoEnv,
        permissionsGranted,
        scanning,
        devices,
        connectedDevices,
        telemetry,
        latestTelemetry,
        logs,
        anomalyScore,
        consensus,
        meshNodes,
        nodeMoving,
        pqcStatus: pqcManager.getSecurityStatus(),
        requestPermissions,
        startScan,
        stopScan,
        connectToDevice,
        disconnect,
        clearLogs,
      }}
    >
      {children}
    </BleContext.Provider>
  );
}

export function useBle(): BleContextValue {
  const ctx = useContext(BleContext);
  if (!ctx) throw new Error("useBle must be inside BleProvider");
  return ctx;
}
