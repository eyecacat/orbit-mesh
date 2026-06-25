/**
 * BleContext — Global BLE singleton + Mesh Engine for ORBIT-MESH.
 *
 * Architecture:
 *  - Module-level `_manager` (BleManager) created exactly once.
 *  - React context exposes BLE state + mesh engine (baseline, anomaly, consensus).
 *  - Connection and subscription survive screen navigation.
 *  - Screens only READ; all BLE logic lives here.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus, Platform } from "react-native";

import { parseTelemetry, isNodeMoving } from "@/utils/telemetryParser";
import type { NodeTelemetry } from "@/utils/telemetryParser";
import { computeAnomalyScore } from "@/services/anomalyEngine";
import type { AnomalyScore } from "@/services/anomalyEngine";
import {
  recordScore,
  removeNode,
  getConsensus,
} from "@/services/meshConsensus";
import type { ConsensusResult } from "@/services/meshConsensus";

// ── BleManager singleton ───────────────────────────────────────────────────
type BleManagerType = import("react-native-ble-plx").BleManager;
type BleDeviceType = import("react-native-ble-plx").Device;
type SubType = { remove(): void };

let _manager: BleManagerType | null = null;
let _stateChangeSub: SubType | null = null;
let _notifySubs: SubType[] = [];
let _disconnectSub: SubType | null = null;

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

// ── Types ──────────────────────────────────────────────────────────────────
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
  telemetry: NodeTelemetry | null;
  anomalyScore: AnomalyScore | null;
  health: string;
  isConnected: boolean;
}

export interface BleContextValue {
  isAvailable: boolean | null;
  isExpoGoEnv: boolean;
  permissionsGranted: boolean | null;
  scanning: boolean;
  devices: BleDeviceInfo[];
  connectedDevice: BleDeviceInfo | null;
  telemetry: NodeTelemetry[];
  latestTelemetry: NodeTelemetry | null;
  logs: LogEntry[];
  // Mesh engine
  anomalyScore: AnomalyScore | null;
  consensus: ConsensusResult;
  meshNodes: MeshNodeStatus[];
  nodeMoving: boolean;
  // Actions
  requestPermissions(): Promise<boolean>;
  startScan(): void;
  stopScan(): void;
  connectToDevice(device: BleDeviceInfo): Promise<void>;
  disconnect(): void;
  clearLogs(): void;
}

const BleContext = createContext<BleContextValue | null>(null);

const SERVICE_UUID = "12345678-1234-1234-1234-123456789abc";
const ORBIT_NAME_PREFIX = "ORBIT-MESH";
const SCAN_TIMEOUT = 15000;

// ── Default consensus ─────────────────────────────────────────────────────
const DEFAULT_CONSENSUS: ConsensusResult = {
  status: "Normal",
  anomalyCount: 0,
  totalNodes: 0,
  participatingNodes: 0,
  nodeScores: [],
  lastUpdated: Date.now(),
};

// ── Provider ───────────────────────────────────────────────────────────────
export function BleProvider({ children }: { children: React.ReactNode }) {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [permissionsGranted, setPermissionsGranted] = useState<boolean | null>(
    null,
  );
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<BleDeviceInfo[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<BleDeviceInfo | null>(
    null,
  );
  const [telemetry, setTelemetry] = useState<NodeTelemetry[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  // Mesh engine state
  const [anomalyScore, setAnomalyScore] = useState<AnomalyScore | null>(null);
  const [consensus, setConsensus] =
    useState<ConsensusResult>(DEFAULT_CONSENSUS);
  const [meshNodes, setMeshNodes] = useState<MeshNodeStatus[]>([]);
  const [nodeMoving, setNodeMoving] = useState(false);

  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const discoveredIds = useRef<Set<string>>(new Set());
  const rawDeviceRef = useRef<BleDeviceType | null>(null);
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
      ].slice(0, 300),
    );
  }, []);

  // ── Mesh node update helper ─────────────────────────────────────────────
  const updateMeshNode = useCallback(
    (t: NodeTelemetry, connected: boolean) => {
      const score = computeAnomalyScore(t);
      const moving = isNodeMoving(t);
      setNodeMoving(moving);
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
        name: connectedDevice?.name ?? null,
        lastSeen: t.receivedAt,
        telemetry: t,
        anomalyScore: score,
        health,
        isConnected: connected,
      };

      meshNodeRef.current.set(t.nodeId, node);
      setMeshNodes(Array.from(meshNodeRef.current.values()));
      recordScore(score);
      setConsensus(getConsensus());
    },
    [connectedDevice],
  );

  // ── BLE state monitoring ─────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS === "web") {
      setIsAvailable(false);
      return;
    }
    if (isExpoGoEnv) {
      setIsAvailable(false);
      addLog(
        "warn",
        "Expo Go: BLE native modülü çalışmaz. EAS Development Build gerekli.",
      );
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
      mgr
        .state()
        .then((state) => setIsAvailable(state === "PoweredOn"))
        .catch(() => {});
    }
  }, [addLog, isExpoGoEnv]);

  // ── App background/foreground ─────────────────────────────────────────────
  useEffect(() => {
    const handler = (next: AppStateStatus) => {
      if (next === "active" && rawDeviceRef.current) {
        rawDeviceRef.current
          .isConnected()
          .then((connected) => {
            if (!connected) {
              addLog("warn", "Uygulama ön plana geldi — bağlantı kopmuş.");
              _cleanupConnection();
              setConnectedDevice(null);
            }
          })
          .catch(() => {});
      }
    };
    const sub = AppState.addEventListener("change", handler);
    return () => sub.remove();
  }, [addLog]);

  // ── Permissions ──────────────────────────────────────────────────────────
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
        granted = Object.values(res).every(
          (v) => v === PermissionsAndroid.RESULTS.GRANTED,
        );
      } else {
        const res = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        granted = res === PermissionsAndroid.RESULTS.GRANTED;
      }
      setPermissionsGranted(granted);
      addLog(
        granted ? "info" : "error",
        granted
          ? "Android BLE izinleri verildi."
          : "Android BLE izinleri reddedildi.",
      );
      return granted;
    } catch (err: any) {
      addLog("error", `İzin hatası: ${err?.message ?? err}`);
      setPermissionsGranted(false);
      return false;
    }
  }, [addLog]);

  // ── Scan ─────────────────────────────────────────────────────────────────
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
          addLog(
            "error",
            `Tarama hatası: ${error.message} (${error.errorCode})`,
          );
          setScanning(false);
          return;
        }
        if (!device) return;

        const name = device.name ?? device.localName ?? null;
        const id = device.id;
        const rssi = device.rssi ?? null;

        const matchesName = name ? name.startsWith(ORBIT_NAME_PREFIX) : false;
        const matchesService = device.serviceUUIDs
          ? device.serviceUUIDs.some(
              (u) => u.toLowerCase() === SERVICE_UUID.toLowerCase(),
            )
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
          addLog(
            "scan",
            `Cihaz bulundu: ${name ?? id} (RSSI: ${rssi ?? "?"} dBm)`,
          );
          setDevices((prev) =>
            [...prev, info].sort((a, b) => (b.rssi ?? -100) - (a.rssi ?? -100)),
          );
        } else {
          setDevices((prev) =>
            prev
              .map((d) =>
                d.id === id
                  ? { ...d, rssi, isConnectable: info.isConnectable }
                  : d,
              )
              .sort((a, b) => (b.rssi ?? -100) - (a.rssi ?? -100)),
          );
        }
      },
    );

    scanTimerRef.current = setTimeout(() => {
      mgr.stopDeviceScan();
      setScanning(false);
      addLog("info", "Tarama zaman aşımı (15s).");
    }, SCAN_TIMEOUT);
  }, [addLog]);

  // ── Notification cleanup ─────────────────────────────────────────────────
  function _cleanupConnection() {
    _notifySubs.forEach((s) => {
      try {
        s.remove();
      } catch {}
    });
    _notifySubs = [];
    if (_disconnectSub) {
      try {
        _disconnectSub.remove();
      } catch {}
      _disconnectSub = null;
    }
    rawDeviceRef.current = null;
  }

  // ── Connect ─────────────────────────────────────────────────────────────
  const connectToDevice = useCallback(
    async (device: BleDeviceInfo) => {
      const mgr = getManager();
      if (!mgr) return;

      addLog("info", `Bağlanıyor: ${device.name ?? device.id}...`);

      try {
        mgr.stopDeviceScan();
        setScanning(false);

        const raw = await mgr.connectToDevice(device.id, { requestMTU: 512 });
        rawDeviceRef.current = raw;
        addLog("info", `Bağlantı kuruldu: ${raw.id}`);
        setConnectedDevice(device);

        _disconnectSub = mgr.onDeviceDisconnected(device.id, (err, _d) => {
          addLog(
            "warn",
            err
              ? `Bağlantı koptu: ${err.message}`
              : "Cihaz bağlantısı kesildi.",
          );
          removeNode(device.id);
          meshNodeRef.current.delete(device.id);
          setMeshNodes(Array.from(meshNodeRef.current.values()));
          _cleanupConnection();
          setConnectedDevice(null);
          setTelemetry([]);
          setAnomalyScore(null);
          setConsensus(getConsensus());
        });

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
                  addLog(
                    "error",
                    `Bildirim hatası [${ch.uuid.slice(0, 8)}]: ${err.message}`,
                  );
                }
                return;
              }
              if (!characteristic?.value) return;

              // Debug log chain
              const b64 = characteristic.value ?? "";
              addLog("scan", `[BASE64] ${b64}`);

              const parsed = parseTelemetry(b64);

              if (!parsed.data) {
                addLog("error", `[PARSE] ${parsed.error}`);
                return;
              }
              addLog("info", `[PARSED] ${JSON.stringify(parsed.data)}`);

              if (!parsed.data) return;

              const t = parsed.data;
              addLog(
                t.anomaly ? "warn" : "info",
                `Telemetri: nodeId=${t.nodeId} vlf=${t.vlf_hz.toFixed(2)}Hz amp=${t.vlf_amplitude.toFixed(3)} bat=${t.battery}% temp=${t.temp_c}°C${t.anomaly ? " ⚠ ANOMALİ" : ""}`,
              );

              setTelemetry((prev) => [t, ...prev].slice(0, 200));
              updateMeshNode(t, true);
            });

            _notifySubs.push(sub);
            subscribedCount++;
            addLog(
              "info",
              `  Bildirim: ${ch.uuid.slice(0, 8)} (${svc.uuid.slice(0, 8)})`,
            );
          }
        }

        if (subscribedCount === 0) {
          addLog(
            "warn",
            "Notifiable karakteristik bulunamadı. Firmware SERVICE_UUID ile eşleşiyor mu?",
          );
        }
      } catch (err: any) {
        addLog("error", `Bağlantı hatası: ${err?.message ?? err}`);
        _cleanupConnection();
        setConnectedDevice(null);
        throw err;
      }
    },
    [addLog, updateMeshNode],
  );

  // ── Disconnect ────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    const mgr = getManager();
    if (!mgr || !rawDeviceRef.current) return;
    const id = rawDeviceRef.current.id;
    rawDeviceRef.current
      .cancelConnection()
      .then(() => {
        addLog("info", "Bağlantı kesildi.");
      })
      .catch((err: any) => {
        addLog("error", `Bağlantı kesme hatası: ${err?.message ?? err}`);
      })
      .finally(() => {
        removeNode(id);
        meshNodeRef.current.delete(id);
        setMeshNodes(Array.from(meshNodeRef.current.values()));
        _cleanupConnection();
        setConnectedDevice(null);
        setTelemetry([]);
        setAnomalyScore(null);
        setConsensus(getConsensus());
      });
  }, [addLog]);

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
        connectedDevice,
        telemetry,
        latestTelemetry,
        logs,
        anomalyScore,
        consensus,
        meshNodes,
        nodeMoving,
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
