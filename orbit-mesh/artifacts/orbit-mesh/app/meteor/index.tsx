import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

type MeteorShower = {
  id: string;
  name: string;
  peakDate: string;
  radiant: string;
  zhr: number;
  moon: string;
  tip: string;
};

type SpaceEvent = {
  id: string;
  date: string;
  title: string;
  description: string;
  type: "tutulma" | "kavusum" | "other";
};

const METEORS: MeteorShower[] = [
  {
    id: "quadrantids",
    name: "Quadrantid Meteor Yağmuru",
    peakDate: "2026-01-03",
    radiant: "Köpekboynuzu (Bootes) yakınları",
    zhr: 110,
    moon: "Ay ilk çeyrek; gece yarısı sonra karanlık",
    tip: "Şafak öncesi kuzeydoğuya bakın.",
  },
  {
    id: "lyrids",
    name: "Lyrid Meteor Yağmuru",
    peakDate: "2026-04-22",
    radiant: "Çalgı (Lyra)",
    zhr: 18,
    moon: "Dolunay yakını; gecenin ikinci yarısı daha iyi",
    tip: "Gece yarısından sonra doğuya bakın.",
  },
  {
    id: "eta-aquarids",
    name: "Eta Aquarid Meteor Yağmuru",
    peakDate: "2026-05-06",
    radiant: "Kova (Aquarius)",
    zhr: 50,
    moon: "Hilal; gözlem için uygun",
    tip: "Şafak öncesi doğuya-güneydoğuya bakın.",
  },
  {
    id: "perseids",
    name: "Perseid Meteor Yağmuru",
    peakDate: "2026-08-12",
    radiant: "Perseus",
    zhr: 100,
    moon: "Yeni Ay civarı; karanlık gökyüzü",
    tip: "Yılın en popüler yağmuru; gece yarısından sonra kuzeydoğuya bakın.",
  },
  {
    id: "orionids",
    name: "Orionid Meteor Yağmuru",
    peakDate: "2026-10-21",
    radiant: "Avcı (Orion)",
    zhr: 20,
    moon: "İlk çeyrek; gece yarısı sonra karanlık",
    tip: "Şafak öncesi güneydoğuya bakın.",
  },
  {
    id: "leonids",
    name: "Leonid Meteor Yağmuru",
    peakDate: "2026-11-17",
    radiant: "Aslan (Leo)",
    zhr: 15,
    moon: "Dolunay; parlak gökyüzü zorlaştırır",
    tip: "Gece yarısı sonra doğu-güneydoğuya bakın.",
  },
  {
    id: "geminids",
    name: "Geminid Meteor Yağmuru",
    peakDate: "2026-12-14",
    radiant: "İkizler (Gemini)",
    zhr: 150,
    moon: "İlk çeyrek; zirve saatlerinde karanlık",
    tip: "Yılın en verimlisi; gece yarısından sonra doğuya bakın.",
  },
  {
    id: "ursids",
    name: "Ursid Meteor Yağmuru",
    peakDate: "2026-12-22",
    radiant: "Küçük Ayı (Ursa Minor)",
    zhr: 10,
    moon: "Dolunay; şafak öncesi daha iyi",
    tip: "Kuzey ufkuna bakın.",
  },
];

const SPACE_EVENTS: SpaceEvent[] = [
  {
    id: "march-equinox",
    date: "2026-03-20",
    title: "Mart Ekinoksu",
    description: "Gündüz ve gece neredeyse eşit uzunlukta. Kuzey yarımkürede ilkbahar başlar.",
    type: "other",
  },
  {
    id: "september-equinox",
    date: "2026-09-22",
    title: "Eylül Ekinoksu",
    description: "Kuzey yarımkürede sonbahar başlar.",
    type: "other",
  },
  {
    id: "june-solstice",
    date: "2026-06-21",
    title: "Haziran Gündönümü",
    description: "Kuzey yarımkürede en uzun gündüz.",
    type: "other",
  },
  {
    id: "december-solstice",
    date: "2026-12-21",
    title: "Aralık Gündönümü",
    description: "Kuzey yarımkürede en kısa gündüz.",
    type: "other",
  },
];

export default function MeteorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const upcomingMeteors = useMemo(
    () => METEORS.filter(m => m.peakDate >= today).sort((a, b) => a.peakDate.localeCompare(b.peakDate)),
    [today]
  );
  const upcomingEvents = useMemo(
    () => SPACE_EVENTS.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)),
    [today]
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="chevron-left" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>Meteor ve Gökyüzü Olayları</Text>
          <View style={{ width: 32 }} />
        </View>

        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Gözlem planı için gerçek meteor yağmuru ve astronomi olayları takvimi.
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Yaklaşan Meteor Yağmurları</Text>
          {upcomingMeteors.map(m => (
            <View key={m.id} style={[styles.row, { borderColor: colors.border }]}>
              <Feather name="star" size={16} color={colors.solar} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.rowTitle, { color: colors.foreground }]}>{m.name}</Text>
                <Text style={[styles.rowDetail, { color: colors.mutedForeground }]}>
                  Zirve: {new Date(m.peakDate).toLocaleDateString("tr-TR")} · ZHR: {m.zhr}
                </Text>
                <Text style={[styles.rowDetail, { color: colors.mutedForeground }]}>
                  Işık: {m.radiant}
                </Text>
                <Text style={[styles.rowTip, { color: colors.accent }]}>İpucu: {m.tip}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Özel Gökyüzü Olayları</Text>
          {upcomingEvents.map(e => (
            <View key={e.id} style={[styles.row, { borderColor: colors.border }]}>
              <Feather name="calendar" size={16} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.rowTitle, { color: colors.foreground }]}>{e.title}</Text>
                <Text style={[styles.rowDetail, { color: colors.mutedForeground }]}>
                  {new Date(e.date).toLocaleDateString("tr-TR")}
                </Text>
                <Text style={[styles.rowDetail, { color: colors.mutedForeground }]}>{e.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  card: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 12, color: "inherit" },
  row: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  rowTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 2 },
  rowDetail: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 2 },
  rowTip: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 4 },
});
