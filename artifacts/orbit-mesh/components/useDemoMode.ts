import { useState, useEffect, useCallback } from "react";
interface NodeTelemetry {
  nodeId: string;
  timestamp: number;
  vlf_hz: number;
  vlf_amplitude: number;
  battery: number;
  temp_c: number;
  gx: number;
  gy: number;
  gz: number;
  ax: number;
  ay: number;
  az: number;
  anomaly: boolean;
  receivedAt: number;
}

interface DemoTelemetry {
  telemetry: NodeTelemetry;
  anomalyScore: { total: number; level: string } | null;
}

/**
 * Demo modu: Cihaz bağlı değilken jüriye gerçekçi VLF verisi gösterir.
 * Schumann rezonansı (7.83 Hz) + gürültü + ara sıra anomali.
 */
export function useDemoMode(enabled: boolean): DemoTelemetry {
  const [telemetry, setTelemetry] = useState<NodeTelemetry>({
    nodeId: "ORBIT-DEMO",
    timestamp: Date.now(),
    vlf_hz: 7.83,
    vlf_amplitude: 820,
    battery: 87,
    temp_c: 24.5,
    gx: 0.12,
    gy: -0.05,
    gz: 0.88,
    ax: 0.01,
    ay: 0.02,
    az: 0.98,
    anomaly: false,
    receivedAt: Date.now(),
  });

  const [anomalyScore, setAnomalyScore] = useState<{ total: number; level: string } | null>(null);

  const generateFrame = useCallback(() => {
    const now = Date.now();
    const t = now * 0.001;

    // Schumann + gürültü + ara sıra anomali patlaması
    const baseFreq = 7.83;
    const noise = (Math.random() - 0.5) * 0.4;
    const burst = Math.sin(t * 0.3) > 0.92 ? (Math.random() - 0.5) * 3 : 0;
    const vlf = baseFreq + noise + burst;

    const baseAmp = 800 + Math.sin(t * 0.5) * 100;
    const ampNoise = (Math.random() - 0.5) * 60;
    const ampBurst = burst !== 0 ? Math.random() * 400 : 0;
    const amp = baseAmp + ampNoise + ampBurst;

    const isAnomaly = burst !== 0 && Math.abs(burst) > 1.2;

    const newTelemetry: NodeTelemetry = {
      nodeId: "ORBIT-DEMO",
      timestamp: now,
      vlf_hz: Math.max(0, vlf),
      vlf_amplitude: Math.max(0, amp),
      battery: 87,
      temp_c: 24.5 + Math.sin(t * 0.1) * 1.5,
      gx: 0.12 + (Math.random() - 0.5) * 0.1,
      gy: -0.05 + (Math.random() - 0.5) * 0.1,
      gz: 0.88 + (Math.random() - 0.5) * 0.1,
      ax: 0.01 + (Math.random() - 0.5) * 0.02,
      ay: 0.02 + (Math.random() - 0.5) * 0.02,
      az: 0.98 + (Math.random() - 0.5) * 0.02,
      anomaly: isAnomaly,
      receivedAt: now,
    };

    setTelemetry(newTelemetry);

    // Anomaly score hesapla (basit)
    const score = Math.min(100, Math.max(0, (Math.abs(vlf - 7.83) / 0.5) * 40 + (amp / 1200) * 30));
    let level = "Normal";
    if (score >= 80) level = "Kritik";
    else if (score >= 60) level = "Yüksek";
    else if (score >= 30) level = "Şüpheli";

    setAnomalyScore({ total: score, level });
  }, []);

  useEffect(() => {
    if (!enabled) return;
    generateFrame();
    const id = setInterval(generateFrame, 1000);
    return () => clearInterval(id);
  }, [enabled, generateFrame]);

  return { telemetry, anomalyScore };
}
