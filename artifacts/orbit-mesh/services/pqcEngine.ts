// app/pqc.tsx
// ORBIT-MESH — PQC (Kuantum Sonrası Güvenlik) Detay Ekranı
//
// Bu dosya eksikti — ana sayfadaki "/pqc" yönlendirmesi bu dosya olmadan
// Expo Router'ın "This screen doesn't exist" ekranına düşüyordu.
// Router App klasöründe route bir dosya karşılığı olmadan var olamaz.

import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack } from "expo-router";
import React, { useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useBle } from "@/context/BleContext";

export default function PqcScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { pqcStatus, latestTelemetry } = useBle();

  const totalNodes = pqcStatus?.totalNodes ?? 0;
  const activeNodes = pqcStatus?.pqcActiveNodes ?? [];
  const verifications = pqcStatus?.recentVerifications ?? 0;
  const failures = pqcStatus?.recentFailures ?? 0;
  const failureRate = ((pqcStatus?.failureRate ?? 0) * 100).toFixed(0);
  const isLive = totalNodes > 0;

  const sessionId: string | null = latestTelemetry?.pqcSessionId ?? null;

  const steps = useMemo(
    () => [
      {
        icon: "key" as const,
        title: "1. Anahtar Üretimi (Keygen)",
        text: "Her ESP32 düğümü bağlandığında, ternary {-1,0,+1} gizli vektör ve LWE tabanlı bir açık anahtar çifti sıfırdan üretilir. Bu anahtar hiçbir yerde saklanmaz — oturum bitince yok olur.",
      },
      {
        icon: "edit-3" as const,
        title: "2. Paket İmzalama",
        text: "VLF anteninden gelen her telemetri paketi, kafes (lattice) tabanlı bir MAC ile imzalanır. Paketin içeriği değiştiği anda imza de değişir; iki paket asla aynı imzayı taşımaz.",
      },
      {
        icon: "shield" as const,
        title: "3. Doğrulama ve Replay Koruması",
        text: "Mobil uygulama gelen her paketi sayaç ve imza üzerinden doğrular. Sayaç geriye gitmişse (aynı paketin tekrar gönderilmesi) veya imza tutmuyorsa paket reddedilir.",
      },
      {
        icon: "refresh-cw" as const,
        title: "4. Oturum Yenileme",
        text: "Düğüm her yeniden bağlandığında yeni bir anahtar çifti ve oturum kimliği üretilir. Bu yüzden geçmişte doğrulanmış bir paket, gelecekteki bir oturumda hiçbir işe yaramaz.",
      },
    ],
    []
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Üst bar */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Feather name="arrow-left" size={18} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.topTitle, { color: colors.foreground }]}>PQC Güvenlik</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.primary + "44" }]}>
          <LinearGradient colors={[colors.primary + "22", "transparent"]} style={StyleSheet.absoluteFill} />
          <View style={[styles.heroIconWrap, { backgroundColor: colors.primary + "18" }]}>
            <Feather name="shield" size={30} color={colors.primary} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>Kuantum Sonrası Güvenlik</Text>
          <Text style={[styles.heroSubtitle, { color: colors.mutedForeground }]}>
            VLF anteninden gelen her sinyal, kafes tabanlı (LWE) bir kriptografik katmandan geçerek doğrulanır.
          </Text>
          <View style={[styles.heroBadge, { backgroundColor: isLive ? colors.accent + "33" : colors.muted + "33" }]}>
            <View style={[styles.dot, { backgroundColor: isLive ? colors.accent : colors.mutedForeground }]} />
            <Text style={[styles.heroBadgeText, { color: isLive ? colors.accent : colors.mutedForeground }]}>
              {isLive ? "Sistem Aktif" : "Bağlantı Bekleniyor"}
            </Text>
          </View>
        </View>

        {/* İstatistik kartları */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{activeNodes.length}/{Math.max(totalNodes, activeNodes.length)}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Aktif Düğüm</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.accent }]}>{verifications}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Doğrulanan Paket</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: parseFloat(failureRate) > 10 ? colors.danger : colors.accent }]}>
              {failureRate}%
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Hata Oranı</Text>
          </View>
        </View>

        {failures > 0 && (
          <View style={[styles.alertBox, { backgroundColor: colors.danger + "18", borderColor: colors.danger + "44" }]}>
            <Feather name="alert-triangle" size={16} color={colors.danger} />
            <Text style={[styles.alertText, { color: colors.danger }]}>
              Son 60 saniyede {failures} paket imza doğrulamasından geçemedi — bu paketler reddedildi.
            </Text>
          </View>
        )}

        {sessionId && (
          <View style={[styles.sessionBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="hash" size={14} color={colors.mutedForeground} />
            <Text style={[styles.sessionText, { color: colors.mutedForeground }]} numberOfLines={1}>
              Oturum kimliği: {sessionId}
            </Text>
          </View>
        )}

        {/* Nasıl çalışır */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Nasıl Çalışır?</Text>
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          {steps.map((step, i) => (
            <View key={i} style={[styles.stepCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.stepIconWrap, { backgroundColor: colors.primary + "18" }]}>
                <Feather name={step.icon} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stepTitle, { color: colors.foreground }]}>{step.title}</Text>
                <Text style={[styles.stepText, { color: colors.mutedForeground }]}>{step.text}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Dürüst not */}
        <View style={[styles.noteBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.noteRow}>
            <Feather name="info" size={14} color={colors.mutedForeground} />
            <Text style={[styles.noteTitle, { color: colors.foreground }]}>Kapsam Notu</Text>
          </View>
          <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
            Bu katman, NIST'in kuantum-dirençli standardı FIPS 203'ün temel fikirlerine (kafes problemleri, ternary
            gizli anahtar, Gaussian hata örnekleme) dayanan bir prototip implementasyonudur. Üretim ortamında
            kullanılan tam ML-KEM standardının basitleştirilmiş, eğitim amaçlı bir versiyonudur.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  hero: {
    marginHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    overflow: "hidden",
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroTitle: { fontSize: 19, fontFamily: "Inter_700Bold", textAlign: "center" },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 12,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  heroBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  statsRow: { flexDirection: "row", paddingHorizontal: 20, gap: 10, marginBottom: 12 },
  statCard: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: "center", gap: 4 },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  alertBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  alertText: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: "Inter_500Medium" },
  sessionBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  sessionText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular" },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  stepCard: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  stepIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  stepTitle: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 4 },
  stepText: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
  noteBox: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  noteRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  noteTitle: { fontSize: 12, fontFamily: "Inter_700Bold" },
  noteText: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
});
