import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, Dimensions, TouchableWithoutFeedback,
  PanResponder, Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";

const { width: W, height: H } = Dimensions.get("window");

const SHIP_W = 50;
const SHIP_H = 36;
const LASER_W = 20;
const LASER_H = 5;
const ASTEROID_SIZES = [{ r: 28, pts: 10 }, { r: 18, pts: 20 }, { r: 10, pts: 30 }];
const FPS_INTERVAL = 1000 / 30;
const HIGHSCORE_KEY = "orbit_uzay_savasci_hs";

interface Laser {
  id: number;
  x: number;
  y: number;
}

interface Asteroid {
  id: number;
  x: number;
  y: number;
  sizeIdx: number;
  speed: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

type GameState = "idle" | "playing" | "dead" | "gameover";

let _id = 0;
const uid = () => ++_id;

export default function UzaySavasciScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 8;

  const gameState = useRef<GameState>("idle");
  const shipY = useRef(H / 2);
  const lasers = useRef<Laser[]>([]);
  const asteroids = useRef<Asteroid[]>([]);
  const particles = useRef<Particle[]>([]);
  const score = useRef(0);
  const lives = useRef(3);
  const level = useRef(1);
  const lastLaser = useRef(0);
  const lastAsteroid = useRef(0);
  const loopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastFrameRef = useRef(0);
  const invincible = useRef(false);
  const shipX = W * 0.12;

  const [renderTick, setRenderTick] = useState(0);
  const [displayState, setDisplayState] = useState<GameState>("idle");
  const [displayScore, setDisplayScore] = useState(0);
  const [displayLives, setDisplayLives] = useState(3);
  const [highscore, setHighscore] = useState(0);

  const blink = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    AsyncStorage.getItem(HIGHSCORE_KEY).then(v => { if (v) setHighscore(parseInt(v, 10)); });
  }, []);

  const triggerBlink = useCallback(() => {
    blink.setValue(0.2);
    Animated.timing(blink, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [blink]);

  const spawnLaser = useCallback((double = false) => {
    const now = Date.now();
    if (now - lastLaser.current < 180) return;
    lastLaser.current = now;
    const y = shipY.current;
    lasers.current.push({ id: uid(), x: shipX + SHIP_W, y: double ? y - 8 : y });
    if (double) lasers.current.push({ id: uid(), x: shipX + SHIP_W, y: y + 8 });
  }, [shipX]);

  const spawnAsteroid = useCallback(() => {
    const now = Date.now();
    const interval = Math.max(600, 1400 - level.current * 60);
    if (now - lastAsteroid.current < interval) return;
    lastAsteroid.current = now;
    const sizeIdx = Math.floor(Math.random() * 3);
    const speed = 3 + level.current * 0.5 + Math.random() * 2;
    const r = ASTEROID_SIZES[sizeIdx].r;
    const y = r + Math.random() * (H - r * 2);
    asteroids.current.push({ id: uid(), x: W + r, y, sizeIdx, speed });
  }, []);

  const explode = useCallback((x: number, y: number, color: string) => {
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 + Math.random() * 0.5;
      const speed = 2 + Math.random() * 3;
      particles.current.push({
        id: uid(), x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color,
      });
    }
  }, []);

  const tick = useCallback(() => {
    const now = Date.now();
    if (now - lastFrameRef.current < FPS_INTERVAL) return;
    lastFrameRef.current = now;

    if (gameState.current !== "playing") return;

    spawnLaser();
    spawnAsteroid();

    lasers.current = lasers.current
      .map(l => ({ ...l, x: l.x + 18 }))
      .filter(l => l.x < W + 30);

    asteroids.current = asteroids.current.map(a => ({ ...a, x: a.x - a.speed }));

    const hitLaserIds = new Set<number>();
    const hitAsteroidIds = new Set<number>();

    for (const laser of lasers.current) {
      for (const ast of asteroids.current) {
        if (hitAsteroidIds.has(ast.id)) continue;
        const r = ASTEROID_SIZES[ast.sizeIdx].r;
        const dx = laser.x - ast.x;
        const dy = laser.y - ast.y;
        if (Math.abs(dx) < r + LASER_W / 2 && Math.abs(dy) < r + LASER_H / 2) {
          hitLaserIds.add(laser.id);
          hitAsteroidIds.add(ast.id);
          score.current += ASTEROID_SIZES[ast.sizeIdx].pts;
          explode(ast.x, ast.y, ast.sizeIdx === 0 ? "#ff9500" : ast.sizeIdx === 1 ? "#00d4ff" : "#00ff88");
        }
      }
    }

    lasers.current = lasers.current.filter(l => !hitLaserIds.has(l.id));
    asteroids.current = asteroids.current.filter(a => !hitAsteroidIds.has(a.id));

    if (!invincible.current) {
      for (const ast of asteroids.current) {
        const r = ASTEROID_SIZES[ast.sizeIdx].r;
        const dx = (shipX + SHIP_W / 2) - ast.x;
        const dy = shipY.current - ast.y;
        if (Math.sqrt(dx * dx + dy * dy) < r + 14) {
          lives.current -= 1;
          explode(ast.x, ast.y, "#ff3b5c");
          asteroids.current = asteroids.current.filter(a => a.id !== ast.id);
          invincible.current = true;
          triggerBlink();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          setTimeout(() => { invincible.current = false; }, 1800);

          if (lives.current <= 0) {
            gameState.current = "gameover";
            const s = score.current;
            setDisplayScore(s);
            setDisplayLives(0);
            setDisplayState("gameover");
            AsyncStorage.getItem(HIGHSCORE_KEY).then(v => {
              const old = v ? parseInt(v, 10) : 0;
              if (s > old) AsyncStorage.setItem(HIGHSCORE_KEY, s.toString()).then(() => setHighscore(s));
            });
            return;
          }
          setDisplayLives(lives.current);
          break;
        }
      }
    }

    asteroids.current = asteroids.current.filter(a => a.x > -80);

    particles.current = particles.current
      .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 0.06 }))
      .filter(p => p.life > 0);

    if (score.current >= level.current * 150) {
      level.current += 1;
    }

    setDisplayScore(score.current);
    setRenderTick(t => t + 1);
  }, [explode, spawnAsteroid, spawnLaser, triggerBlink, shipX]);

  const startGame = useCallback(() => {
    lasers.current = [];
    asteroids.current = [];
    particles.current = [];
    score.current = 0;
    lives.current = 3;
    level.current = 1;
    lastLaser.current = 0;
    lastAsteroid.current = 0;
    invincible.current = false;
    shipY.current = H / 2;
    setDisplayScore(0);
    setDisplayLives(3);
    gameState.current = "playing";
    setDisplayState("playing");

    if (loopRef.current) clearInterval(loopRef.current);
    loopRef.current = setInterval(tick, 16);
  }, [tick]);

  useEffect(() => {
    return () => { if (loopRef.current) clearInterval(loopRef.current); };
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, g) => {
        shipY.current = Math.max(SHIP_H, Math.min(H - SHIP_H, g.moveY));
      },
    })
  ).current;

  const renderShip = () => (
    <Animated.View
      style={[styles.ship, { top: shipY.current - SHIP_H / 2, left: shipX, opacity: blink }]}
      pointerEvents="none"
    >
      <View style={styles.shipBody}>
        <View style={styles.shipNose} />
        <View style={styles.shipWing} />
        <View style={styles.engineGlow} />
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {/* Background stars */}
      {[...Array(40)].map((_, i) => (
        <View key={i} style={[styles.star, {
          left: (i * 71 + i * 13) % W,
          top: (i * 97 + i * 37) % H,
          width: i % 3 === 0 ? 2 : 1,
          height: i % 3 === 0 ? 2 : 1,
          opacity: 0.3 + (i % 5) * 0.14,
        }]} />
      ))}

      {/* HUD */}
      <View style={[styles.hud, { top: topPad }]}>
        <TouchableWithoutFeedback onPress={() => router.back()}>
          <View style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="#00d4ff" />
          </View>
        </TouchableWithoutFeedback>
        <Text style={styles.hudScore}>{displayScore}</Text>
        <View style={styles.livesRow}>
          {[...Array(3)].map((_, i) => (
            <View key={i} style={[styles.lifeHeart, i < displayLives && styles.lifeHeartActive]} />
          ))}
        </View>
      </View>

      {/* Game area */}
      {displayState === "playing" ? (
        <View style={styles.gameArea} {...panResponder.panHandlers}>
          {renderShip()}
          {lasers.current.map(l => (
            <View key={l.id} style={[styles.laser, { left: l.x, top: l.y - LASER_H / 2 }]} />
          ))}
          {asteroids.current.map(a => {
            const r = ASTEROID_SIZES[a.sizeIdx].r;
            const color = a.sizeIdx === 0 ? "#ff9500" : a.sizeIdx === 1 ? "#00d4ff" : "#00ff88";
            return (
              <View key={a.id} style={[styles.asteroid, {
                left: a.x - r, top: a.y - r,
                width: r * 2, height: r * 2, borderRadius: r,
                borderColor: color, backgroundColor: color + "22",
              }]}>
                <Text style={{ color, fontSize: r * 0.6, textAlign: "center", lineHeight: r * 2 }}>☄</Text>
              </View>
            );
          })}
          {particles.current.map(p => (
            <View key={p.id} style={[styles.particle, {
              left: p.x, top: p.y,
              backgroundColor: p.color,
              opacity: p.life,
            }]} />
          ))}
        </View>
      ) : displayState === "idle" ? (
        <View style={styles.overlay}>
          <Text style={styles.gameLogo}>☄ UZAY SAVAŞÇISI</Text>
          <Text style={styles.gameSubtitle}>Asteroidleri yok et, galaksiyi koru!</Text>
          {highscore > 0 && <Text style={styles.highscoreLabel}>En Yüksek: {highscore}</Text>}
          <Text style={styles.hint}>Parmağınla gemiyi yukarı / aşağı sür</Text>
          <TouchableWithoutFeedback onPress={startGame}>
            <View style={styles.startBtn}>
              <Text style={styles.startBtnText}>BAŞLA</Text>
            </View>
          </TouchableWithoutFeedback>
        </View>
      ) : (
        <View style={styles.overlay}>
          <Text style={styles.gameOver}>OYUN BİTTİ</Text>
          <Text style={styles.finalScore}>Puan: {displayScore}</Text>
          {displayScore >= highscore && displayScore > 0 && (
            <Text style={styles.newRecord}>🏆 Yeni Rekor!</Text>
          )}
          <Text style={styles.highscoreLabel}>En Yüksek: {highscore}</Text>
          <TouchableWithoutFeedback onPress={startGame}>
            <View style={styles.startBtn}>
              <Text style={styles.startBtnText}>TEKRAR OYNA</Text>
            </View>
          </TouchableWithoutFeedback>
          <TouchableWithoutFeedback onPress={() => router.back()}>
            <View style={styles.backBtnLarge}>
              <Text style={styles.backBtnText}>Ana Ekran</Text>
            </View>
          </TouchableWithoutFeedback>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#03060f" },
  star: { position: "absolute", backgroundColor: "#ffffff", borderRadius: 1 },
  hud: {
    position: "absolute", left: 0, right: 0, zIndex: 10,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  hudScore: { color: "#00d4ff", fontSize: 22, fontFamily: "Inter_700Bold" },
  livesRow: { flexDirection: "row", gap: 6 },
  lifeHeart: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#1e2a3d" },
  lifeHeartActive: { backgroundColor: "#ff3b5c" },
  gameArea: { flex: 1, position: "relative" },
  ship: { position: "absolute", width: SHIP_W, height: SHIP_H },
  shipBody: { flex: 1 },
  shipNose: {
    position: "absolute", left: SHIP_W * 0.55, top: SHIP_H * 0.3,
    width: SHIP_W * 0.45, height: SHIP_H * 0.4,
    backgroundColor: "#00d4ff", borderRadius: 2,
  },
  shipWing: {
    position: "absolute", left: 0, top: 0,
    width: SHIP_W * 0.65, height: SHIP_H,
    backgroundColor: "#1e3a5f", borderRadius: 4,
    borderWidth: 1, borderColor: "#00d4ff40",
  },
  engineGlow: {
    position: "absolute", left: 0, top: SHIP_H * 0.35,
    width: 8, height: SHIP_H * 0.3,
    backgroundColor: "#ff9500", borderRadius: 4,
    shadowColor: "#ff9500", shadowRadius: 6, shadowOpacity: 1,
  },
  laser: {
    position: "absolute", width: LASER_W, height: LASER_H,
    backgroundColor: "#00ff88", borderRadius: 2,
    shadowColor: "#00ff88", shadowRadius: 4, shadowOpacity: 1,
  },
  asteroid: { position: "absolute", borderWidth: 2, alignItems: "center", justifyContent: "center" },
  particle: { position: "absolute", width: 4, height: 4, borderRadius: 2 },
  overlay: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: 16,
  },
  gameLogo: { color: "#00d4ff", fontSize: 32, fontFamily: "Inter_700Bold", textAlign: "center" },
  gameSubtitle: { color: "#64748b", fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center" },
  hint: { color: "#4a5568", fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4 },
  startBtn: {
    backgroundColor: "#00d4ff", paddingHorizontal: 48, paddingVertical: 16, borderRadius: 30, marginTop: 8,
  },
  startBtnText: { color: "#0a0e1a", fontSize: 18, fontFamily: "Inter_700Bold" },
  backBtnLarge: {
    backgroundColor: "#111827", paddingHorizontal: 40, paddingVertical: 12,
    borderRadius: 20, borderWidth: 1, borderColor: "#1e2a3d",
  },
  backBtnText: { color: "#64748b", fontSize: 15, fontFamily: "Inter_500Medium" },
  gameOver: { color: "#ff3b5c", fontSize: 36, fontFamily: "Inter_700Bold" },
  finalScore: { color: "#e2e8f0", fontSize: 24, fontFamily: "Inter_600SemiBold" },
  newRecord: { color: "#ff9500", fontSize: 18, fontFamily: "Inter_700Bold" },
  highscoreLabel: { color: "#64748b", fontSize: 14, fontFamily: "Inter_400Regular" },
});
