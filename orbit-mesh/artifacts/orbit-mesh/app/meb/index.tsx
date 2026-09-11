import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface LessonModule {
  id: string;
  grade: string;
  title: string;
  objective: string;
  activity: string;
  orbitMeshLink: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
}

const MEB_MODULES: LessonModule[] = [
  {
    id: "gunes-sistemi",
    grade: "5. Sınıf",
    title: "Güneş Sistemi ve Gezegenler",
    objective: "Güneş Sistemindeki gezegenlerin özelliklerini sıralar.",
    activity: "Atlas modülünde gezegenleri incele; quiz ile pekiştir.",
    orbitMeshLink: "Güneş patlamaları ve uzay havası verisiyle gezegen atmosferleri arasındaki ilişkiyi tartış.",
    icon: "globe",
    color: "#4CC9F0",
  },
  {
    id: "dunya-uzay",
    grade: "6. Sınıf",
    title: "Dünya ve Uzay",
    objective: "Dünya'nın uzaydaki konumunu ve hareketlerini açıklar.",
    activity: "HELIO modülünde Güneş-Dünya ilişkisini ve mevsimleri gözlemle.",
    orbitMeshLink: "VLF verisiyle gece-gündüz sinyal farkını karşılaştır; Dünya'nın dönüşünü yorumla.",
    icon: "sun",
    color: "#FFA500",
  },
  {
    id: "yildizlar-galaksiler",
    grade: "7. Sınıf",
    title: "Yıldızlar ve Galaksiler",
    objective: "Yıldızların, galaksilerin ve evren yapılarının temel özelliklerini tanır.",
    activity: "Gökyüzü Atlası'nda yıldız haritalarını keşfet.",
    orbitMeshLink: "Türk uyduları (GÖKTÜRK-1, RASAT) ile uzaydan Dünya gözleminin nasıl yapıldığını incele.",
    icon: "star",
    color: "#8B5CF6",
  },
  {
    id: "uzay-arastirmalari",
    grade: "8. Sınıf",
    title: "Uzay Araştırmaları ve Teknolojiler",
    objective: "Uzay araştırmalarının amacını ve kullanılan teknolojileri belirler.",
    activity: "Uzay Görevleri modülünde Apollo, Voyager ve Webb görevlerini karşılaştır.",
    orbitMeshLink: "Deneyap Kart ile VLF gözlem düğümü kur; gerçek veri toplama sürecini deneyimle.",
    icon: "navigation",
    color: "#F97316",
  },
  {
    id: "uzay-havasi",
    grade: "Ortaokul",
    title: "Uzay Havası ve Teknolojik Etkiler",
    objective: "Güneş etkinliklerinin teknolojiye etkisini fark eder.",
    activity: "Uyarı merkezinde Kp indeksi ve güneş fırtınalarını takip et.",
    orbitMeshLink: "Anomali skoru ve mesh consensus verisini yorumla; uzay havası ile elektromanyetik sinyal ilişkisini kur.",
    icon: "activity",
    color: "#FF4560",
  },
  {
    id: "veri-bilimi",
    grade: "Ortaokul",
    title: "Bilimsel Gözlem ve Veri Okuryazarlığı",
    objective: "Veri toplama, grafikleştirme ve yorumlama becerisi kazanır.",
    activity: "BLE telemetri grafiğini incele; geçmiş verileri karşılaştır.",
    orbitMeshLink: "Okulunun VLF verisini CSV olarak indir; bir fen projesinde kullan.",
    icon: "bar-chart-2",
    color: "#00E5B0",
  },
];

export default function MebScreen() {
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
          <Text style={[styles.title, { color: colors.foreground }]}>MEB Astronomi Modülleri</Text>
          <View style={{ width: 32 }} />
        </View>

        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          5-8. sınıf Fen Bilimleri müfredat kazanımlarına uygun, ORBIT-MESH verisiyle işlenebilir
          ders modülleri.
        </Text>

        <View style={[styles.teacherCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.teacherHeader}>
            <View style={[styles.teacherIcon, { backgroundColor: colors.primary + "18" }]}>
              <Feather name="book-open" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.teacherTitle, { color: colors.foreground }]}>Öğretmenler İçin</Text>
              <Text style={[styles.teacherText, { color: colors.mutedForeground }]}>
                Her modül, bir ders saatinde kullanılabilecek kazanım, aktivite ve ORBIT-MESH
                bağlantısı içerir.
              </Text>
            </View>
          </View>
        </View>

        {MEB_MODULES.map(module => {
          const isOpen = expanded === module.id;
          return (
            <Pressable
              key={module.id}
              onPress={() => setExpanded(isOpen ? null : module.id)}
              style={({ pressed }) => [
                styles.moduleCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={styles.moduleTop}>
                <View style={[styles.moduleIcon, { backgroundColor: module.color + "18" }]}>
                  <Feather name={module.icon} size={20} color={module.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.moduleGrade, { color: module.color }]}>{module.grade}</Text>
                  <Text style={[styles.moduleTitle, { color: colors.foreground }]}>{module.title}</Text>
                </View>
                <Feather
                  name={isOpen ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={colors.mutedForeground}
                />
              </View>

              {isOpen ? (
                <View style={styles.moduleBody}>
                  <View style={styles.moduleSection}>
                    <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                      Kazanım
                    </Text>
                    <Text style={[styles.sectionText, { color: colors.foreground }]}>
                      {module.objective}
                    </Text>
                  </View>

                  <View style={styles.moduleSection}>
                    <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                      Önerilen Aktivite
                    </Text>
                    <Text style={[styles.sectionText, { color: colors.foreground }]}>
                      {module.activity}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.orbitLink,
                      { backgroundColor: module.color + "12", borderColor: module.color + "33" },
                    ]}
                  >
                    <Feather name="cpu" size={14} color={module.color} />
                    <Text style={[styles.orbitLinkText, { color: module.color }]}>
                      ORBIT-MESH bağlantısı: {module.orbitMeshLink}
                    </Text>
                  </View>
                </View>
              ) : null}
            </Pressable>
          );
        })}

        <View style={[styles.noteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
            Modüller, MEB Ortaokul Fen Bilimleri Öğretim Programı kazanımlarına göre
            hazırlanmıştır. Öğretmenler, dersleri canlı ORBIT-MESH verisi üzerinden işleyerek
            öğrencilerin aktif gözlem yapmasını sağlayabilir.
          </Text>
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
    marginBottom: 16,
  },
  teacherCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  teacherHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  teacherIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  teacherTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  teacherText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, marginTop: 2 },
  moduleCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  moduleTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  moduleIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  moduleGrade: { fontSize: 11, fontFamily: "Inter_700Bold" },
  moduleTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginTop: 2 },
  moduleBody: { marginTop: 14, gap: 12 },
  moduleSection: { gap: 4 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  sectionText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  orbitLink: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  orbitLinkText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 18 },
  noteCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 4,
  },
  noteText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, textAlign: "center" },
});
