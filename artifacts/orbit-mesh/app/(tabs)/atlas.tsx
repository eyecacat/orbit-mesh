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

type Planet = {
  id: string;
  name: string;
  order: number;
  type: "Kayalık" | "Gaz Devi" | "Buz Devi" | "Yıldız";
  diameterKm: string;
  dayLength: string;
  orbitPeriod: string;
  avgTemp: string;
  summary: string;
  fact: string;
};

const PLANETS: Planet[] = [
  {
    id: "sun",
    name: "Güneş",
    order: 0,
    type: "Yıldız",
    diameterKm: "1.392.700",
    dayLength: "—",
    orbitPeriod: "—",
    avgTemp: "5.500°C yüzey",
    summary: "Güneş Sistemi’nin merkezindeki yıldız.",
    fact: "Güneş’in çekirdeğinde hidrojen, helyuma dönüşerek enerji üretir.",
  },
  {
    id: "mercury",
    name: "Merkür",
    order: 1,
    type: "Kayalık",
    diameterKm: "4.879",
    dayLength: "58,6 Dünya günü",
    orbitPeriod: "88 gün",
    avgTemp: "-173°C / 427°C",
    summary: "Güneş’e en yakın ve en hızlı gezegen.",
    fact: "Merkür’de atmosfer çok incedir; bu yüzden sıcaklık farkı aşırıdır.",
  },
  {
    id: "venus",
    name: "Venüs",
    order: 2,
    type: "Kayalık",
    diameterKm: "12.104",
    dayLength: "243 Dünya günü",
    orbitPeriod: "225 gün",
    avgTemp: "465°C",
    summary: "Kalın atmosferiyle en sıcak gezegen.",
    fact: "Venüs, ters yönde dönen birkaç büyük gezegenden biridir.",
  },
  {
    id: "earth",
    name: "Dünya",
    order: 3,
    type: "Kayalık",
    diameterKm: "12.742",
    dayLength: "24 saat",
    orbitPeriod: "365,25 gün",
    avgTemp: "15°C ortalama",
    summary: "Bilinen yaşamın bulunduğu tek gezegen.",
    fact: "Dünya’nın sıvı suyu ve koruyucu atmosferi yaşam için kritik önemdedir.",
  },
  {
    id: "mars",
    name: "Mars",
    order: 4,
    type: "Kayalık",
    diameterKm: "6.779",
    dayLength: "24,6 saat",
    orbitPeriod: "687 gün",
    avgTemp: "-63°C",
    summary: "Kızıl gezegen; geleceğin keşif hedefi.",
    fact: "Mars’taki toprakta demir oksit bulunduğu için yüzeyi kızıl görünür.",
  },
  {
    id: "jupiter",
    name: "Jüpiter",
    order: 5,
    type: "Gaz Devi",
    diameterKm: "139.820",
    dayLength: "9,9 saat",
    orbitPeriod: "11,9 yıl",
    avgTemp: "-110°C",
    summary: "Güneş Sistemi’nin en büyük gezegeni.",
    fact: "Büyük Kırmızı Leke, yüzlerce yıldır süren dev bir fırtınadır.",
  },
  {
    id: "saturn",
    name: "Satürn",
    order: 6,
    type: "Gaz Devi",
    diameterKm: "116.460",
    dayLength: "10,7 saat",
    orbitPeriod: "29,5 yıl",
    avgTemp: "-140°C",
    summary: "Halkalarıyla ünlü gaz devi.",
    fact: "Satürn’ün halkaları buz ve kaya parçalarından oluşur.",
  },
  {
    id: "uranus",
    name: "Uranüs",
    order: 7,
    type: "Buz Devi",
    diameterKm: "50.724",
    dayLength: "17,2 saat",
    orbitPeriod: "84 yıl",
    avgTemp: "-195°C",
    summary: "Yan yatmış ekseniyle dikkat çeken buz devi.",
    fact: "Uranüs’ün eksen eğikliği yaklaşık 98 derecedir.",
  },
  {
    id: "neptune",
    name: "Neptün",
    order: 8,
    type: "Buz Devi",
    diameterKm: "49.244",
    dayLength: "16,1 saat",
    orbitPeriod: "164,8 yıl",
    avgTemp: "-201°C",
    summary: "Güneş Sistemi’nin en dıştaki gezegenlerinden biri.",
    fact: "Neptün’de çok hızlı rüzgârlar görülür.",
  },
];

const FILTERS: Array<Planet["type"] | "Hepsi"> = [
  "Hepsi",
  "Yıldız",
  "Kayalık",
  "Gaz Devi",
  "Buz Devi",
];

export default function AtlasScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [selectedFilter, setSelectedFilter] = useState<(typeof FILTERS)[number]>("Hepsi");

  const filteredData = useMemo(() => {
    if (selectedFilter === "Hepsi") return PLANETS;
    return PLANETS.filter(item => item.type === selectedFilter);
  }, [selectedFilter]);

  const topPad = insets.top + 8;
  const bottomPad = insets.bottom + 20;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + "18" }]}>
          <Feather name="globe" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>Gökyüzü Atlası</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Güneş Sistemi’nin temel yapılarını tek yerde öğren.
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filterRow, { paddingHorizontal: 16, paddingTop: 14 }]}
      >
        {FILTERS.map(filter => {
          const active = filter === selectedFilter;
          return (
            <Pressable
              key={filter}
              onPress={() => setSelectedFilter(filter)}
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
                {filter}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={filteredData}
        keyExtractor={item => item.id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: bottomPad,
        }}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardTop}>
              <View>
                <Text style={[styles.planetName, { color: colors.foreground }]}>
                  {item.order === 0 ? "☉" : `${item.order}.`} {item.name}
                </Text>
                <Text style={[styles.badge, { color: colors.primary }]}>
                  {item.type}
                </Text>
              </View>

              <View style={[styles.orderPill, { backgroundColor: colors.primary + "16" }]}>
                <Text style={[styles.orderPillText, { color: colors.primary }]}>
                  {item.order === 0 ? "Merkez" : `#${item.order}`}
                </Text>
              </View>
            </View>

            <Text style={[styles.summary, { color: colors.foreground }]}>
              {item.summary}
            </Text>

            <View style={styles.grid}>
              <InfoBox label="Çap" value={item.diameterKm + " km"} colors={colors} />
              <InfoBox label="Gün" value={item.dayLength} colors={colors} />
              <InfoBox label="Yıl" value={item.orbitPeriod} colors={colors} />
              <InfoBox label="Sıcaklık" value={item.avgTemp} colors={colors} />
            </View>

            <View style={[styles.factBox, { backgroundColor: colors.background }]}>
              <Feather name="book-open" size={14} color={colors.primary} />
              <Text style={[styles.factText, { color: colors.foreground }]}>
                {item.fact}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="search" size={18} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Bu filtrede gösterilecek veri yok.
            </Text>
          </View>
        }
      />
    </View>
  );
}

function InfoBox({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.infoBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
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
    justifyContent: "space-between",
    gap: 12,
  },
  planetName: {
    fontSize: 18,
    fontWeight: "800",
  },
  badge: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: "700",
  },
  orderPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  orderPillText: {
    fontSize: 12,
    fontWeight: "800",
  },
  summary: {
    fontSize: 14,
    marginTop: 12,
    lineHeight: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  infoBox: {
    width: "48%",
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
  },
  infoLabel: {
    fontSize: 11,
    marginBottom: 4,
    fontWeight: "700",
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  factBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 14,
    borderRadius: 18,
    padding: 12,
  },
  factText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
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