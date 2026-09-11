import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import * as SMS from "expo-sms";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Alert, Linking, Platform } from "react-native";
import { Accelerometer } from "expo-sensors";

interface EarthquakeContextValue {
  isMonitoring: boolean;
  earthquakeDetected: boolean;
  dismissEarthquake: () => void;
  respondOk: () => void;
  respondNotOk: (emergencyPhone: string, emergencyName: string, userName: string) => Promise<void>;
  lastMagnitude: number;
}

const EarthquakeContext = createContext<EarthquakeContextValue | null>(null);

const THRESHOLD = 3.0;
const COOLDOWN_MS = 30000;

export function EarthquakeProvider({ children }: { children: React.ReactNode }) {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [earthquakeDetected, setEarthquakeDetected] = useState(false);
  const [lastMagnitude, setLastMagnitude] = useState(0);
  const lastTriggerRef = useRef<number>(0);
  const subscriptionRef = useRef<ReturnType<typeof Accelerometer.addListener> | null>(null);

  useEffect(() => {
    if (Platform.OS === "web") return;

    let mounted = true;

    async function startMonitoring() {
      try {
        const { status } = await Accelerometer.requestPermissionsAsync().catch(() => ({ status: "denied" }));
        if (!mounted) return;
        Accelerometer.setUpdateInterval(200);
        subscriptionRef.current = Accelerometer.addListener(({ x, y, z }) => {
          if (!mounted) return;
          const magnitude = Math.sqrt(x * x + y * y + z * z);
          const now = Date.now();
          if (magnitude > THRESHOLD && now - lastTriggerRef.current > COOLDOWN_MS) {
            lastTriggerRef.current = now;
            setLastMagnitude(Math.round(magnitude * 10) / 10);
            setEarthquakeDetected(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
        });
        if (mounted) setIsMonitoring(true);
      } catch {}
    }

    startMonitoring();

    return () => {
      mounted = false;
      subscriptionRef.current?.remove();
      setIsMonitoring(false);
    };
  }, []);

  const dismissEarthquake = useCallback(() => {
    setEarthquakeDetected(false);
  }, []);

  const respondOk = useCallback(() => {
    setEarthquakeDetected(false);
  }, []);

  const respondNotOk = useCallback(async (emergencyPhone: string, emergencyName: string, userName: string) => {
    setEarthquakeDetected(false);

    let locationText = "Konum alınamadı";
    let mapsLink = "";
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        locationText = `Enlem: ${loc.coords.latitude.toFixed(5)}, Boylam: ${loc.coords.longitude.toFixed(5)}`;
        mapsLink = `\nhttps://maps.google.com/?q=${loc.coords.latitude},${loc.coords.longitude}`;
      }
    } catch {}

    const message = `ORBIT-MESH ACİL DURUM: ${userName} deprem algıladı ve iyi değil!\n${locationText}${mapsLink}`;

    const smsAvailable = await SMS.isAvailableAsync();
    if (smsAvailable) {
      await SMS.sendSMSAsync([emergencyPhone], message);
    } else {
      Alert.alert(
        "SMS Gönderilemiyor",
        `Lütfen ${emergencyName}'ı arayın: ${emergencyPhone}`,
        [{ text: "Tamam" }]
      );
    }

    setTimeout(() => {
      Linking.openURL("tel:112").catch(() => {});
    }, 2000);
  }, []);

  return (
    <EarthquakeContext.Provider value={{
      isMonitoring,
      earthquakeDetected,
      dismissEarthquake,
      respondOk,
      respondNotOk,
      lastMagnitude,
    }}>
      {children}
    </EarthquakeContext.Provider>
  );
}

export function useEarthquake() {
  const ctx = useContext(EarthquakeContext);
  if (!ctx) throw new Error("useEarthquake must be inside EarthquakeProvider");
  return ctx;
}
