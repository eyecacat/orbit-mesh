import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { BACKEND_URL } from "@/lib/env";

interface ApodData {
  date: string;
  title: string;
  explanation: string;
  url: string;
  media_type: "image" | "video";
}

export default function ApodScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [data, setData] = useState<ApodData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [translated, setTranslated] = useState<string>("");
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    void fetchApod();
  }, []);

  async function fetchApod() {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/apod`);
      if (!res.ok) throw new Error("APOD alinamadi");
      const json = await res.json();
      setData(json);
      setError(false);
      if (json?.explanation) {
        void translateExplanation(json.explanation);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  async function translateExplanation(text: string) {
    setTranslating(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/openrouter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "Ortaokul öğrencisinin anlayacaği açık, doğal Türkçe ile aşağıdaki NASA astronomi açıklamasını çevir. Teknik terimleri yalın tut. SADECE çeviriyi döndür, başka açıklama ekleme.",
            },
            { role: "user", content: text.slice(0, 1200) },
          ],
          temperature: 0.2,
        }),
      });
      if (!res.ok) throw new Error("Çeviri başarısız");
      const json = await res.json();
      const content = json?.choices?.[0]?.message?.content || "";
      setTranslated(content.trim() || text);
    } catch {
      setTranslated(text);
    } finally {
      setTranslating(false);
    }
  }

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
          <Text style={[styles.title, { color: colors.foreground }]}>Günün Astronomi Fotoğrafı</Text>
          <View style={{ width: 32 }} />
        </View>

        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          NASA APOD – her gün bir uzay görseli ve bilimsel açıklaması.
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 40 }} />
        ) : error || !data ? (
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
            APOD verisi alınamadı.
          </Text>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {data.media_type === "image" && data.url ? (
              <Image source={{ uri: data.url }} style={styles.image} resizeMode="cover" />
            ) : (
              <View style={[styles.videoPlaceholder, { backgroundColor: colors.border }]}>
                <Feather name="film" size={32} color={colors.primary} />
                <Text style={{ color: colors.mutedForeground, marginTop: 8 }}>Video içeriği</Text>
              </View>
            )}
            <Text style={[styles.date, { color: colors.mutedForeground }]}>{data.date}</Text>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{data.title}</Text>
            {translating ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
            ) : (
              <Text style={[styles.explanation, { color: colors.mutedForeground }]}>
                {translated || data.explanation}
              </Text>
            )}
          </View>
        )}
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
    overflow: "hidden",
  },
  image: { width: "100%", height: 220, borderRadius: 12, marginBottom: 12 },
  videoPlaceholder: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  date: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 4 },
  cardTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 12 },
  explanation: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 40,
    paddingHorizontal: 20,
  },
});
