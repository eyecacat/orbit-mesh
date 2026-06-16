import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface Star {
  id: string;
  x: number;
  y: number;
  size: number;
  color: string;
  points: number;
  opacity: Animated.Value;
  anim: Animated.Value;
}

const STAR_COLORS = ["#FFD700", "#38C8FF", "#FF6B6B", "#00E5B0", "#8B5CF6", "#FFA500"];
const GAME_DURATION = 30;

export default function OyunScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [gameState, setGameState] = useState<"menu" | "playing" | "ended">("menu");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [stars, setStars] = useState<Star[]>([]);
  const [highScore, setHighScore] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const starTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function spawnStar() {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    const size = Math.random() * 24 + 20;
    const points = size < 30 ? 3 : size < 36 ? 2 : 1;
    const opacity = new Animated.Value(1);
    const anim = new Animated.Value(0);
    const newStar: Star = {
      id,
      x: Math.random() * 80 + 5,
      y: Math.random() * 60 + 10,
      size,
      color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
      points,
      opacity,
      anim,
    };
    Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
        setStars(s => s.filter(star => star.id !== id));
      });
    }, 2500 - timeLeft * 20);
    return newStar;
  }

  function startGame() {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setStars([]);
    setGameState("playing");
  }

  useEffect(() => {
    if (gameState !== "playing") return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          clearInterval(starTimerRef.current!);
          setGameState("ended");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    starTimerRef.current = setInterval(() => {
      setStars(s => [...s.slice(-15), spawnStar()]);
    }, 600);
    return () => {
      clearInterval(timerRef.current!);
      clearInterval(starTimerRef.current!);
    };
  }, [gameState]);

  function tapStar(star: Star) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(star.opacity, { toValue: 0, duration: 150, useNativeDriver: true }).start();
    setStars(s => s.filter(ss => ss.id !== star.id));
    setScore(sc => {
      const newSc = sc + star.points;
      if (newSc > highScore) setHighScore(newSc);
      return newSc;
    });
  }

  if (gameState === "menu") {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <Feather name="arrow-left" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Yıldız Avı</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.menuContent}>
          <Text style={styles.gameIcon}>✦</Text>
          <Text style={[styles.gameTitle, { color: colors.foreground }]}>Yıldız Avı</Text>
          <Text style={[styles.gameDesc, { color: colors.mutedForeground }]}>
            30 saniyede mümkün olduğunca çok yıldız yakala! Küçük yıldızlar daha çok puan verir.
          </Text>
          {highScore > 0 && (
            <View style={[styles.highScoreBox, { backgroundColor: colors.warning + "22", borderColor: colors.warning + "44" }]}>
              <Feather name="award" size={16} color={colors.warning} />
              <Text style={[styles.highScoreText, { color: colors.warning }]}>En İyi: {highScore}</Text>
            </View>
          )}
          <Pressable style={[styles.startBtn, { backgroundColor: colors.primary }]} onPress={startGame}>
            <Feather name="play" size={20} color={colors.background} />
            <Text style={[styles.startBtnText, { color: colors.background }]}>Oyna</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (gameState === "ended") {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={styles.menuContent}>
          <Text style={styles.gameIcon}>★</Text>
          <Text style={[styles.gameTitle, { color: colors.foreground }]}>Oyun Bitti!</Text>
          <Text style={[styles.finalScore, { color: colors.warning }]}>{score} Puan</Text>
          {score >= highScore && score > 0 && (
            <Text style={[styles.newRecord, { color: colors.accent }]}>Yeni Rekör!</Text>
          )}
          <Pressable style={[styles.startBtn, { backgroundColor: colors.primary }]} onPress={startGame}>
            <Feather name="refresh-cw" size={18} color={colors.background} />
            <Text style={[styles.startBtnText, { color: colors.background }]}>Tekrar</Text>
          </Pressable>
          <Pressable style={[styles.menuBtn, { borderColor: colors.border }]} onPress={() => setGameState("menu")}>
            <Text style={[styles.menuBtnText, { color: colors.mutedForeground }]}>Menüye Dön</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const timerColor = timeLeft <= 5 ? colors.danger : timeLeft <= 10 ? colors.warning : colors.primary;

  return (
    <View style={[styles.root, { backgroundColor: "#010810" }]}>
      {/* HUD */}
      <View style={[styles.hud, { paddingTop: topPad + 8 }]}>
        <View style={[styles.hudBox, { borderColor: colors.warning + "66" }]}>
          <Feather name="star" size={14} color={colors.warning} />
          <Text style={[styles.hudText, { color: colors.warning }]}>{score}</Text>
        </View>
        <View style={[styles.hudBox, { borderColor: timerColor + "66" }]}>
          <Feather name="clock" size={14} color={timerColor} />
          <Text style={[styles.hudText, { color: timerColor }]}>{timeLeft}s</Text>
        </View>
      </View>

      {/* Stars */}
      <View style={styles.gameArea}>
        {stars.map(star => (
          <Animated.View
            key={star.id}
            style={[
              styles.starWrapper,
              {
                left: `${star.x}%`,
                top: `${star.y}%`,
                opacity: star.opacity,
                transform: [{ scale: star.anim }],
              },
            ]}
          >
            <Pressable onPress={() => tapStar(star)} hitSlop={8}>
              <Text style={{ fontSize: star.size, color: star.color, textShadowColor: star.color, textShadowRadius: 10, textShadowOffset: { width: 0, height: 0 } }}>★</Text>
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  menuContent: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  gameIcon: { fontSize: 64, color: "#FFD700" },
  gameTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  gameDesc: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 24 },
  highScoreBox: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  highScoreText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  startBtn: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16, marginTop: 8 },
  startBtnText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  finalScore: { fontSize: 48, fontFamily: "Inter_700Bold" },
  newRecord: { fontSize: 18, fontFamily: "Inter_700Bold" },
  menuBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  menuBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  hud: { flexDirection: "row", justifyContent: "space-between", padding: 16 },
  hudBox: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  hudText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  gameArea: { flex: 1, position: "relative" },
  starWrapper: { position: "absolute" },
});
