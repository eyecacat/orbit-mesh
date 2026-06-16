import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSafety } from "@/context/SafetyContext";
import { useColors } from "@/hooks/useColors";

const RELATIONS = ["Anne", "Baba", "Kardeş", "Eş", "Çocuk", "Büyükanne", "Büyükbaba", "Diğer"];

export default function AileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { family, addFamilyMember, removeFamilyMember } = useSafety();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("Diğer");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  async function handleAdd() {
    if (!name.trim() || !phone.trim()) {
      Alert.alert("Hata", "Ad ve telefon numarası gerekli");
      return;
    }
    await addFamilyMember({ name: name.trim(), phone: phone.trim(), relation });
    setName(""); setPhone(""); setShowForm(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function confirmRemove(id: string, memberName: string) {
    Alert.alert("Sil", `${memberName} listeden çıkarılsın mı?`, [
      { text: "İptal", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: () => removeFamilyMember(id) },
    ]);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Aile Üyeleri</Text>
        <Pressable onPress={() => setShowForm(f => !f)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Feather name={showForm ? "x" : "plus"} size={24} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {showForm && (
          <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.formTitle, { color: colors.foreground }]}>Yeni Aile Üyesi</Text>

            <Text style={[styles.label, { color: colors.mutedForeground }]}>Ad Soyad</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              value={name}
              onChangeText={setName}
              placeholder="Ad Soyad"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[styles.label, { color: colors.mutedForeground }]}>Telefon</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              value={phone}
              onChangeText={setPhone}
              placeholder="+90 5XX XXX XX XX"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="phone-pad"
            />

            <Text style={[styles.label, { color: colors.mutedForeground }]}>Yakınlık</Text>
            <View style={styles.relationGrid}>
              {RELATIONS.map(r => (
                <Pressable
                  key={r}
                  style={[styles.relationChip, { backgroundColor: relation === r ? colors.primary : colors.muted, borderColor: relation === r ? colors.primary : colors.border }]}
                  onPress={() => setRelation(r)}
                >
                  <Text style={[styles.relationText, { color: relation === r ? colors.background : colors.foreground }]}>{r}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.formBtns}>
              <Pressable style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setShowForm(false)}>
                <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>İptal</Text>
              </Pressable>
              <Pressable style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={handleAdd}>
                <Text style={[styles.addText, { color: colors.background }]}>Ekle</Text>
              </Pressable>
            </View>
          </View>
        )}

        {family.length === 0 && !showForm ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="users" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Henüz aile üyesi eklenmedi</Text>
            <Pressable style={[styles.addFirstBtn, { backgroundColor: colors.primary }]} onPress={() => setShowForm(true)}>
              <Text style={[styles.addText, { color: colors.background }]}>İlk Üyeyi Ekle</Text>
            </Pressable>
          </View>
        ) : (
          family.map(m => {
            const statusColor = { green: colors.green, yellow: colors.warning, red: colors.danger }[m.status];
            return (
              <View key={m.id} style={[styles.memberCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.avatar, { backgroundColor: statusColor + "22" }]}>
                  <Feather name="user" size={22} color={statusColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.memberName, { color: colors.foreground }]}>{m.name}</Text>
                  <Text style={[styles.memberMeta, { color: colors.mutedForeground }]}>{m.relation} · {m.phone}</Text>
                </View>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Pressable onPress={() => confirmRemove(m.id, m.name)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}>
                  <Feather name="trash-2" size={18} color={colors.danger} />
                </Pressable>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  form: { borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 20, gap: 10 },
  formTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 4 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  relationGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  relationChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  relationText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  formBtns: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  cancelText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  addBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  addText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  addFirstBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  emptyCard: { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", gap: 14 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  memberCard: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  memberName: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  memberMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
});
