import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StatusColor, useSafety } from "@/context/SafetyContext";
import { useColors } from "@/hooks/useColors";

const STATUS_OPTIONS: { value: StatusColor; label: string; desc: string }[] = [
  { value: "green", label: "İyiyim", desc: "Her şey yolunda" },
  { value: "yellow", label: "Dikkat", desc: "Yardım gerekebilir" },
  { value: "red", label: "Acil", desc: "Hemen yardım lazım" },
];

export default function HayatagiScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { myStatus, checkin, streak, lastCheckin, family, emergencyContact } = useSafety();
  const [checking, setChecking] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const statusColor = { green: colors.green, yellow: colors.yellow, red: colors.red }[myStatus];

  async function handleCheckin(status: StatusColor) {
    setChecking(true);
    await checkin(status);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setChecking(false);
  }

  const checkinLabel = lastCheckin
    ? `Son: ${new Date(lastCheckin).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`
    : "Henüz check-in yapılmadı";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>HayatAğı</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Aile Güvenlik Ağı</Text>
          </View>
          <View style={[styles.streakBadge, { backgroundColor: colors.card, borderColor: colors.warning }]}>
            <Feather name="zap" size={14} color={colors.warning} />
            <Text style={[styles.streakText, { color: colors.warning }]}>{streak} gün</Text>
          </View>
        </View>

        {/* My Status Card */}
        <View style={[styles.myStatusCard, { backgroundColor: colors.card, borderColor: statusColor + "88" }]}>
          <LinearGradient colors={[statusColor + "22", "transparent"]} style={StyleSheet.absoluteFill} />
          <Text style={[styles.myStatusLabel, { color: colors.mutedForeground }]}>Benim Durumum</Text>
          <Text style={[styles.myStatusValue, { color: statusColor }]}>
            {myStatus === "green" ? "İyiyim" : myStatus === "yellow" ? "Dikkat" : "Acil Durum"}
          </Text>
          <Text style={[styles.checkinLabel, { color: colors.mutedForeground }]}>{checkinLabel}</Text>

          <Text style={[styles.checkinPrompt, { color: colors.foreground }]}>Check-in Yap</Text>
          <View style={styles.statusButtons}>
            {STATUS_OPTIONS.map(opt => (
              <Pressable
                key={opt.value}
                style={({ pressed }) => [
                  styles.statusBtn,
                  {
                    backgroundColor: myStatus === opt.value ? { green: colors.green, yellow: colors.warning, red: colors.danger }[opt.value] : colors.muted,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                onPress={() => handleCheckin(opt.value)}
                disabled={checking}
              >
                <Text style={[styles.statusBtnText, { color: myStatus === opt.value ? colors.background : colors.foreground }]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Family Members */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Aile Üyeleri</Text>
          <Pressable onPress={() => router.push("/aile")} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
            <Feather name="plus" size={22} color={colors.primary} />
          </Pressable>
        </View>

        {family.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="users" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Henüz aile üyesi eklenmedi</Text>
            <Pressable style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/aile")}>
              <Text style={[styles.addBtnText, { color: colors.background }]}>Aile Üyesi Ekle</Text>
            </Pressable>
          </View>
        ) : (
          family.map(member => {
            const mColor = { green: colors.green, yellow: colors.warning, red: colors.danger }[member.status];
            return (
              <View key={member.id} style={[styles.memberCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.memberAvatar, { backgroundColor: mColor + "33" }]}>
                  <Feather name="user" size={20} color={mColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.memberName, { color: colors.foreground }]}>{member.name}</Text>
                  <Text style={[styles.memberRelation, { color: colors.mutedForeground }]}>{member.relation}</Text>
                </View>
                <View style={[styles.memberStatusDot, { backgroundColor: mColor }]} />
              </View>
            );
          })
        )}

        {/* Emergency Contact */}
        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 24 }]}>Acil Durum Kişisi</Text>
        {emergencyContact ? (
          <Pressable style={[styles.emergencyCard, { backgroundColor: colors.card, borderColor: colors.danger + "66" }]} onPress={() => router.push("/acil")}>
            <LinearGradient colors={[colors.danger + "22", "transparent"]} style={StyleSheet.absoluteFill} />
            <Feather name="phone" size={20} color={colors.danger} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.memberName, { color: colors.foreground }]}>{emergencyContact.name}</Text>
              <Text style={[styles.memberRelation, { color: colors.mutedForeground }]}>{emergencyContact.phone} · {emergencyContact.relation}</Text>
            </View>
            <Feather name="edit-2" size={16} color={colors.mutedForeground} />
          </Pressable>
        ) : (
          <Pressable style={[styles.addEmergencyBtn, { backgroundColor: colors.card, borderColor: colors.danger + "66" }]} onPress={() => router.push("/acil")}>
            <Feather name="alert-circle" size={20} color={colors.danger} />
            <Text style={[styles.addEmergencyText, { color: colors.danger }]}>Acil Durum Kişisi Ekle</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 20 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 2 },
  streakBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  streakText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  myStatusCard: { marginHorizontal: 20, borderRadius: 20, borderWidth: 1, padding: 20, overflow: "hidden", marginBottom: 24 },
  myStatusLabel: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 4 },
  myStatusValue: { fontSize: 32, fontFamily: "Inter_700Bold", marginBottom: 4 },
  checkinLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 20 },
  checkinPrompt: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 12 },
  statusButtons: { flexDirection: "row", gap: 10 },
  statusBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  statusBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", paddingHorizontal: 20 },
  emptyCard: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, padding: 24, alignItems: "center", gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  addBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  addBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  memberCard: { flexDirection: "row", alignItems: "center", marginHorizontal: 20, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginRight: 12 },
  memberName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  memberRelation: { fontSize: 12, fontFamily: "Inter_400Regular" },
  memberStatusDot: { width: 10, height: 10, borderRadius: 5 },
  emergencyCard: { flexDirection: "row", alignItems: "center", marginHorizontal: 20, borderRadius: 14, borderWidth: 1, padding: 14, overflow: "hidden" },
  addEmergencyBtn: { flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 20, borderRadius: 14, borderWidth: 1, borderStyle: "dashed", padding: 16 },
  addEmergencyText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
