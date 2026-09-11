export type DailyTask = {
  id: string;
  title: string;
  description: string;
  xp: number;
  icon: "sun" | "navigation" | "globe" | "book-open" | "star";
};

export const DAILY_TASKS: DailyTask[] = [
  {
    id: "read-jupiter",
    title: "Jüpiter'i incele",
    description: "Gökyüzü Atlası'nda Jüpiter kartını aç.",
    xp: 10,
    icon: "globe",
  },
  {
    id: "open-mission",
    title: "Bir görev oku",
    description: "Uzay Görevleri bölümünden bir görevi aç.",
    xp: 15,
    icon: "navigation",
  },
  {
    id: "view-solar",
    title: "Güneş raporuna bak",
    description: "HELIO bölümünde bugünün uzay havasını kontrol et.",
    xp: 5,
    icon: "sun",
  },
  {
    id: "take-quiz",
    title: "Mini quiz çöz",
    description: "En az 1 soru cevapla.",
    xp: 20,
    icon: "book-open",
  },
];