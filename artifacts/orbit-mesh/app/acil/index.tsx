import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSafety, EmergencyContact } from "@/context/SafetyContext";
import { useColors } from "@/hooks/useColors";

export default function AcilScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { emergencyContact, setEmergencyContact } = useSafety();
  const [editing, setEditing] = useState(!emergencyContact);
  const [name, setName] = useState(emergencyContact?.name ?? "");
  const [phone, setPhone] = useState(emergencyContact?.phone ?? "");
  const [relation, setRelation] = useState(emergencyContact?.relation ?? "");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  async function handleSave() {
    if (!name.trim() || !phone.trim()) {
      Alert.alert("Hata", "Ad ve telefon numarası gerekli");
      return;
    }
    const contact: EmergencyContact = {
      id: emergencyContact?.id ?? Date.now().toString(),
      name: name.trim(),
      phone: phone.trim(),
      relation: relation.trim() || "Acil Kişi",
    };
    await setEmergencyContact(contact);
    setEditing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Acil Durum Kişisi</Text>
        <Pressable onPress={() => setEditing(e => !e)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Feather name={editing ? "x" : "edit-2"} size={22} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Warning Card */}
        <View style={[styles.warningCard, { backgroundColor: colors.danger + "22", borderColor: colors.danger + "66" }]}>
          <LinearGradient colors={[colors.danger + "33", "transparent"]} style={StyleSheet.absoluteFill} />
          <Feather name="alert-triangle" size={24} color={colors.danger} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.warningTitle, { color: colors.danger }]}>Kritik Güvenlik Özelliği</Text>
            <Text style={[styles.warningDesc, { color: colors.mutedForeground }]}>
              Deprem algılandığında ve "Hayır, İyi Değilim" yanıtı verildiğinde bu kişi SMS ile bilgilendirilir ve 112 aranır.
            </Text>
          </View>
        </View>

        {editing ? (
          <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.formTitle, { color: colors.foreground }]}>Acil Durum Kişisi Bilgileri</Text>

            <Text style={[styles.label, { color: colors.mutedForeground }]}>Ad Soyad</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              value={name}
              onChangeText={setName}
              placeholder="Ad Soyad"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[styles.label, { color: colors.mutedForeground }]}>Telefon Numarası</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              value={phone}
              onChangeText={setPhone}
              placeholder="+90 5XX XXX XX XX"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="phone-pad"
            />

            <Text style={[styles.label, { color: colors.mutedForeground }]}>Yakınlık (opsiyonel)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              value={relation}
              onChangeText={setRelation}
              placeholder="Anne, Baba, Eş..."
              placeholderTextColor={colors.mutedForeground}
            />

            <Pressable style={[styles.saveBtn, { backgroundColor: colors.danger }]} onPress={handleSave}>
              <Feather name="shield" size={18} color="white" />
              <Text style={styles.saveBtnText}>Kaydet</Text>
            </Pressable>
          </View>
        ) : emergencyContact ? (
          <View style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.contactAvatar, { backgroundColor: colors.danger + "22" }]}>
              <Feather name="phone" size={28} color={colors.danger} />
            </View>
            <Text style={[styles.contactName, { color: colors.foreground }]}>{emergencyContact.name}</Text>
            <Text style={[styles.contactRelation, { color: colors.mutedForeground }]}>{emergencyContact.relation}</Text>
            <Text style={[styles.contactPhone, { color: colors.primary }]}>{emergencyContact.phone}</Text>
            <Pressable
              style={[styles.callBtn, { backgroundColor: colors.accent }]}
              onPress={() => Linking.openURL(`tel:${emergencyContact.phone}`)}
            >
              <Feather name="phone-call" size={18} color={colors.background} />
              <Text style={[styles.callText, { color: colors.background }]}>Ara</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="phone-missed" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Acil durum kişisi eklenmemiş</Text>
            <Pressable style={[styles.saveBtn, { backgroundColor: colors.danger }]} onPress={() => setEditing(true)}>
              <Feather name="plus" size={18} color="white" />
              <Text style={styles.saveBtnText}>Ekle</Text>
            </Pressable>
          </View>
        )}

        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          SMS içeriği: Kullanıcının adı, konumu ve Google Maps linki içerir. 112 çağrısı otomatik başlatılır.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  warningCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 20, overflow: "hidden" },
  warningTitle: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 4 },
  warningDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  form: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 10 },
  formTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 4 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  saveBtnText: { color: "white", fontSize: 16, fontFamily: "Inter_700Bold" },
  contactCard: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: "center", gap: 8 },
  contactAvatar: { width: 70, height: 70, borderRadius: 35, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  contactName: { fontSize: 22, fontFamily: "Inter_700Bold" },
  contactRelation: { fontSize: 14, fontFamily: "Inter_400Regular" },
  contactPhone: { fontSize: 18, fontFamily: "Inter_600SemiBold", marginVertical: 4 },
  callBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14, marginTop: 8 },
  callText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  emptyCard: { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", gap: 14 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, textAlign: "center", marginTop: 20 },
});
