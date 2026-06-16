import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { QUIZ_QUESTIONS, QuizQuestion, shuffleQuestions } from "@/data/quizData";

const TIME_PER_QUESTION = 20;

export default function QuizOynaScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [questions] = useState<QuizQuestion[]>(() => shuffleQuestions(QUIZ_QUESTIONS));
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [finished, setFinished] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressAnim = useRef(new Animated.Value(1)).current;

  const q = questions[current];

  const goNext = useCallback(() => {
    if (current + 1 >= questions.length) {
      setFinished(true);
      const finalScore = score;
      updateUser({
        quizScore: Math.max(user?.quizScore ?? 0, finalScore * 2),
        quizAttempts: (user?.quizAttempts ?? 0) + 1,
      });
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setAnswered(false);
      setTimeLeft(TIME_PER_QUESTION);
      progressAnim.setValue(1);
      Animated.timing(progressAnim, { toValue: 0, duration: TIME_PER_QUESTION * 1000, useNativeDriver: false }).start();
    }
  }, [current, score, questions.length]);

  useEffect(() => {
    progressAnim.setValue(1);
    Animated.timing(progressAnim, { toValue: 0, duration: TIME_PER_QUESTION * 1000, useNativeDriver: false }).start();
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          if (!answered) {
            setAnswered(true);
            setSelected(-1);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setTimeout(goNext, 1500);
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [current]);

  function handleAnswer(idx: number) {
    if (answered) return;
    clearInterval(timerRef.current!);
    setSelected(idx);
    setAnswered(true);
    if (idx === q.correct) {
      setScore(s => s + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setTimeout(goNext, 1200);
  }

  function getOptionStyle(idx: number) {
    if (!answered) return { backgroundColor: colors.card, borderColor: colors.border };
    if (idx === q.correct) return { backgroundColor: colors.accent + "33", borderColor: colors.accent };
    if (idx === selected && idx !== q.correct) return { backgroundColor: colors.danger + "33", borderColor: colors.danger };
    return { backgroundColor: colors.card, borderColor: colors.border };
  }

  function getOptionTextColor(idx: number) {
    if (!answered) return colors.foreground;
    if (idx === q.correct) return colors.accent;
    if (idx === selected && idx !== q.correct) return colors.danger;
    return colors.mutedForeground;
  }

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad + 20 }]}>
        <View style={styles.resultContainer}>
          <View style={[styles.resultCircle, { borderColor: pct >= 70 ? colors.accent : pct >= 40 ? colors.warning : colors.danger }]}>
            <Text style={[styles.resultPct, { color: pct >= 70 ? colors.accent : pct >= 40 ? colors.warning : colors.danger }]}>{pct}%</Text>
            <Text style={[styles.resultLabel, { color: colors.mutedForeground }]}>Başarı</Text>
          </View>
          <Text style={[styles.resultScore, { color: colors.foreground }]}>{score} / {questions.length} Doğru</Text>
          <Text style={[styles.resultPts, { color: colors.warning }]}>+{score * 2} Puan kazandın!</Text>
          <Text style={[styles.resultComment, { color: colors.mutedForeground }]}>
            {pct >= 80 ? "Mükemmel! Astronomi bilgin çok güçlü." : pct >= 60 ? "İyi iş! Biraz daha çalışabilirsin." : "Devam et, pratik mükemmelleştirir."}
          </Text>
          <Pressable style={[styles.replayBtn, { backgroundColor: colors.primary }]} onPress={() => router.replace("/quiz/oyna")}>
            <Feather name="refresh-cw" size={18} color={colors.background} />
            <Text style={[styles.replayText, { color: colors.background }]}>Tekrar Oyna</Text>
          </Pressable>
          <Pressable style={[styles.leaderBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => { router.replace("/quiz"); setTimeout(() => router.push("/liderlik"), 100); }}>
            <Feather name="trending-up" size={18} color={colors.warning} />
            <Text style={[styles.leaderText, { color: colors.warning }]}>Liderlik Tablosu</Text>
          </Pressable>
          <Pressable style={[styles.homeBtn]} onPress={() => router.push("/quiz")}>
            <Text style={[styles.homeText, { color: colors.mutedForeground }]}>Quiz Menüsüne Dön</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const timerColor = timeLeft <= 5 ? colors.danger : timeLeft <= 10 ? colors.warning : colors.primary;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => Alert.alert("Quiz'den Çık", "İlerleme kaydedilmeyecek.", [{ text: "İptal" }, { text: "Çık", onPress: () => router.push("/quiz") }])} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Feather name="x" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.progress, { color: colors.mutedForeground }]}>{current + 1} / {questions.length}</Text>
        <View style={[styles.timerBox, { borderColor: timerColor }]}>
          <Text style={[styles.timerText, { color: timerColor }]}>{timeLeft}s</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
        <Animated.View style={[styles.progressFill, { backgroundColor: colors.primary, width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
      </View>

      {/* Score */}
      <View style={styles.scoreRow}>
        <Feather name="star" size={14} color={colors.warning} />
        <Text style={[styles.scoreText, { color: colors.warning }]}>{score} puan</Text>
        <View style={[styles.categoryBadge, { backgroundColor: colors.primary + "22" }]}>
          <Text style={[styles.categoryText, { color: colors.primary }]}>{q.category}</Text>
        </View>
      </View>

      {/* Question */}
      <View style={styles.questionBox}>
        <Text style={[styles.questionText, { color: colors.foreground }]}>{q.question}</Text>
      </View>

      {/* Options */}
      <View style={styles.options}>
        {q.options.map((opt, idx) => (
          <Pressable
            key={idx}
            style={({ pressed }) => [styles.option, getOptionStyle(idx), { opacity: pressed && !answered ? 0.8 : 1 }]}
            onPress={() => handleAnswer(idx)}
            disabled={answered}
          >
            <View style={[styles.optionLetter, { backgroundColor: colors.muted }]}>
              <Text style={[styles.optionLetterText, { color: colors.mutedForeground }]}>{["A", "B", "C", "D"][idx]}</Text>
            </View>
            <Text style={[styles.optionText, { color: getOptionTextColor(idx) }]}>{opt}</Text>
            {answered && idx === q.correct && <Feather name="check-circle" size={18} color={colors.accent} />}
            {answered && idx === selected && idx !== q.correct && <Feather name="x-circle" size={18} color={colors.danger} />}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  progress: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  timerBox: { borderRadius: 10, borderWidth: 2, paddingHorizontal: 10, paddingVertical: 4 },
  timerText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  progressBar: { height: 4, marginHorizontal: 16, borderRadius: 2, marginBottom: 12 },
  progressFill: { height: 4, borderRadius: 2 },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, marginBottom: 20 },
  scoreText: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  categoryText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  questionBox: { paddingHorizontal: 20, marginBottom: 28 },
  questionText: { fontSize: 20, fontFamily: "Inter_700Bold", lineHeight: 30 },
  options: { paddingHorizontal: 16, gap: 12 },
  option: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1.5, padding: 14, gap: 12 },
  optionLetter: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  optionLetterText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  optionText: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  resultContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  resultCircle: { width: 130, height: 130, borderRadius: 65, borderWidth: 4, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  resultPct: { fontSize: 36, fontFamily: "Inter_700Bold" },
  resultLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  resultScore: { fontSize: 22, fontFamily: "Inter_700Bold" },
  resultPts: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  resultComment: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  replayBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  replayText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  leaderBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  leaderText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  homeBtn: { padding: 12 },
  homeText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
