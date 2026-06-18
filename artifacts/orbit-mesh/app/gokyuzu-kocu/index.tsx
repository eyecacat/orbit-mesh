import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
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

type Mode = "general" | "moon" | "planets" | "constellations" | "deep-sky";

type Suggestion = {
  title: string;
  detail: string;
  icon: keyof typeof Feather.glyphMap;
};

const MODES: { id: Mode; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { id: "general", label: "Genel", icon: "compass" },
  { id: "moon", label: "Ay", icon: "moon" },
  { id: "planets", label: "Gezegen", icon: "globe" },
  { id: "constellations", label: "Takımyıldız", icon: "star" },
  { id: "deep-sky", label: "Derin Uzay", icon: "activity" },
];

function getTimeBand(hour: number) {
  if (hour >= 6 && hour < 18) return "Gündüz";
  if (hour >= 18 && hour < 20) return "Alacakaranlık";
  if (hour >= 20 && hour < 23) return "Gece başı";
  if (hour >= 23 || hour < 3) return "Derin gece";
  return "Şafak";
}

function getCoach(mode: Mode, hour: number): {
  headline: string;
  subtitle: string;
  suggestions: Suggestion[];
  tip: string;
} {
  const band = getTimeBand(hour);

  const map: Record<Mode, { headline: string; subtitle: string; suggestions: Suggestion[]; tip: string }> = {
    general: {
      headline: `${band} gözlem planı hazır`,
      subtitle: "Bu oturumda çıplak gözle en iyi görülebilecek hedefler öne çıkarıldı.",
      suggestions:
        band === "Gündüz"
          ? [
              { title: "Güneş güvenliği", detail: "Doğrudan bakma. Filtreli gözlem dışında Güneş'e yönelme.", icon: "alert-triangle" },
              { title: "Gölge ölçümü", detail: "Gnomon ya da basit bir çubukla Güneş yüksekliğini ölç.", icon: "compass" },
              { title: "Gündüz görünen Ay", detail: "Ay görünüyorsa evreyi not et.", icon: "moon" },
            ]
          : band === "Alacakaranlık"
          ? [
              { title: "Venüs", detail: "Batı ufku yakınında parlak bir nokta arayın.", icon: "star" },
              { title: "Ay", detail: "İnce hilal evresi varsa gözlem için çok uygundur.", icon: "moon" },
              { title: "Jüpiter", detail: "Parlak sabit ışık gibi görünür.", icon: "globe" },
            ]
          : band === "Gece başı"
          ? [
              { title: "Satürn", detail: "Sabit sarımsı ışık; halkaları dürbünle fark edilebilir.", icon: "circle" },
              { title: "Mars", detail: "Kızıl tonlu görünür.", icon: "sun" },
              { title: "Orion", detail: "Kış/ilkbahar takımyıldızı olarak çok iyi bir eğitim hedefi.", icon: "star" },
            ]
          : band === "Derin gece"
          ? [
              { title: "Orion Nebulası", detail: "Işık kirliliği düşükse dürbünle iyi sonuç verir.", icon: "activity" },
              { title: "Andromeda", detail: "Karanlık gökyüzünde çıplak göz sınırında seçilebilir.", icon: "radio" },
              { title: "Ülker", detail: "Genç yıldız kümesi; eğitim için mükemmel.", icon: "star" },
            ]
          : [
              { title: "Jüpiter", detail: "Şafak saatlerinde en iyi hedeflerden biridir.", icon: "globe" },
              { title: "Venüs", detail: "Sabah yıldızı olarak ufka yakın güçlü görünür.", icon: "sun" },
              { title: "Açık yıldız alanı", detail: "Takımyıldızları tekrar etmek için iyi zaman.", icon: "grid" },
            ],
      tip: "En iyi sonuç için ışık kirliliği düşük, ufku açık bir alan seç.",
    },
    moon: {
      headline: `${band} Ay odaklı plan`,
      subtitle: "Ay gözlemi için faz, ufuk yüksekliği ve terminatör hattı önemli.",
      suggestions: [
        { title: "Ay fazı", detail: "Hilal veya şişkin evrelerde krater detayları daha belirgindir.", icon: "moon" },
        { title: "Krater çizgisi", detail: "Terminatör hattına yakın kraterler daha net görünür.", icon: "activity" },
        { title: "Ay günlükleri", detail: "Evre, tarih ve parlaklık notu tut.", icon: "book-open" },
      ],
      tip: "Dürbünle başla; teleskop varsa ilk hedefin Ay olsun.",
    },
    planets: {
      headline: `${band} gezegen avı planı`,
      subtitle: "Gezegenler özellikle alacakaranlıkta ve sabah saatlerinde öne çıkar.",
      suggestions: [
        { title: "Venüs", detail: "En parlak aday; konumu kolay takip edilir.", icon: "sun" },
        { title: "Jüpiter", detail: "Büyük uyduları gözlemlemek için iyi hedef.", icon: "globe" },
        { title: "Satürn", detail: "Halkalar ve renk farkı eğitsel açıdan çok güçlü.", icon: "circle" },
      ],
      tip: "Gezegenlerin yerini bir yıldız haritasıyla karşılaştır.",
    },
    constellations: {
      headline: `${band} takımyıldız çalışması`,
      subtitle: "Öğrenme için yıldızları kümeler halinde ezberlemek yerine desenleri oku.",
      suggestions: [
        { title: "Orion", detail: "Kemer yıldızları yön bulma için iyi referanstır.", icon: "star" },
        { title: "Büyük Ayı", detail: "Kuzey yönü bulmak için ideal.", icon: "navigation" },
        { title: "Akrep", detail: "Yaz gökyüzünde düşük ufukta belirir.", icon: "sun" },
      ],
      tip: "Önce çıplak göz, sonra uygulama içi not, sonra gerçek gökyüzü.",
    },
    "deep-sky": {
      headline: `${band} derin uzay oturumu`,
      subtitle: "Galaksi, nebulalar ve açık yıldız kümeleri için karanlık gökyüzü gerekir.",
      suggestions: [
        { title: "Andromeda Galaksisi", detail: "Karanlık gökyüzünde ilk derin uzay hedefi.", icon: "activity" },
        { title: "Orion Nebulası", detail: "Dürbünle bile eğitsel etki yaratır.", icon: "radio" },
        { title: "Ülker", detail: "Açık yıldız kümesi; başlangıç seviyesinde çok uygundur.", icon: "star" },
      ],
      tip: "Bu oturumda ekran parlaklığını azalt, göz uyumunu koru.",
    },
  };

  return map[mode];
}

export default function GokyuzuKocuScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>("general");

  const hour = new Date().getHours();
  const coach = useMemo(() => getCoach(mode, hour), [mode, hour]);

  const topPad = insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingTop: topPad + 12, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="arrow-left" size={18} color={colors.foreground} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.kicker, { color: colors.mutedForeground }]}>Gökyüzü Koçu</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Bu gece neyi gözlemlemelisin?</Text>
          </View>
        </View>

        <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <LinearGradient colors={["#1D4ED8", "#7C3AED", "#0F172A"]} style={styles.heroGradient}>
            <Text style={styles.heroBand}>{getTimeBand(hour)}</Text>
            <Text style={styles.heroHeadline}>{coach.headline}</Text>
            <Text style={styles.heroSubtitle}>{coach.subtitle}</Text>

            <View style={styles.heroTipBox}>
              <Feather name="info" size={14} color="white" />
              <Text style={styles.heroTipText}>{coach.tip}</Text>
            </View>
          </LinearGradient>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Odak modu</Text>
        <View style={styles.modeRow}>
          {MODES.map(item => {
            const active = item.id === mode;
            return (
              <Pressable
                key={item.id}
                onPress={() => setMode(item.id)}
                style={[
                  styles.modeChip,
                  {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Feather name={item.icon} size={14} color={active ? colors.background : colors.foreground} />
                <Text style={[styles.modeChipText, { color: active ? colors.background : colors.foreground }]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Bu oturumda önerilenler</Text>
        {coach.suggestions.map(item => (
          <View key={item.title} style={[styles.suggestionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.suggestionIcon, { backgroundColor: colors.primary + "18" }]}>
              <Feather name={item.icon} size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.suggestionTitle, { color: colors.foreground }]}>{item.title}</Text>
              <Text style={[styles.suggestionDetail, { color: colors.mutedForeground }]}>{item.detail}</Text>
            </View>
          </View>
        ))}

        <View style={[styles.checklistCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, paddingHorizontal: 0 }]}>Hazırlık kontrolü</Text>
          {[
            "Işık kirliliği az bir alan seç",
            "Telefon parlaklığını düşür",
            "Dürbün / teleskop varsa hazırla",
            "Gözlem notu tut",
          ].map(line => (
            <View key={line} style={styles.checkRow}>
              <Feather name="check-circle" size={14} color={colors.accent} />
              <Text style={[styles.checkText, { color: colors.foreground }]}>{line}</Text>
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
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  kicker: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 2 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", lineHeight: 30 },
  hero: {
    marginHorizontal: 20,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    marginBottom: 22,
  },
  heroGradient: {
    padding: 18,
    minHeight: 180,
    justifyContent: "space-between",
  },
  heroBand: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontFamily: "Inter_700Bold" },
  heroHeadline: { color: "white", fontSize: 21, lineHeight: 28, fontFamily: "Inter_700Bold", marginTop: 8 },
  heroSubtitle: { color: "rgba(255,255,255,0.82)", fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular", marginTop: 8 },
  heroTipBox: {
    marginTop: 14,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
  },
  heroTipText: { color: "white", fontSize: 13, lineHeight: 18, fontFamily: "Inter_500Medium", flex: 1 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", paddingHorizontal: 20, marginBottom: 12 },
  modeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 20, marginBottom: 22 },
  modeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  modeChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  suggestionCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  suggestionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 2 },
  suggestionDetail: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
  checklistCard: {
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  checkText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
});