import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

function getMoonPhase(date: Date) {
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  const day = date.getDate();

  let c, e, jd, b;
  if (month < 3) {
    year--;
    month += 12;
  }
  c = 365.25 * year;
  e = 30.6 * month;
  jd = c + e + day - 694039.09;
  jd /= 29.5305882;
  b = Math.floor(jd);
  jd -= b;
  b = Math.round(jd * 8);
  if (b >= 8) b = 0;

  const phaseNames = [
    "Yeni Ay",
    "Hilal",
    "İlk Dördün",
    "Dolunay’a Doğru",
    "Dolunay",
    "Dolunay’dan Sonra",
    "Son Dördün",
    "Hilal (Küçülen)",
  ];

  const illumination = (1 - Math.cos(jd * 2 * Math.PI)) / 2;
  return { phase: b, name: phaseNames[b], illumination };
}

function getMonthDates(year: number, month: number) {
  const dates: Date[] = [];
  const days = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= days; d++) dates.push(new Date(year, month, d));
  return dates;
}

export default function AyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const now = new Date();
  const current = getMoonPhase(now);
  const monthDates = useMemo(() => getMonthDates(now.getFullYear(), now.getMonth()), [now]);

  const nextPhases = useMemo(() => {
    const list: { date: Date; name: string }[] = [];
    for (let i = 0; i < 60; i++) {
      const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const p = getMoonPhase(d);
      if (p.name === "Yeni Ay" || p.name === "Dolunay" || p.name === "İlk Dördün" || p.name === "Son Dördün") {
        if (!list.find(x => x.name === p.name)) list.push({ date: d, name: p.name });
      }
    }
    return list.slice(0, 4);
  }, [now]);

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
          <Text style={[styles.title, { color: colors.foreground }]}>Ay Takvimi</Text>
          <View style={{ width: 32 }} />
        </View>

        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Ay evreleri, aydınlanma oranı ve gözlem için en uygun günler.
        </Text>

        <View style={[styles.currentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.moonIcon, { backgroundColor: colors.primary + "22" }]}>
            <Feather name="moon" size={40} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.currentPhase, { color: colors.foreground }]}>{current.name}</Text>
            <Text style={[styles.currentMeta, { color: colors.mutedForeground }]}>
              Bugün: {now.toLocaleDateString("tr-TR")}
            </Text>
            <Text style={[styles.currentMeta, { color: colors.mutedForeground }]}>
              Aydınlanma: %{(current.illumination * 100).toFixed(1)}
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Yaklaşan Evreler</Text>
          {nextPhases.map((p, i) => (
            <View key={i} style={[styles.phaseRow, { borderColor: colors.border }]}>
              <Feather name="calendar" size={16} color={colors.accent} />
              <Text style={[styles.phaseName, { color: colors.foreground }]}>{p.name}</Text>
              <Text style={[styles.phaseDate, { color: colors.mutedForeground }]}>
                {p.date.toLocaleDateString("tr-TR")}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            {now.toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}
          </Text>
          <View style={styles.grid}>
            {monthDates.map((d, i) => {
              const p = getMoonPhase(d);
              const isToday = d.toDateString() === now.toDateString();
              return (
                <View
                  key={i}
                  style={[
                    styles.day,
                    { backgroundColor: isToday ? colors.primary + "33" : colors.border + "55" },
                  ]}
                >
                  <Text style={[styles.dayNum, { color: colors.foreground }]}>{d.getDate()}</Text>
                  <Text style={[styles.dayPhase, { color: colors.mutedForeground }]}>{p.name}</Text>
                </View>
              );
            })}
          </View>
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
  currentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  moonIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  currentPhase: { fontSize: 20, fontFamily: "Inter_700Bold" },
  currentMeta: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  card: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 12, color: "inherit" },
  phaseRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  phaseName: { flex: 1, fontSize: 15, fontFamily: "Inter_700Bold" },
  phaseDate: { fontSize: 13, fontFamily: "Inter_400Regular" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  day: {
    width: "22%",
    aspectRatio: 1,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
  },
  dayNum: { fontSize: 14, fontFamily: "Inter_700Bold" },
  dayPhase: { fontSize: 9, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 2 },
});
