import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface AuetEvent {
  id: string;
  timestamp: string;
  type: string;
  intensity: string;
  notes?: string;
  location?: string;
}

const EVENT_TYPES = ["Titreşim", "Sismik", "Akustik", "Yeraltı Sesi", "Diğer"];
const INTENSITIES = ["Düşük", "Orta", "Yüksek", "Kritik"];

export default function AuetScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<AuetEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState("Titreşim");
  const [intensity, setIntensity] = useState("Orta");
  const [notes, setNotes] = useState("");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  React.useEffect(() => {
    AsyncStorage.getItem("@orbit-mesh/auet").then(d => { if (d) setEvents(JSON.parse(d)); });
  }, []);

  async function logEvent() {
    const event: AuetEvent = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type, intensity, notes: notes.trim() || undefined,
    };
    const updated = [event, ...events];
    setEvents(updated);
    await AsyncStorage.setItem("@orbit-mesh/auet", JSON.stringify(updated));
    setNotes(""); setShowForm(false);
  }

  const intensityColor = (i: string) => {
    if (i === "Kritik") return colors.danger;
    if (i === "Yüksek") return colors.warning;
    if (i === "Orta") return colors.primary;
    return colors.accent;
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>AUET</Text>
        <Pressable onPress={() => setShowForm(f => !f)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Feather name={showForm ? "x" : "plus"} size={24} color={colors.accent} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <LinearGradient colors={[colors.accent + "22", "transparent"]} style={StyleSheet.absoluteFill} />
          <Feather name="activity" size={24} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoTitle, { color: colors.foreground }]}>Akustik Yeraltı Olay Takibi</Text>
            <Text style={[styles.infoDesc, { color: colors.mutedForeground }]}>
              Titreşim, sismik ve akustik olayları logla. Deneyap Kart bağlandığında gerçek zamanlı veri akışı başlar.
            </Text>
          </View>
        </View>

        <View style={[styles.statusCard, { backgroundColor: colors.warning + "22", borderColor: colors.warning + "44" }]}>
          <Feather name="clock" size={14} color={colors.warning} />
          <Text style={[styles.statusText, { color: colors.warning }]}>Donanım bekleniyor — Manuel kayıt modu aktif</Text>
        </View>

        {showForm && (
          <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.formTitle, { color: colors.foreground }]}>Olay Kaydet</Text>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Olay Tipi</Text>
            <View style={styles.chipRow}>
              {EVENT_TYPES.map(t => (
                <Pressable key={t} style={[styles.chip, { backgroundColor: type === t ? colors.accent : colors.muted, borderColor: type === t ? colors.accent : colors.border }]} onPress={() => setType(t)}>
                  <Text style={[styles.chipText, { color: type === t ? colors.background : colors.foreground }]}>{t}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Şiddet</Text>
            <View style={styles.chipRow}>
              {INTENSITIES.map(i => (
                <Pressable key={i} style={[styles.chip, { backgroundColor: intensity === i ? intensityColor(i) : colors.muted, borderColor: intensity === i ? intensityColor(i) : colors.border }]} onPress={() => setIntensity(i)}>
                  <Text style={[styles.chipText, { color: intensity === i ? colors.background : colors.foreground }]}>{i}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Notlar</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Gözlem notları..."
              placeholderTextColor={colors.mutedForeground}
              multiline
            />
            <Pressable style={[styles.logBtn, { backgroundColor: colors.accent }]} onPress={logEvent}>
              <Feather name="save" size={16} color={colors.background} />
              <Text style={[styles.logBtnText, { color: colors.background }]}>Kaydet</Text>
            </Pressable>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Olay Günlüğü ({events.length})</Text>
        {events.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="radio" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Henüz olay kaydedilmedi</Text>
          </View>
        ) : (
          events.map(e => (
            <View key={e.id} style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: intensityColor(e.intensity), borderLeftWidth: 3 }]}>
              <View style={styles.eventTop}>
                <Text style={[styles.eventType, { color: colors.foreground }]}>{e.type}</Text>
                <View style={[styles.intensityBadge, { backgroundColor: intensityColor(e.intensity) + "33" }]}>
                  <Text style={[styles.intensityText, { color: intensityColor(e.intensity) }]}>{e.intensity}</Text>
                </View>
              </View>
              <Text style={[styles.eventTime, { color: colors.mutedForeground }]}>
                {new Date(e.timestamp).toLocaleString("tr-TR")}
              </Text>
              {e.notes && <Text style={[styles.eventNotes, { color: colors.mutedForeground }]}>{e.notes}</Text>}
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
  infoCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16, overflow: "hidden" },
  infoTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 4 },
  infoDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  statusCard: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 20 },
  statusText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  form: { borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 20, gap: 10 },
  formTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular", minHeight: 70 },
  logBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12 },
  logBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 12 },
  emptyCard: { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  eventCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, gap: 6 },
  eventTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eventType: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  intensityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  intensityText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  eventTime: { fontSize: 12, fontFamily: "Inter_400Regular" },
  eventNotes: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
