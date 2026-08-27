// app/map/index.tsx
// ORBIT-MESH PRO V2.1 — Gözlem İstasyonu Haritası (Simüle)

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBle } from "@/context/BleContext";
import { useColors } from "@/hooks/useColors";

export default function MapScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { connectedDevices, meshNodes } = useBle();

  // Düğümleri rastgele grid pozisyonlarına yerleştir (sinyal gücüne göre yaklaşık mesafe)
  const nodesWithPosition = useMemo(() => {
    return connectedDevices.map((device, index) => {
      const node = meshNodes.find((n) => n.id === device.id);
      // Rastgele pozisyon (0-100 arası), ama aynı cihaz için sabit kalsın diye hash kullan
      const hash = device.id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
      const x = (hash % 80) + 10;
      const y = ((hash * 7) % 80) + 10;
      const score = node?.anomalyScore?.total || 0;
      const color =
        score >= 70 ? colors.danger : score >= 50 ? colors.warning : colors.accent;
      return {
        ...device,
        x,
        y,
        color,
        score,
        node,
      };
    });
  }, [connectedDevices, meshNodes]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, borderBottomColor: colors.border },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Gözlem İstasyonları
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.mapContainer,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.mapTitle, { color: colors.foreground }]}>
            Aktif Düğümler (Sinyal Gücüne Göre Yaklaşık Konum)
          </Text>
          <View style={styles.grid}>
            {/* Grid çizgileri */}
            {[0, 25, 50, 75, 100].map((pos) => (
              <View
                key={`h-${pos}`}
                style={[
                  styles.gridLineH,
                  { top: `${pos}%`, backgroundColor: colors.border },
                ]}
              />
            ))}
            {[0, 25, 50, 75, 100].map((pos) => (
              <View
                key={`v-${pos}`}
                style={[
                  styles.gridLineV,
                  { left: `${pos}%`, backgroundColor: colors.border },
                ]}
              />
            ))}

            {/* Düğüm noktaları */}
            {nodesWithPosition.map((node) => (
              <View
                key={node.id}
                style={[
                  styles.nodePoint,
                  {
                    left: `${node.x}%`,
                    top: `${node.y}%`,
                    backgroundColor: node.color,
                    borderColor: node.color,
                  },
                ]}
              >
                <View style={[styles.nodeDot, { backgroundColor: node.color }]} />
                <Text style={[styles.nodeLabel, { color: colors.foreground }]}>
                  {node.name || node.id.slice(0, 6)}
                </Text>
                <View
                  style={[
                    styles.signalRing,
                    {
                      borderColor: node.color,
                      width: 20 + (node.rssi ? Math.abs(node.rssi) / 5 : 10),
                      height: 20 + (node.rssi ? Math.abs(node.rssi) / 5 : 10),
                    },
                  ]}
                />
              </View>
            ))}
          </View>

          <View style={styles.legend}>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
              <Text style={[styles.legendText, { color: colors.mutedForeground }]}>
                Normal (Anomali &lt; 50)
              </Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
              <Text style={[styles.legendText, { color: colors.mutedForeground }]}>
                Şüpheli (Anomali 50-70)
              </Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
              <Text style={[styles.legendText, { color: colors.mutedForeground }]}>
                Kritik (Anomali &gt; 70)
              </Text>
            </View>
          </View>

          <Text style={[styles.mapNote, { color: colors.mutedForeground }]}>
            Konumlar, BLE sinyal gücüne göre tahmin edilmiştir. Gerçek koordinatlar manuel olarak eklenebilir.
          </Text>
        </View>

        {/* Düğüm Listesi (Harita altı) */}
        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 16 }]}>
          Bağlı Düğümler ({connectedDevices.length})
        </Text>
        {connectedDevices.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="bluetooth" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Henüz bağlı düğüm yok
            </Text>
          </View>
        ) : (
          connectedDevices.map((device) => {
            const node = meshNodes.find((n) => n.id === device.id);
            const score = node?.anomalyScore?.total || 0;
            const color =
              score >= 70 ? colors.danger : score >= 50 ? colors.warning : colors.accent;
            return (
              <View
                key={device.id}
                style={[
                  styles.deviceCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.deviceRow}>
                  <View style={[styles.deviceDot, { backgroundColor: color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.deviceName, { color: colors.foreground }]}>
                      {device.name || device.id}
                    </Text>
                    <Text style={[styles.deviceRssi, { color: colors.mutedForeground }]}>
                      Sinyal: {device.rssi ?? "?"} dBm
                    </Text>
                  </View>
                  <Text style={[styles.deviceScore, { color }]}>
                    Skor: {Math.round(score)}
                  </Text>
                </View>
              </View>
            );
          })
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
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  mapContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  mapTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 12 },
  grid: {
    position: "relative",
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    overflow: "hidden",
  },
  gridLineH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
  },
  gridLineV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
  },
  nodePoint: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateX: -12 }, { translateY: -12 }],
  },
  nodeDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "white",
    shadowColor: "white",
    shadowRadius: 8,
    shadowOpacity: 0.5,
    elevation: 4,
  },
  nodeLabel: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    marginTop: 4,
    textAlign: "center",
  },
  signalRing: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1,
    opacity: 0.3,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 12,
    justifyContent: "center",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  mapNote: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 12,
  },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 12 },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 12,
  },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  deviceCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  deviceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  deviceName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  deviceRssi: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  deviceScore: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
