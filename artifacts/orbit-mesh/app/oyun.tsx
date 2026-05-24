import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  ScrollView, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";

const QUESTIONS = [
  { q: "Dünya'dan en yakın yıldız hangisidir?", opts: ["Proxima Centauri", "Sirius", "Polaris", "Vega"], ans: 0, fact: "Proxima Centauri, Güneş'e en yakın yıldızdır. 4.24 ışık yılı uzaklıktadır." },
  { q: "Güneş Sistemi'nin en büyük gezegeni hangisidir?", opts: ["Satürn", "Jüpiter", "Uranüs", "Neptün"], ans: 1, fact: "Jüpiter o kadar büyüktür ki diğer tüm gezegenler içine sığabilir!" },
  { q: "Ay'da ilk adımı atan astronot kimdir?", opts: ["Buzz Aldrin", "Yuri Gagarin", "Neil Armstrong", "Alan Shepard"], ans: 2, fact: "Neil Armstrong 21 Temmuz 1969'da Ay'a adım atan ilk insan oldu." },
  { q: "Hangi gezegen 'Kızıl Gezegen' olarak bilinir?", opts: ["Venüs", "Jüpiter", "Merkür", "Mars"], ans: 3, fact: "Mars yüzeyindeki demir oksit (pas) nedeniyle kırmızı görünür." },
  { q: "Evren kaç yaşındadır?", opts: ["4.5 milyar yıl", "13.8 milyar yıl", "100 milyar yıl", "1 milyar yıl"], ans: 1, fact: "Evren Büyük Patlama ile 13.8 milyar yıl önce oluştu." },
  { q: "Aşağıdakilerden hangisi bir takımyıldızıdır?", opts: ["Andromeda", "Cassini", "Voyager", "Hubble"], ans: 0, fact: "Andromeda hem bir takımyıldızı hem de komşu galaksimizin adıdır." },
  { q: "Işığın saniyedeki hızı yaklaşık kaçtır?", opts: ["300.000 km", "150.000 km", "500.000 km", "30.000 km"], ans: 0, fact: "Işık saniyede yaklaşık 300.000 km yol alır — kıyaslanamaz bir hız!" },
  { q: "Satürn'ün halkalarının ana bileşeni nedir?", opts: ["Toz", "Gaz", "Buz ve kaya", "Metal"], ans: 2, fact: "Satürn'ün halkaları çoğunlukla buz parçacıkları ve kaya kırıntılarından oluşur." },
  { q: "Hangi ülke ilk uyduyu uzaya gönderdi?", opts: ["ABD", "Çin", "SSCB", "Türkiye"], ans: 2, fact: "Sovyetler Birliği 1957'de Sputnik 1'i fırlatarak uzay çağını başlattı." },
  { q: "Güneş'in çapı Dünya'nın çapından kaç kat büyüktür?", opts: ["10 kat", "50 kat", "109 kat", "500 kat"], ans: 2, fact: "Güneş'in çapı yaklaşık 1.4 milyon km olup Dünya'nın 109 katıdır." },
  { q: "'Büyük Ayı' diye bilinen takımyıldızının Türkçe adı nedir?", opts: ["Orion", "Büyük Ayı", "Cassiopeia", "Pegasus"], ans: 1, fact: "Büyük Ayı (Ursa Major), içindeki 7 parlak yıldızla Büyük Kepçe'yi oluşturur." },
  { q: "Neptün gezegeni kaç yılda bir Güneş'in etrafını dolaşır?", opts: ["84 yıl", "29 yıl", "165 yıl", "248 yıl"], ans: 2, fact: "Neptün'ün yörüngesi o kadar uzundur ki 1846'da keşfedildiğinden beri sadece bir kez tamamlandı!" },
  { q: "Karadelikler neyin çökmesiyle oluşur?", opts: ["Gezegen çökmesi", "Dev yıldız çökmesi", "Galaksi çarpışması", "Meteroit çarpması"], ans: 1, fact: "Dev yıldızlar yaşamlarının sonunda çökerek karadeliklere dönüşebilir." },
  { q: "Hubble Uzay Teleskobu hangi yıl fırlatıldı?", opts: ["1990", "1985", "2000", "1975"], ans: 0, fact: "Hubble 1990'dan bu yana 1,5 milyonu aşkın gözlem gerçekleştirdi." },
  { q: "Hangi gezegen Güneş'e en yakındır?", opts: ["Venüs", "Mars", "Dünya", "Merkür"], ans: 3, fact: "Merkür yüzey sıcaklığı günde 430°C, gecede -180°C arasında değişir." },
  { q: "Samanyolu galaksisinin şekli nasıldır?", opts: ["Eliptik", "Düzensiz", "Sarmal", "Küresel"], ans: 2, fact: "Samanyolu, merkezinde bir çubuk bulunan çubuklu sarmal tipi bir galaksidir." },
  { q: "Uluslararası Uzay İstasyonu kaç km yükseklikte yörüngedededir?", opts: ["200 km", "400 km", "800 km", "1600 km"], ans: 1, fact: "ISS günde yaklaşık 16 kez Dünya'nın etrafını dolaşır." },
  { q: "Türkiye'nin ilk uzay yolcusu kimdir?", opts: ["Hasan Doğan", "Alper Gezeravcı", "Kerem Aydın", "Selçuk Bayraktar"], ans: 1, fact: "Alper Gezeravcı, 19 Ocak 2024'te ISS'e giderek Türkiye'nin ilk uzay yolcusu oldu." },
  { q: "Güneş'ten Dünya'ya ışığın ulaşması kaç dakika sürer?", opts: ["4 dakika", "8 dakika", "15 dakika", "30 dakika"], ans: 1, fact: "Güneş ışığı Dünya'ya yaklaşık 8 dakika 20 saniyede ulaşır." },
  { q: "Venüs hangi özelliğiyle bilinir?", opts: ["En büyük gezegen", "En yavaş dönen gezegen", "Halkası olan tek gezegen", "En soğuk gezegen"], ans: 1, fact: "Venüs o kadar yavaş döner ki bir Venüs günü, bir Venüs yılından daha uzundur!" },
];

type GameState = "menu" | "playing" | "result" | "fact";

const QUESTION_TIME = 15;
const TOTAL_QUESTIONS = 10;

export default function OyunScreen() {
  const insets = useSafeAreaInsets();
  const [gameState, setGameState] = useState<GameState>("menu");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<typeof QUESTIONS>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [highScore, setHighScore] = useState(0);
  const [currentFact, setCurrentFact] = useState("");
  const [isCorrect, setIsCorrect] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const barAnim = useRef(new Animated.Value(1)).current;
  const scoreAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AsyncStorage.getItem("orbit_game_highscore").then(s => {
      if (s) setHighScore(parseInt(s));
    });
  }, []);

  const shuffleQuestions = () => {
    const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5).slice(0, TOTAL_QUESTIONS);
    setQuestions(shuffled);
  };

  const startGame = () => {
    shuffleQuestions();
    setScore(0);
    setLives(3);
    setCombo(0);
    setQuestionIndex(0);
    setSelected(null);
    setTimeLeft(QUESTION_TIME);
    setGameState("playing");
  };

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    Animated.timing(barAnim, { toValue: 0, duration: QUESTION_TIME * 1000, useNativeDriver: false }).start();
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    barAnim.stopAnimation();
  };

  useEffect(() => {
    if (gameState === "playing") {
      barAnim.setValue(1);
      setTimeLeft(QUESTION_TIME);
      startTimer();
    }
    return stopTimer;
  }, [gameState, questionIndex]);

  const handleTimeout = () => {
    stopTimer();
    const q = questions[questionIndex]!;
    setSelected(-1);
    setIsCorrect(false);
    setCombo(0);
    const newLives = lives - 1;
    setLives(newLives);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setCurrentFact(q.fact);
    setGameState("fact");
    if (newLives <= 0) {
      setTimeout(() => endGame(), 2000);
    }
  };

  const handleAnswer = (idx: number) => {
    if (selected !== null || gameState !== "playing") return;
    stopTimer();
    setSelected(idx);
    const q = questions[questionIndex]!;
    const correct = idx === q.ans;
    setIsCorrect(correct);

    if (correct) {
      const newCombo = combo + 1;
      setCombo(newCombo);
      const points = 10 + (newCombo > 1 ? newCombo * 3 : 0) + Math.ceil(timeLeft * 0.5);
      setScore(prev => prev + points);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.sequence([
        Animated.timing(scoreAnim, { toValue: 1.3, duration: 150, useNativeDriver: true }),
        Animated.timing(scoreAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    } else {
      setCombo(0);
      const newLives = lives - 1;
      setLives(newLives);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
      if (newLives <= 0) {
        setCurrentFact(q.fact);
        setGameState("fact");
        setTimeout(() => endGame(), 2500);
        return;
      }
    }
    setCurrentFact(q.fact);
    setTimeout(() => setGameState("fact"), 500);
  };

  const nextQuestion = () => {
    const nextIdx = questionIndex + 1;
    if (nextIdx >= TOTAL_QUESTIONS || lives <= 0) {
      endGame();
      return;
    }
    setSelected(null);
    setQuestionIndex(nextIdx);
    setGameState("playing");
  };

  const endGame = async () => {
    const finalScore = score;
    if (finalScore > highScore) {
      await AsyncStorage.setItem("orbit_game_highscore", String(finalScore));
      setHighScore(finalScore);
    }
    setGameState("result");
  };

  const q = questions[questionIndex];
  const barColor = barAnim.interpolate({ inputRange: [0, 0.3, 1], outputRange: ["#ff3b5c", "#ff9500", "#00d4ff"] });

  if (gameState === "menu") {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={styles.menuScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.menuHeader}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="arrow-left" size={22} color="#00d4ff" />
            </TouchableOpacity>
          </View>
          <View style={styles.menuLogo}>
            <LinearGradient colors={["#00d4ff" + "30", "#a855f7" + "20"]} style={styles.menuLogoGrad}>
              <Feather name="star" size={52} color="#ff9500" />
            </LinearGradient>
            <Text style={styles.menuTitle}>Galaksi Ustası</Text>
            <Text style={styles.menuSub}>Uzay bilgini test et, galaksiyi keşfet!</Text>
          </View>
          <View style={styles.menuStats}>
            <View style={styles.menuStatCard}>
              <Feather name="award" size={20} color="#ff9500" />
              <Text style={styles.menuStatNum}>{highScore}</Text>
              <Text style={styles.menuStatLabel}>En Yüksek</Text>
            </View>
            <View style={styles.menuStatCard}>
              <Feather name="help-circle" size={20} color="#00d4ff" />
              <Text style={styles.menuStatNum}>{QUESTIONS.length}</Text>
              <Text style={styles.menuStatLabel}>Soru</Text>
            </View>
            <View style={styles.menuStatCard}>
              <Feather name="zap" size={20} color="#a855f7" />
              <Text style={styles.menuStatNum}>×3</Text>
              <Text style={styles.menuStatLabel}>Combo</Text>
            </View>
          </View>
          <View style={styles.rulesCard}>
            {[
              "Her soru için 15 saniye",
              "Süre kalan her saniye +0.5 puan",
              "Combo serisi yakalayınca bonus puan",
              "3 yanlış cevap → oyun biter",
              "Her sorudan sonra uzay bilgisi öğren!",
            ].map((rule, i) => (
              <View key={i} style={styles.ruleRow}>
                <View style={styles.ruleDot} />
                <Text style={styles.ruleText}>{rule}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.startBtn} onPress={startGame} activeOpacity={0.85}>
            <LinearGradient colors={["#00d4ff", "#0099bb"]} style={styles.startBtnGrad}>
              <Feather name="play" size={22} color="#0a0e1a" />
              <Text style={styles.startBtnText}>Oyunu Başlat</Text>
            </LinearGradient>
          </TouchableOpacity>
          <View style={{ height: 40 + insets.bottom }} />
        </ScrollView>
      </View>
    );
  }

  if (gameState === "result") {
    const stars = score >= 150 ? 3 : score >= 80 ? 2 : 1;
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: "center" }]}>
        <View style={styles.resultCard}>
          <View style={styles.starsRow}>
            {[1, 2, 3].map(i => (
              <Feather key={i} name="star" size={36} color={i <= stars ? "#ff9500" : "#1e2a3d"} />
            ))}
          </View>
          <Text style={styles.resultTitle}>
            {stars === 3 ? "Mükemmel! Galaksi Ustası!" : stars === 2 ? "Harika! Yıldız Gözlemcisi!" : "Devam Et! Astro Yolculuk!"}
          </Text>
          <View style={styles.resultScoreWrap}>
            <Animated.Text style={[styles.resultScore, { transform: [{ scale: scoreAnim }] }]}>{score}</Animated.Text>
            <Text style={styles.resultScoreLabel}>puan</Text>
          </View>
          {score > highScore && (
            <View style={styles.newHighScore}>
              <Feather name="award" size={16} color="#ff9500" />
              <Text style={styles.newHighScoreText}>Yeni Rekor!</Text>
            </View>
          )}
          <View style={styles.resultStats}>
            <View style={styles.resultStatItem}>
              <Text style={styles.resultStatNum}>{TOTAL_QUESTIONS - (3 - Math.max(0, lives))}</Text>
              <Text style={styles.resultStatLabel}>Soru</Text>
            </View>
            <View style={styles.resultStatItem}>
              <Text style={[styles.resultStatNum, { color: "#00ff88" }]}>{Math.max(0, lives)}</Text>
              <Text style={styles.resultStatLabel}>Can</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.playAgainBtn} onPress={startGame} activeOpacity={0.8}>
            <Feather name="refresh-cw" size={18} color="#0a0e1a" />
            <Text style={styles.playAgainBtnText}>Tekrar Oyna</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuBtn} onPress={() => setGameState("menu")} activeOpacity={0.8}>
            <Text style={styles.menuBtnText}>Ana Menü</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (gameState === "fact" && q) {
    const wasCorrect = selected === q.ans;
    return (
      <View style={[styles.container, styles.factContainer, { paddingTop: insets.top }]}>
        <View style={[styles.factCard, { borderColor: wasCorrect ? "#00ff88" : "#ff3b5c" }]}>
          <View style={[styles.factIcon, { backgroundColor: wasCorrect ? "#00ff88" + "20" : "#ff3b5c" + "20" }]}>
            <Feather name={wasCorrect ? "check-circle" : "x-circle"} size={40} color={wasCorrect ? "#00ff88" : "#ff3b5c"} />
          </View>
          <Text style={[styles.factResult, { color: wasCorrect ? "#00ff88" : "#ff3b5c" }]}>
            {wasCorrect ? "Doğru!" : selected === -1 ? "Süre Doldu!" : "Yanlış!"}
          </Text>
          {!wasCorrect && selected !== -1 && (
            <Text style={styles.correctAnswerText}>
              Doğru cevap: <Text style={{ color: "#00ff88" }}>{q.opts[q.ans]}</Text>
            </Text>
          )}
          <View style={styles.factBox}>
            <Feather name="book-open" size={16} color="#00d4ff" />
            <Text style={styles.factText}>{currentFact}</Text>
          </View>
          {combo > 1 && wasCorrect && (
            <View style={styles.comboBadge}>
              <Feather name="zap" size={14} color="#ff9500" />
              <Text style={styles.comboText}>{combo}x Combo Serisi!</Text>
            </View>
          )}
          <View style={styles.factProgress}>
            <Text style={styles.factProgressText}>{questionIndex + 1} / {TOTAL_QUESTIONS}</Text>
            <View style={styles.livesRow}>
              {[1, 2, 3].map(i => (
                <Feather key={i} name="heart" size={18} color={i <= lives ? "#ff3b5c" : "#1e2a3d"} />
              ))}
            </View>
          </View>
          <TouchableOpacity style={[styles.nextBtn, { backgroundColor: wasCorrect ? "#00d4ff" : "#374151" }]} onPress={nextQuestion} activeOpacity={0.8}>
            <Text style={styles.nextBtnText}>
              {questionIndex + 1 >= TOTAL_QUESTIONS || lives <= 0 ? "Sonuçları Gör" : "Sonraki Soru"}
            </Text>
            <Feather name="arrow-right" size={18} color={wasCorrect ? "#0a0e1a" : "#ffffff"} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!q) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.gameHeader}>
        <View style={styles.livesRow}>
          {[1, 2, 3].map(i => (
            <Feather key={i} name="heart" size={18} color={i <= lives ? "#ff3b5c" : "#1e2a3d"} />
          ))}
        </View>
        <Animated.Text style={[styles.scoreDisplay, { transform: [{ scale: scoreAnim }] }]}>
          {score} <Text style={styles.scoreDisplaySub}>puan</Text>
        </Animated.Text>
        <Text style={styles.questionCounter}>{questionIndex + 1}/{TOTAL_QUESTIONS}</Text>
      </View>

      <View style={styles.timerWrap}>
        <Animated.View style={[styles.timerBar, { width: barAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] as unknown as [number, number] }), backgroundColor: barColor }]} />
        <Text style={[styles.timerNum, { color: timeLeft <= 5 ? "#ff3b5c" : "#00d4ff" }]}>{timeLeft}s</Text>
      </View>

      <Animated.View style={[styles.questionCard, { transform: [{ translateX: shakeAnim }] }]}>
        <Text style={styles.questionText}>{q.q}</Text>
      </Animated.View>

      {combo > 1 && (
        <View style={styles.comboIndicator}>
          <Feather name="zap" size={12} color="#ff9500" />
          <Text style={styles.comboIndicatorText}>{combo}x Combo!</Text>
        </View>
      )}

      <View style={styles.optionsGrid}>
        {q.opts.map((opt, i) => {
          const isSelected = selected === i;
          const isAnswer = i === q.ans;
          const showResult = selected !== null;
          const bg = !showResult ? "#111827" :
            isAnswer ? "#00ff88" + "30" :
            isSelected ? "#ff3b5c" + "30" : "#111827";
          const borderColor = !showResult ? "#1e2a3d" :
            isAnswer ? "#00ff88" :
            isSelected ? "#ff3b5c" : "#1e2a3d";

          return (
            <TouchableOpacity
              key={i}
              style={[styles.optionBtn, { backgroundColor: bg, borderColor }]}
              onPress={() => handleAnswer(i)}
              disabled={selected !== null}
              activeOpacity={0.8}
            >
              <View style={styles.optionLeft}>
                <Text style={styles.optionLetter}>{["A", "B", "C", "D"][i]}</Text>
              </View>
              <Text style={styles.optionText}>{opt}</Text>
              {showResult && isAnswer && <Feather name="check" size={16} color="#00ff88" />}
              {showResult && isSelected && !isAnswer && <Feather name="x" size={16} color="#ff3b5c" />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0e1a" },
  menuScroll: { padding: 20 },
  menuHeader: { marginBottom: 8 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  menuLogo: { alignItems: "center", gap: 12, marginBottom: 32 },
  menuLogoGrad: { width: 100, height: 100, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  menuTitle: { fontSize: 30, fontWeight: "900", color: "#ffffff", fontFamily: "Inter_700Bold" },
  menuSub: { color: "#64748b", fontFamily: "Inter_400Regular", textAlign: "center" },
  menuStats: { flexDirection: "row", gap: 12, marginBottom: 24 },
  menuStatCard: { flex: 1, backgroundColor: "#111827", borderRadius: 14, padding: 14, alignItems: "center", gap: 6, borderWidth: 1, borderColor: "#1e2a3d" },
  menuStatNum: { fontSize: 22, fontWeight: "800", color: "#ffffff", fontFamily: "Inter_700Bold" },
  menuStatLabel: { fontSize: 11, color: "#64748b", fontFamily: "Inter_400Regular" },
  rulesCard: { backgroundColor: "#111827", borderRadius: 16, padding: 16, gap: 10, marginBottom: 24, borderWidth: 1, borderColor: "#1e2a3d" },
  ruleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  ruleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#00d4ff", flexShrink: 0 },
  ruleText: { color: "#94a3b8", fontFamily: "Inter_400Regular", fontSize: 14 },
  startBtn: { borderRadius: 16, overflow: "hidden" },
  startBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, padding: 20 },
  startBtnText: { color: "#0a0e1a", fontWeight: "900", fontSize: 18, fontFamily: "Inter_700Bold" },
  resultCard: { margin: 24, backgroundColor: "#111827", borderRadius: 24, padding: 28, borderWidth: 1, borderColor: "#1e2a3d", alignItems: "center", gap: 16 },
  starsRow: { flexDirection: "row", gap: 12 },
  resultTitle: { fontSize: 18, fontWeight: "800", color: "#ffffff", fontFamily: "Inter_700Bold", textAlign: "center" },
  resultScoreWrap: { alignItems: "center" },
  resultScore: { fontSize: 64, fontWeight: "900", color: "#00d4ff", fontFamily: "Inter_700Bold" },
  resultScoreLabel: { fontSize: 14, color: "#64748b", fontFamily: "Inter_400Regular" },
  newHighScore: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#ff9500" + "20", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12 },
  newHighScoreText: { color: "#ff9500", fontFamily: "Inter_700Bold", fontWeight: "700" },
  resultStats: { flexDirection: "row", gap: 24 },
  resultStatItem: { alignItems: "center" },
  resultStatNum: { fontSize: 28, fontWeight: "800", color: "#ffffff", fontFamily: "Inter_700Bold" },
  resultStatLabel: { fontSize: 12, color: "#64748b", fontFamily: "Inter_400Regular" },
  playAgainBtn: { width: "100%", backgroundColor: "#00d4ff", borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  playAgainBtnText: { color: "#0a0e1a", fontWeight: "800", fontSize: 16, fontFamily: "Inter_700Bold" },
  menuBtn: { padding: 12 },
  menuBtnText: { color: "#64748b", fontFamily: "Inter_500Medium" },
  factContainer: { justifyContent: "center", padding: 20 },
  factCard: { backgroundColor: "#111827", borderRadius: 24, padding: 24, borderWidth: 2, alignItems: "center", gap: 14 },
  factIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  factResult: { fontSize: 24, fontWeight: "900", fontFamily: "Inter_700Bold" },
  correctAnswerText: { color: "#94a3b8", fontFamily: "Inter_400Regular", textAlign: "center" },
  factBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#00d4ff" + "10", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#00d4ff" + "30" },
  factText: { flex: 1, color: "#e2e8f0", fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular" },
  comboBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#ff9500" + "20", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12 },
  comboText: { color: "#ff9500", fontFamily: "Inter_700Bold" },
  factProgress: { width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  factProgressText: { color: "#64748b", fontFamily: "Inter_400Regular" },
  livesRow: { flexDirection: "row", gap: 4 },
  nextBtn: { width: "100%", borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  nextBtnText: { fontWeight: "800", fontSize: 15, fontFamily: "Inter_700Bold", color: "#0a0e1a" },
  gameHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, paddingBottom: 8 },
  scoreDisplay: { fontSize: 22, fontWeight: "900", color: "#00d4ff", fontFamily: "Inter_700Bold" },
  scoreDisplaySub: { fontSize: 14, color: "#64748b" },
  questionCounter: { color: "#64748b", fontFamily: "Inter_500Medium" },
  timerWrap: { height: 6, backgroundColor: "#1e2a3d", marginHorizontal: 0, flexDirection: "row", alignItems: "center" },
  timerBar: { height: 6 },
  timerNum: { position: "absolute", right: 8, fontSize: 11, fontFamily: "Inter_700Bold" },
  questionCard: { margin: 16, backgroundColor: "#111827", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#1e2a3d", minHeight: 100, justifyContent: "center" },
  questionText: { fontSize: 18, fontWeight: "700", color: "#ffffff", fontFamily: "Inter_700Bold", lineHeight: 26, textAlign: "center" },
  comboIndicator: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 4 },
  comboIndicatorText: { color: "#ff9500", fontSize: 12, fontFamily: "Inter_700Bold" },
  optionsGrid: { paddingHorizontal: 16, gap: 10 },
  optionBtn: { borderRadius: 14, padding: 16, borderWidth: 2, flexDirection: "row", alignItems: "center", gap: 12 },
  optionLeft: { width: 28, height: 28, borderRadius: 8, backgroundColor: "#1e2a3d", alignItems: "center", justifyContent: "center" },
  optionLetter: { color: "#64748b", fontFamily: "Inter_700Bold", fontSize: 12 },
  optionText: { flex: 1, color: "#e2e8f0", fontFamily: "Inter_500Medium", fontSize: 15 },
});
