import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export default function BleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [scanning, setScanning] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  function startScan() {
    setScanning(true);
    setTimeout(() => setScanning(false), 4000);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>BLE Ağı</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <LinearGradient colors={[colors.primary + "22", "transparent"]} style={StyleSheet.absoluteFill} />
          <Feather name="bluetooth" size={28} color={colors.primary} />
          <Text style={[styles.infoTitle, { color: colors.foreground }]}>Deneyap Kart BLE</Text>
          <Text style={[styles.infoDesc, { color: colors.mutedForeground }]}>
            BLE taraması yalnızca fiziksel cihazda çalışır. Expo Go ortamında BLE native izni gerektirir.
          </Text>
        </View>

        {/* Scan Button */}
        <Pressable
          style={({ pressed }) => [styles.scanBtn, { backgroundColor: scanning ? colors.muted : colors.primary, opacity: pressed ? 0.8 : 1 }]}
          onPress={startScan}
          disabled={scanning}
        >
          {scanning ? (
            <>
              <ActivityIndicator color={colors.background} size="small" />
              <Text style={[styles.scanText, { color: colors.background }]}>Taranıyor...</Text>
            </>
          ) : (
            <>
              <Feather name="search" size={18} color={colors.background} />
              <Text style={[styles.scanText, { color: colors.background }]}>Cihaz Tara</Text>
            </>
          )}
        </Pressable>

        {/* Status */}
        <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: colors.danger }]} />
            <Text style={[styles.statusText, { color: colors.foreground }]}>Bağlı Cihaz Yok</Text>
          </View>
          <Text style={[styles.statusDesc, { color: colors.mutedForeground }]}>
            Deneyap Kart'ınızı BLE modunda başlatın ve yakınlaştırın
          </Text>
        </View>

        {/* Instructions */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Bağlantı Talimatları</Text>
        {[
          { step: "1", text: "Deneyap Kart'a ORBIT-MESH firmware yükleyin" },
          { step: "2", text: "Kartı BLE Broadcast modunda başlatın" },
          { step: "3", text: "Yukarıdaki 'Cihaz Tara' butonuna basın" },
          { step: "4", text: "Cihaz listesinden Deneyap Kart'ı seçin" },
          { step: "5", text: "Gerçek zamanlı telemetri verilerini izleyin" },
        ].map(item => (
          <View key={item.step} style={[styles.stepRow, { borderColor: colors.border }]}>
            <View style={[styles.stepBadge, { backgroundColor: colors.primary + "22" }]}>
              <Text style={[styles.stepNum, { color: colors.primary }]}>{item.step}</Text>
            </View>
            <Text style={[styles.stepText, { color: colors.mutedForeground }]}>{item.text}</Text>
          </View>
        ))}

        {/* Expected Payload */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Beklenen JSON Formatı</Text>
        <View style={[styles.codeBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Text style={[styles.code, { color: colors.accent }]}>
            {`{
  "nodeId": "DYK-001",
  "timestamp": 1700000000,
  "vlf_hz": 7.83,
  "vlf_amplitude": 0.42,
  "battery": 87,
  "temp_c": 23.5,
  "anomaly": false
}`}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  infoCard: { borderRadius: 16, borderWidth: 1, padding: 20, alignItems: "center", gap: 10, marginBottom: 20, overflow: "hidden" },
  infoTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  infoDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  scanBtn: { flexDirection: "row", alignItems: "center", gap: 10, justifyContent: "center", paddingVertical: 14, borderRadius: 14, marginBottom: 16 },
  scanText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  statusCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 24 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  statusDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 12, marginTop: 8 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 10, borderBottomWidth: 1 },
  stepBadge: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  stepNum: { fontSize: 13, fontFamily: "Inter_700Bold" },
  stepText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  codeBox: { borderRadius: 12, borderWidth: 1, padding: 16 },
  code: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
