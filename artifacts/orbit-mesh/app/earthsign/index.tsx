import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

interface EarthSignRecord {
  id: string;
  title: string;
  timestamp: string;
  deviceId: string;
  userId: string;
  hash: string;
  location?: string;
  notes?: string;
}

export default function EarthSignScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [records, setRecords] = useState<EarthSignRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [loaded, setLoaded] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  React.useEffect(() => {
    load();
  }, []);

  async function load() {
    const data = await AsyncStorage.getItem("@orbit-mesh/earthsign");
    if (data) setRecords(JSON.parse(data));
    setLoaded(true);
  }

  async function createRecord() {
    if (!title.trim()) { Alert.alert("Hata", "Başlık gerekli"); return; }
    const now = new Date().toISOString();
    const hash = `ESG-${Date.now().toString(16).toUpperCase()}`;
    const record: EarthSignRecord = {
      id: Date.now().toString(),
      title: title.trim(),
      timestamp: now,
      deviceId: "LOCAL",
      userId: user?.id ?? "anonymous",
      hash,
      notes: notes.trim() || undefined,
    };
    const updated = [record, ...records];
    setRecords(updated);
    await AsyncStorage.setItem("@orbit-mesh/earthsign", JSON.stringify(updated));
    setTitle(""); setNotes(""); setShowForm(false);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>EarthSign</Text>
        <Pressable onPress={() => setShowForm(f => !f)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Feather name={showForm ? "x" : "plus"} size={24} color={colors.secondary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <LinearGradient colors={[colors.secondary + "22", "transparent"]} style={StyleSheet.absoluteFill} />
          <Feather name="shield" size={24} color={colors.secondary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoTitle, { color: colors.foreground }]}>Kayıt & Kaynak Sistemi</Text>
            <Text style={[styles.infoDesc, { color: colors.mutedForeground }]}>
              Her kayıt zaman damgası, cihaz kimliği ve kullanıcı imzasıyla mühürlenir. Olayların gerçekliğini kanıtlamak için kullanılır.
            </Text>
          </View>
        </View>

        {showForm && (
          <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.formTitle, { color: colors.foreground }]}>Yeni EarthSign Kaydı</Text>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Başlık</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              value={title}
              onChangeText={setTitle}
              placeholder="Olay başlığı..."
              placeholderTextColor={colors.mutedForeground}
            />
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Notlar (opsiyonel)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border, minHeight: 80 }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Gözlem notları..."
              placeholderTextColor={colors.mutedForeground}
              multiline
            />
            <Pressable style={[styles.createBtn, { backgroundColor: colors.secondary }]} onPress={createRecord}>
              <Feather name="shield" size={16} color="white" />
              <Text style={styles.createBtnText}>Kaydı Mühürle</Text>
            </Pressable>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Kayıtlar ({records.length})</Text>
        {records.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="file-text" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Henüz kayıt yok</Text>
          </View>
        ) : (
          records.map(r => (
            <View key={r.id} style={[styles.recordCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.recordTop}>
                <Text style={[styles.recordTitle, { color: colors.foreground }]}>{r.title}</Text>
                <View style={[styles.hashBadge, { backgroundColor: colors.secondary + "22" }]}>
                  <Text style={[styles.hashText, { color: colors.secondary }]}>{r.hash}</Text>
                </View>
              </View>
              <Text style={[styles.recordTime, { color: colors.mutedForeground }]}>
                {new Date(r.timestamp).toLocaleString("tr-TR")}
              </Text>
              {r.notes && <Text style={[styles.recordNotes, { color: colors.mutedForeground }]}>{r.notes}</Text>}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  infoCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 20, overflow: "hidden" },
  infoTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 4 },
  infoDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  form: { borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 20, gap: 10 },
  formTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  createBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12 },
  createBtnText: { color: "white", fontSize: 14, fontFamily: "Inter_700Bold" },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 12 },
  emptyCard: { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  recordCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, gap: 6 },
  recordTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  recordTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  hashBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  hashText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  recordTime: { fontSize: 12, fontFamily: "Inter_400Regular" },
  recordNotes: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
