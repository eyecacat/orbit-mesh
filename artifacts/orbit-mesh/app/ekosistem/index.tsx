import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

type EcosystemItem = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
  icon: keyof typeof Feather.glyphMap;
  color: string;
};

const ECOSYSTEM: EcosystemItem[] = [
  {
    id: "tua",
    title: "Türkiye Uzay Ajansı (TUA)",
    subtitle: "Ulusal uzay politikası ve koordinasyon",
    description:
      "Türkiye’nin uzay çalışmalarını tek çatı altında yöneten ajans. Türk astronot görevi, uydu programları ve uluslararası iş birliklerini yürütür.",
    tags: ["Devlet", "Strateji", "İnsanlı Uzay"],
    icon: "flag",
    color: "#E11D48",
  },
  {
    id: "tubitak-uzay",
    title: "TÜBİTAK UZAY",
    subtitle: "Uzay teknolojileri Ar-Ge merkezi",
    description:
      "Uydu sistemleri, gözlem, haberleşme ve uzay bilimleri alanında milli Ar-Ge çalışmaları yürütür. RASAT, GÖKTÜRK ve İMECE gibi projelerin arka planındaki kuruluştur.",
    tags: ["Ar-Ge", "Uydu", "Görüntüleme"],
    icon: "cpu",
    color: "#0EA5E9",
  },
  {
    id: "turksat",
    title: "Türksat",
    subtitle: "Ulusal haberleşme uyduları",
    description:
      "Türkiye’nin haberleşme ve TV yayın uydularını işletir. TÜRKSAT 5A, 5B ve 6A uyduları bu şirket tarafından yönetilmektedir.",
    tags: ["Haberleşme", "Ticari", "Yayın"],
    icon: "radio",
    color: "#F97316",
  },
  {
    id: "rasat",
    title: "RASAT",
    subtitle: "Türkiye’nin ilk yer gözlem uydusu",
    description:
      "2011’de fırlatılan RASAT, Türkiye’nin kendi imkanlarıyla ürettiği ilk yer gözlem uydusudur. Tarım, çevre ve afet yönetimi için görüntü sağlamıştır.",
    tags: ["Yer Gözlem", "İlk"],
    icon: "camera",
    color: "#22C55E",
  },
  {
    id: "gokturk",
    title: "GÖKTÜRK Serisi",
    subtitle: "Yüksek çözünürlüklü yer gözlem uyduları",
    description:
      "GÖKTÜRK-1A ve GÖKTÜRK-2, askeri ve sivil alanlarda kullanılan yüksek çözünürlüklü görüntüleme uydularıdır.",
    tags: ["Yer Gözlem", "Güvenlik", "Savunma"],
    icon: "eye",
    color: "#8B5CF6",
  },
  {
    id: "imece",
    title: "İMECE",
    subtitle: "Türkiye’nin ilk milli elektro-optik uydusu",
    description:
      "TÜBİTAK UZAY tarafından geliştirilen İMECE, yüksek çözünürlüklü elektro-optik kamerasıyla yer gözlem yeteneğini önemli ölçüde artırmıştır.",
    tags: ["Milli", "Elektro-Optik", "Görüntüleme"],
    icon: "aperture",
    color: "#EC4899",
  },
  {
    id: "deneyap",
    title: "Deneyap Teknoloji Atölyeleri",
    subtitle: "Gençler için uzay ve teknoloji eğitimi",
    description:
      "TÜRKSAT ve TÜBİTAK desteğiyle gençlere uzay teknolojileri, kodlama, robotik ve uydu sistemleri eğitimi veren atölyeler.",
    tags: ["Eğitim", "Gençlik", "Kodlama"],
    icon: "users",
    color: "#14B8A6",
  },
  {
    id: "turk-astronot",
    title: "Türk Astronot Görevi",
    subtitle: "Axiom-3 ve sonrası",
    description:
      "Türkiye’nin ilk astronotu Alper Gezeravcı’nın Axiom-3 göreviyle Uluslararası Uzay İstasyonu’na ulaşması, ülkenin insanlı uzay çalışmalarında dönüm noktasıdır.",
    tags: ["İnsanlı Uzay", "ISS", "Tarihi"],
    icon: "user",
    color: "#F59E0B",
  },
];

export default function EkosistemScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

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
          <Text style={[styles.title, { color: colors.foreground }]}>Yerli Uzay Ekosistemi</Text>
          <View style={{ width: 32 }} />
        </View>

        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Türkiye’nin uzay çalışmalarındaki kurum, uydu ve projelerini keşfet.
        </Text>

        {ECOSYSTEM.map(item => (
          <View key={item.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: item.color + "33" }]}>
                <Feather name={item.icon} size={22} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.title}</Text>
                <Text style={[styles.subtitleText, { color: colors.mutedForeground }]}>{item.subtitle}</Text>
              </View>
            </View>
            <Text style={[styles.description, { color: colors.mutedForeground }]}>{item.description}</Text>
            <View style={styles.tagRow}>
              {item.tags.map(tag => (
                <View key={tag} style={[styles.tag, { backgroundColor: item.color + "22" }]}>
                  <Text style={[styles.tagText, { color: item.color }]}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
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
    marginBottom: 12,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  subtitleText: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
  description: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    marginBottom: 10,
  },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontSize: 11, fontFamily: "Inter_700Bold" },
});
