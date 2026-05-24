import { useCallback } from "react";
import { Platform, Linking } from "react-native";
import * as Location from "expo-location";

export interface EmergencyContact {
  name: string;
  phone: string;
}

export function useEmergency() {
  const getLocation = useCallback(async (): Promise<string> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return "Konum izni alınamadı";
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = loc.coords;
      return `📍 Konum: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}\n🗺 Maps: https://maps.google.com/?q=${latitude},${longitude}`;
    } catch {
      return "Konum alınamadı";
    }
  }, []);

  const sendEmergencySMS = useCallback(async (
    contacts: EmergencyContact[],
    senderName: string,
    locationText: string
  ) => {
    if (contacts.length === 0) return;

    const message = `🆘 ORBIT-MESH ACİL DURUM!\n\n${senderName} yardım istiyor veya yanıt vermiyor!\n\n${locationText}\n\nORBIT-MESH güvenlik uygulaması tarafından gönderildi.`;

    try {
      if (Platform.OS === "web") {
        const phone = contacts[0]?.phone ?? "";
        window.open(`sms:${phone}?body=${encodeURIComponent(message)}`, "_blank");
        return;
      }
      const SMS = await import("expo-sms");
      const isAvailable = await SMS.isAvailableAsync();
      if (isAvailable) {
        const phones = contacts.map(c => c.phone).filter(Boolean);
        await SMS.sendSMSAsync(phones, message);
      }
    } catch {
      if (Platform.OS !== "web") {
        const phone = contacts[0]?.phone ?? "";
        await Linking.openURL(`sms:${phone}?body=${encodeURIComponent(message)}`);
      }
    }
  }, []);

  const call112 = useCallback(() => {
    Linking.openURL("tel:112");
  }, []);

  return { getLocation, sendEmergencySMS, call112 };
}
