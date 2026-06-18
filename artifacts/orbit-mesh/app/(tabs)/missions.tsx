import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

type Mission = {
  id: string;
  name: string;
  agency: string;
  year: string;
  category: "Keşif" | "Gözlem" | "Gezegen" | "Derin Uzay" | "Mars";
  goal: string;
  achievement: string;
  icon: keyof typeof Feather.glyphMap;
};

const MISSIONS: Mission[] = [
  {
    id: "apollo11",
    name: "Apollo 11",
    agency: "NASA",
    year: "1969",
    category: "Keşif",
    goal: "İnsanı Ay’a indirip güvenli şekilde geri getirmek.",
    achievement: "İlk insanlı Ay inişini gerçekleştirdi.",
    icon: "flag",
  },
  {
    id: "voyager1",
    name: "Voyager 1",
    agency: "NASA",
    year: "1977",
    category: "Derin Uzay",
    goal: "Dış Güneş Sistemi’ni ve ötesini incelemek.",
    achievement:
      "Güneş Sistemi’nin sınırlarını aşan en uzak insan yapımı araçlardan biri oldu.",
    icon: "navigation",
  },
  {
    id: "voyager2",
    name: "Voyager 2",
    agency: "NASA",
    year: "1977",
    category: "Derin Uzay",
    goal: "Gaz ve buz devlerini yakından gözlemlemek.",
    achievement: "Uranüs ve Neptün’ü ziyaret eden tek uzay aracı oldu.",
    icon: "navigation-2",
  },
  {
    id: "hubble",
    name: "Hubble Uzay Teleskobu",
    agency: "NASA / ESA",
    year: "1990",
    category: "Gözlem",
    goal: "Evrenin derinliklerini yüksek çözünürlükle gözlemlemek.",
    achievement:
      "Galaksiler, nebulalar ve kozmik yapılar hakkında çok değerli görüntüler sağladı.",
    icon: "eye",
  },
  {
    id: "jwst",
    name: "James Webb",
    agency: "NASA / ESA / CSA",
    year: "2021",
    category: "Gözlem",
    goal: "Kızılötesi gözlemle erken evreni incelemek.",
    achievement:
      "Uzak galaksiler ve gezegen atmosferleri için yeni gözlem imkânı sundu.",
    icon: "star",
  },
  {
    id: "perseverance",
    name: "Perseverance",
    agency: "NASA",
    year: "2020",
    category: "Mars",
    goal: "Mars yüzeyinde yaşam izleri ve örnek toplamak.",
    achievement: "Mars’taki Jezero Krateri’nde bilimsel veri topluyor.",
    icon: "map-pin",
  },
  {
    id: "curiosity",
    name: "Curiosity",
    agency: "NASA",
    year: "2011",
    category: "Mars",
    goal: "Mars’ın yaşanabilir geçmişini araştırmak.",
    achievement:
      "Mars yüzeyindeki jeolojik kanıtları inceleyen önemli görevlerden biri.",
    icon: "cpu",
  },
  {
    id: "cassini",
    name: "Cassini-Huygens",
    agency: "NASA / ESA / ASI",
    year: "1997",
    category: "Gezegen",
    goal: "Satürn ve uydularını ayrıntılı incelemek.",
    achievement:
      "Satürn halkaları ve Titan hakkında çok önemli veriler sağladı.",
    icon: "circle",
  },
];

const CATEGORIES = [
  "Hepsi",
  "Keşif",
  "Gözlem",
  "Gezegen",
  "Derin Uzay",
  "Mars",
] as const;

export default function MissionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] =
    useState<(typeof CATEGORIES)[number]>("Hepsi");

  const filteredData = useMemo(() => {
    if (selectedCategory === "Hepsi") return MISSIONS;
    return MISSIONS.filter((item) => item.category === selectedCategory);
  }, [selectedCategory]);

  const topPad = insets.top + 8;
  const bottomPad = insets.bottom + 20;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad, borderBottomColor: colors.border },
        ]}
      >
        <View
          style={[styles.iconWrap, { backgroundColor: colors.primary + "18" }]}
        >
          <Feather name="send" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Uzay Görevleri
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Keşif sistemlerini ve uzay araştırmalarının tarihini öğren.
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.filterRow,
          { paddingHorizontal: 16, paddingTop: 14 },
        ]}
      >
        {CATEGORIES.map((category) => {
          const active = category === selectedCategory;
          return (
            <Pressable
              key={category}
              onPress={() => setSelectedCategory(category)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? colors.primary : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: active ? colors.background : colors.foreground },
                ]}
              >
                {category}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: bottomPad,
        }}
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.cardTop}>
              <View
                style={[
                  styles.missionIcon,
                  { backgroundColor: colors.primary + "16" },
                ]}
              >
                <Feather name={item.icon} size={18} color={colors.primary} />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.missionName, { color: colors.foreground }]}
                >
                  {item.name}
                </Text>
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                  {item.agency} · {item.year}
                </Text>
              </View>

              <View
                style={[
                  styles.categoryPill,
                  { backgroundColor: colors.background },
                ]}
              >
                <Text style={[styles.categoryText, { color: colors.primary }]}>
                  {item.category}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text
                style={[styles.sectionLabel, { color: colors.mutedForeground }]}
              >
                Amaç
              </Text>
              <Text style={[styles.sectionText, { color: colors.foreground }]}>
                {item.goal}
              </Text>
            </View>

            <View style={styles.section}>
              <Text
                style={[styles.sectionLabel, { color: colors.mutedForeground }]}
              >
                Kazanım
              </Text>
              <Text style={[styles.sectionText, { color: colors.foreground }]}>
                {item.achievement}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View
            style={[
              styles.empty,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="search" size={18} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Bu kategoride gösterilecek görev yok.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  filterRow: {
    gap: 8,
    paddingBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "700",
  },
  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    marginTop: 12,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  missionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  missionName: {
    fontSize: 18,
    fontWeight: "800",
  },
  meta: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "800",
  },
  section: {
    marginTop: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 28,
  },
  emptyText: {
    fontSize: 13,
  },
});
