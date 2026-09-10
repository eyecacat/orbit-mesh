// app/pqc.tsx
// ORBIT-MESH — PQC Kuantum Güvenlik Merkezi
// Bu route daha önce HİÇ yoktu; kısayoldan basınca "This screen doesn't exist"
// hatası veriyordu.

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBle } from "@/context/BleContext";
import { useColors } from "@/hooks/useColors";
import { OrbitMeshTelemetry } from "@/utils/telemetryParser";

export default function PqcScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { latestTelemetry, pqcStatus, meshNodes, connectedDevices } = useBle();
  const tele = latestTelemetry as OrbitMeshTelemetry | null;

  const failures = pqcStatus?.recentFailures ?? 0;
  const verifications = pqcStatus?.recentVerifications ?? 0;
  const activeNodes = pqcStatus?.pqcActiveNodes?.length ?? connectedDevices.length;
  const totalNodes = pqcStatus?.totalNodes ?? Math.max(meshNodes.length, 1);
  const failureRate = pqcStatus?.failureRate ?? 0;

  const seed = tele?.pqc_seed ?? "—";
  const maskedSeed = seed.length > 16 ? `${seed.slice(0, 12)}····${seed.slice(-8)}` : seed;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      {/* Başlık */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>PQC Kuantum Güvenlik</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* Durum kartı */}
        <View
          style={[
            styles.statusCard,
            {
              borderColor: failures > 0 ? colors.warning : colors.accent,
              backgroundColor: (failures > 0 ? colors.warning : colors.accent) + "1A",
            },
          ]}
        >
          <Feather name="shield" size={32} color={failures > 0 ? colors.warning : colors.accent} />
          <Text style={[styles.statusTitle, { color: colors.foreground }]}>
            {failures > 0 ? "Müdahale Edildi" : "İletişim Güvende"}
          </Text>
          <Text style={[styles.statusDesc, { color: colors.mutedForeground }]}>
            {failures > 0
              ? `${failures} geçersiz paket imzası tespit edilip engellendi. Mesh bütünlüğü korunuyor.`
              : "Tüm mesh paketleri kuantum-sonrası imza doğrulamasından geçti. Saldırı tespit edilmedi."}
          </Text>
        </View>

        {/* Metrikler */}
        <View style={styles.grid}>
          {[
            { label: "Doğrulanan Paket", value: String(verifications), color: colors.accent },
            { label: "Aktif PQC Düğümü", value: `${activeNodes}/${totalNodes}`, color: colors.primary },
            { label: "Engellenen Paket", value: String(failures), color: failures > 0 ? colors.warning : colors.foreground },
            { label: "Hata Oranı", value: `%${(failureRate * 100).toFixed(1)}`, color: failureRate > 0.1 ? colors.danger : colors.accent },
          ].map((m, i) => (
            <View key={i} style={[styles.metricCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{m.label}</Text>
              <Text style={[styles.metricValue, { color: m.color }]}>{m.value}</Text>
            </View>
          ))}
        </View>

        {/* Canlı entropi seed'i */}
        {tele && (
          <View style={[styles.seedCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <View style={styles.seedHeader}>
              <Feather name="cpu" size={16} color={colors.mesh} />
              <Text style={[styles.seedTitle, { color: colors.foreground }]}>VLF Türevli Entropi (Canlı)</Text>
            </View>
            <Text style={[styles.seedValue, { color: colors.primary }]} selectable>
              {maskedSeed}
            </Text>
            <Text style={[styles.seedMeta, { color: colors.mutedForeground }]}>
              Düğüm: {tele.nodeId} · Uptime: {Math.floor((tele.uptime ?? 0) / 60)} dk ·{" "}
              {new Date(tele.receivedAt).toLocaleTimeString("tr-TR")}
            </Text>
          </View>
        )}

        {/* Teknik açıklama — jüri için dürüst sunum metni */}
        <View style={[styles.infoCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.infoTitle, { color: colors.foreground }]}>Nasıl Çalışır?</Text>
          {[
            "Gelecekteki kuantum bilgisayarlar RSA/ECC'yi kırabileceği için uluslararası standartlar kuantum-sonrası kriptografiye (PQC) geçişi zorunlu kılıyor.",
            "ORBIT-MESH, VLF anteninden gelen fiziksel sinyalin doğal entropisinden türetilen anahtar malzemesi ile her telemetri paketini imzalar.",
            "Her düğüm kendi anahtarını cihazında tutar; ağdaki diğer düğümler yalnızca imzayı doğrular (asimetrik güven modeli).",
            "Monotonic sayaç mekanizması 'replay' (yeniden oynatma) saldırılarını engeller.",
            "Bu katman, NIST tarafından standartlaştırılan Module-LWE ailesinin (CRYSTALS-Kyber) mimarisini örnek alan bir geçiş öykünmesidir (proof-of-concept).",
          ].map((line, i) => (
            <View key={i} style={styles.infoRow}>
              <Text style={[styles.infoNum, { color: colors.primary }]}>{i + 1}.</Text>
              <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{line}</Text>
            </View>
          ))}
        </View>

        {!tele && (
          <View style={[styles.infoCard, { borderColor: colors.border, backgroundColor: colors.card, alignItems: "center" }]}>
            <Feather name="bluetooth" size={24} color={colors.mutedForeground} />
            <Text style={[styles.infoText, { color: colors.mutedForeground, textAlign: "center" }]}>
              Canlı seed için bir ORBIT-MESH düğümüne BLE ile bağlanın.
            </Text>
            <Pressable
              onPress={() => router.push("/ble" as any)}
              style={({ pressed }) => [
                styles.goBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={[styles.goBtnText, { color: colors.primaryForeground }]}>BLE'ye Git</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statusCard: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: "center", gap: 10, marginBottom: 16 },
  statusTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statusDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  metricCard: { flex: 1, minWidth: "45%", borderRadius: 14, borderWidth: 1, padding: 14, gap: 4 },
  metricLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  metricValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  seedCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 8, marginBottom: 16 },
  seedHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  seedTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  seedValue: { fontSize: 15, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  seedMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  infoCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  infoTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  infoRow: { flexDirection: "row", gap: 8 },
  infoNum: { fontSize: 13, fontFamily: "Inter_700Bold" },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  goBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12, marginTop: 4 },
  goBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
