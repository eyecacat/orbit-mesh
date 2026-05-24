import { useEffect, useRef } from "react";
import { Platform } from "react-native";

const SHAKE_THRESHOLD = 2.2;
const DEBOUNCE_MS = 3000;

export function useShakeDetection(onShake: () => void) {
  const lastShake = useRef(0);
  const onShakeRef = useRef(onShake);
  onShakeRef.current = onShake;

  useEffect(() => {
    let sub: { remove: () => void } | null = null;

    (async () => {
      if (Platform.OS === "web") return;

      try {
        const { Accelerometer } = await import("expo-sensors");
        const available = await Accelerometer.isAvailableAsync();
        if (!available) return;

        Accelerometer.setUpdateInterval(100);
        sub = Accelerometer.addListener(({ x, y, z }) => {
          const magnitude = Math.sqrt(x * x + y * y + z * z);
          const now = Date.now();
          if (magnitude > SHAKE_THRESHOLD && now - lastShake.current > DEBOUNCE_MS) {
            lastShake.current = now;
            onShakeRef.current();
          }
        });
      } catch {
        // expo-sensors not available
      }
    })();

    return () => { sub?.remove(); };
  }, []);
}
