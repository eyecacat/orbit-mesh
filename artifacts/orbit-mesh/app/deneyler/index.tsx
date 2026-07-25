import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

type Experiment = {
  id: string;
  title: string;
  grade: string;
  duration: string;
  materials: string[];
  steps: string[];
  learning: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
};

const EXPERIMENTS: Experiment[] = [
  {
    id: "gnomon",
    title: "Gnomon ile Güneş Saati",
    grade: "5-6. Sınıf",
    duration: "30 dk + gün içi gözlem",
    materials: ["Düz bir karton", "Kalem", "Pergel", "Saat"],
    steps: [
      "Kartonu yatay bir zemine yerleştir.",
      "Dikey bir çubuk dik ve sabitle.",
      "Saat başlarında gölge ucunu işaretle.",
      "İşaretleri birleştir; güneş saati oluşur.",
    ],
    learning: "Dünya’nın dönüşü ve Güneş’in gökyüzündeki hareketini gözlemler.",
    icon: "sun",
    color: "#FFA500",
  },
  {
    id: "moon-phases",
    title: "Ay Evreleri Modeli",
    grade: "6-7. Sınıf",
    duration: "20 dk",
    materials: ["Top", "Kalem (ışık kaynağı)", "Karanlık oda"],
    steps: [
      "Topu eline al ve karanlık odada tut.",
      "Kalemi uzaktan topa doğru tut; bu Güneş olsun.",
      "Topu yavaşça kendi etrafında döndür; ışık alan kısmı değişir.",
      "Her açıda gördüğün şekli not et.",
    ],
    learning: "Ay’ın evreleri Güneş-Ay-Dünya geometrisine bağlıdır.",
    icon: "moon",
    color: "#A5B4FC",
  },
  {
    id: "crater",
    title: "Göktaşı Krateri Simülasyonu",
    grade: "6-8. Sınıf",
    duration: "25 dk",
    materials: ["Kum ve un karışımı", "Küçük bilyeler", "Cetvel"],
    steps: [
      "Tepsiye ince bir kum tabakası yay.",
      "Farklı açılardan ve hızlardan bilyeler bırak.",
      "Her düşüşten sonra krater boyutunu ölç.",
      "Hız, açı ve krater şekli arasındaki ilişkiyi karşılaştır.",
    ],
    learning: "Göktaşları ve asteroitlerin gezegen yüzeylerini nasıl şekillendirdiğini anlar.",
    icon: "target",
    color: "#F87171",
  },
  {
    id: "spectrum",
    title: "Basit Işık Spektroskopu",
    grade: "7-8. Sınıf",
    duration: "30 dk",
    materials: ["CD/DVD", "Karton rulo", "Bant", "Beyaz ışık kaynağı"],
    steps: [
      "CD’yi 45° açıyla karton rulonun ucuna yerleştir.",
      "Işık kaynağına doğru tut.",
      "Renklerin ayrıştığını gözlemle.",
      "Güneş ışığı ve LED ışığını karşılaştır.",
    ],
    learning: "Işığın dalga boylarına ayrıştığını ve yıldızların spektrumdan nasıl incelendiğini kavrar.",
    icon: "disc",
    color: "#38C8FF",
  },
  {
    id: "water-rocket",
    title: "Basit Su Roketi",
    grade: "7-8. Sınıf",
    duration: "45 dk",
    materials: ["Pet şişe", "Bisiklet pompası", "Karton", "Su"],
    steps: [
      "Pet şişenin kapağına delik aç ve hortum geçir.",
      "Şişenin 1/3’ünü suyla doldur.",
      "Kartondan stabilizatör kanatları kes ve yapıştır.",
      "Pompa ile basıncı artır; fırlatmayı dene.",
    ],
    learning: "Roket itişinin Newton’un üçüncü yasasıyla nasıl çalıştığını gözlemler.",
    icon: "send",
    color: "#22C55E",
  },
  {
    id: "magnetometer",
    title: "Basit Pusula Kalibrasyonu",
    grade: "5-8. Sınıf",
    duration: "15 dk",
    materials: ["Cep telefonu pusulası", "Kağıt", "Kalem"],
    steps: [
      "Telefonu yatay tut ve manyetik kuzeyi bul.",
      "Gerçek kuzey ile farkı (manyetik sapma) not et.",
      "Farklı noktalarda ölçümler yap.",
      "Yerel manyetik alanın değişimini tartış.",
    ],
    learning: "Dünya’nın manyetik alanı ve uzay havasının etkileri hakkında fikir edinir.",
    icon: "compass",
    color: "#A78BFA",
  },
];

export default function DeneylerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [expanded, setExpanded] = useState<string | null>(null);

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
          <Text style={[styles.title, { color: colors.foreground }]}>Öğrenci Deney Rehberi</Text>
          <View style={{ width: 32 }} />
        </View>

        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Evde ve okulda yapılabilecek, MEB müfredatına uygun astronomi deneyleri.
        </Text>

        {EXPERIMENTS.map(exp => {
          const isOpen = expanded === exp.id;
          return (
            <View key={exp.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Pressable onPress={() => setExpanded(isOpen ? null : exp.id)} style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: exp.color + "33" }]}>
                  <Feather name={exp.icon} size={20} color={exp.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>{exp.title}</Text>
                  <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                    {exp.grade} · {exp.duration}
                  </Text>
                </View>
                <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={20} color={colors.mutedForeground} />
              </Pressable>
              {isOpen && (
                <View style={styles.details}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Malzemeler</Text>
                  {exp.materials.map((m, i) => (
                    <Text key={i} style={[styles.bullet, { color: colors.mutedForeground }]}>• {m}</Text>
                  ))}
                  <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 12 }]}>Adımlar</Text>
                  {exp.steps.map((s, i) => (
                    <Text key={i} style={[styles.bullet, { color: colors.mutedForeground }]}>
                      {i + 1}. {s}
                    </Text>
                  ))}
                  <Text style={[styles.learning, { color: colors.accent }]}>Kazanım: {exp.learning}</Text>
                </View>
              )}
            </View>
          );
        })}
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
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  details: { marginTop: 12, paddingTop: 12 },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 6 },
  bullet: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 4, lineHeight: 18 },
  learning: { fontSize: 13, fontFamily: "Inter_700Bold", marginTop: 12 },
});
