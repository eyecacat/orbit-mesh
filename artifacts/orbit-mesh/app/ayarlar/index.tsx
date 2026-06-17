import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useEarthquake } from "@/context/EarthquakeContext";
import { useColors } from "@/hooks/useColors";

export default function AyarlarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isMonitoring } = useEarthquake();
  const [quakeNotifs, setQuakeNotifs] = useState(true);
  const [nasaUpdates, setNasaUpdates] = useState(true);
  const [darkMode] = useState(true);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  type Item =
    | { icon: string; label: string; value: string | undefined; action: () => void; kind?: "action" }
    | { icon: string; label: string; action: () => void; kind?: "action" }
    | { icon: string; label: string; toggle: true; value: boolean; onToggle: (v: boolean) => void; kind: "toggle" }
    | { icon: string; label: string; value: string; kind?: "display" };

  const sections: { title: string; items: Item[] }[] = [
    {
      title: "Hesap Ayarları",
      items: [
        { icon: "user", label: "Profil Bilgileri", value: user?.name, action: () => Alert.alert("Profil", `Ad: ${user?.name}\nE-posta: ${user?.email}`) },
        { icon: "mail", label: "E-posta", value: user?.email, action: () => {} },
        { icon: "key", label: "Şifre Değiştir", action: () => Alert.alert("Bilgi", "Şifre değiştirme özelliği yakında eklenecek") },
      ],
    },
    {
      title: "Cihaz Yönetimi",
      items: [
        { icon: "bluetooth", label: "BLE Cihazları", action: () => router.push("/ble") },
        { icon: "wifi", label: "Bağlantı Durumu", value: "Bağlı Cihaz Yok", action: () => router.push("/ble") },
      ],
    },
    {
      title: "Uygulama Ayarları",
      items: [
        { icon: "moon", label: "Karanlık Mod", toggle: true as const, value: darkMode, onToggle: () => Alert.alert("Bilgi", "ORBIT-MESH sadece karanlık mod kullanır"), kind: "toggle" as const },
        { icon: "zap", label: "Deprem Algılama", toggle: true as const, value: quakeNotifs, onToggle: (v: boolean) => setQuakeNotifs(v), kind: "toggle" as const },
        { icon: "radio", label: "NASA Güncellemeleri", toggle: true as const, value: nasaUpdates, onToggle: (v: boolean) => setNasaUpdates(v), kind: "toggle" as const },
      ],
    },
    {
      title: "Güvenlik & Gizlilik",
      items: [
        { icon: "shield", label: "Acil Durum Kişisi", action: () => router.push("/acil") },
        { icon: "users", label: "Aile Üyeleri", action: () => router.push("/aile") },
      ],
    },
    {
      title: "Hakkında",
      items: [
        { icon: "info", label: "Uygulama Versiyonu", value: "v1.0.0", kind: "display" as const },
        { icon: "award", label: "TEKNOFEST 2025", value: "Türkiye", kind: "display" as const },
        { icon: "globe", label: "ORBIT-MESH", value: "Öğrenci Astronomi Ağı", kind: "display" as const },
      ],
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Ayarlar</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Earthquake monitoring status */}
      <View style={[styles.monitorBanner, { backgroundColor: isMonitoring ? colors.accent + "22" : colors.warning + "22", borderColor: isMonitoring ? colors.accent + "44" : colors.warning + "44" }]}>
        <Feather name={isMonitoring ? "shield" : "alert-circle"} size={14} color={isMonitoring ? colors.accent : colors.warning} />
        <Text style={[styles.monitorText, { color: isMonitoring ? colors.accent : colors.warning }]}>
          Deprem İzleme: {isMonitoring ? "Aktif" : Platform.OS === "web" ? "Web'de desteklenmiyor" : "Pasif"}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {sections.map(section => (
          <View key={section.title} style={{ marginBottom: 8 }}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{section.title.toUpperCase()}</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {section.items.map((item, idx) => {
                const isToggle = "kind" in item && item.kind === "toggle";
                const hasValue = "value" in item && item.value !== undefined && item.value !== "";
                const hasAction = "action" in item && typeof item.action === "function";
                return (
                  <Pressable
                    key={item.label}
                    style={({ pressed }) => [
                      styles.row,
                      idx < section.items.length - 1 && [styles.rowBorder, { borderColor: colors.border }],
                      { opacity: pressed && hasAction ? 0.7 : 1 },
                    ]}
                    onPress={hasAction ? (item as any).action : undefined}
                    disabled={!hasAction && !isToggle}
                  >
                    <View style={[styles.rowIcon, { backgroundColor: colors.muted }]}>
                      <Feather name={item.icon as any} size={16} color={colors.primary} />
                    </View>
                    <Text style={[styles.rowLabel, { color: colors.foreground }]}>{item.label}</Text>
                    {isToggle ? (
                      <Switch
                        value={(item as any).value}
                        onValueChange={(item as any).onToggle}
                        thumbColor={(item as any).value ? colors.background : colors.mutedForeground}
                        trackColor={{ false: colors.muted, true: colors.primary }}
                      />
                    ) : hasValue ? (
                      <Text style={[styles.rowValue, { color: colors.mutedForeground }]} numberOfLines={1}>{String(item.value)}</Text>
                    ) : hasAction ? (
                      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  monitorBanner: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginVertical: 12, borderRadius: 10, borderWidth: 1, padding: 10 },
  monitorText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6 },
  sectionCard: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  rowBorder: { borderBottomWidth: 1 },
  rowIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  rowValue: { fontSize: 13, fontFamily: "Inter_400Regular", maxWidth: 100 },
});
