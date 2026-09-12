// app/map/index.tsx — Gözlem Haritası (WebView + Leaflet, API key gerekmez)
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";

import { useBle } from "@/context/BleContext";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");
const FALLBACK_LAT = 41.0082;
const FALLBACK_LNG = 28.9784;

function AnomalyVerdict({ consensus, tele }: any) {
  const colors = useColors();
  const nodeAnomaly = (tele?.anomaly ?? false) || ((tele?.act ?? 0) >= 50);
  let title = "NORMAL ÖLÇÜM";
  let desc = "Ağda anomali yok; ölçümler temiz.";
  let color = colors.accent;
  if (consensus?.status === "Doğrulanmış") {
    title = "GERÇEK ANOMALİ — AĞ DOĞRULADI";
    desc = `${consensus.anomalyCount ?? "3"}+ düğüm aynı anda aynı tür anomali bildiriyor. Yerel hata olasılığı düşük.`;
    color = colors.danger;
  } else if (consensus?.status === "Şüpheli") {
    title = "ŞÜPHELİ — DOĞRULAMA BEKLİYOR";
    desc = "2 düğüm aynı fikirde. Üçüncü düğüm onayıyla gerçek anomali sayılır.";
    color = colors.warning;
  } else if (tele?.mains) {
    title = "YEREL YANLIŞ ALGILAMA — ŞEBEKE GÜRÜLTÜSÜ";
    desc = "45-55 Hz bandı baskın: 50 Hz şebeke gürültüsü ölçümü bozuyor.";
    color = colors.primary;
  } else if (tele?.fault) {
    title = "YEREL YANLIŞ ALGILAMA — BAĞLANTI ARIZASI";
    desc = "Anten/bağlantı arızası (INPUT_FAULT).";
    color = colors.primary;
  } else if (nodeAnomaly) {
    title = "YEREL ANOMALİ — TEK DÜĞÜM";
    desc = "Yalnızca bu düğümde tespit edildi; ağ onayı bekleniyor.";
    color = colors.warning;
  }
  return (
    <View
      style={{
        margin: 10,
        marginBottom: 0,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: color,
        backgroundColor: color + "18",
        padding: 12,
        gap: 4,
      }}
    >
      <Text style={{ color, fontFamily: "Inter_700Bold", fontSize: 13 }}>{title}</Text>
      <Text
        style={{
          color: colors.mutedForeground,
          fontFamily: "Inter_400Regular",
          fontSize: 12,
          lineHeight: 17,
        }}
      >
        {desc}
      </Text>
    </View>
  );
}

export default function MapScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { connectedDevices, meshNodes, latestTelemetry, consensus } = useBle();
  const tele = latestTelemetry;

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const webRef = useRef<WebView | null>(null);

  // Konum arka planda çözülür; harita BEKLEMEZ. 10 sn watchdog.
  useEffect(() => {
    let cancelled = false;
    const watchdog = setTimeout(() => {
      if (!cancelled && !location) {
        setLocationError("Konum alınamadı — varsayılan konum kullanılıyor.");
      }
    }, 18000);
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (!cancelled)
            setLocationError("Konum izni verilmedi — varsayılan konumla gösteriliyor.");
          return;
        }
        const live = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
          new Promise<null>((res) => setTimeout(() => res(null), 15000)),
        ]).catch(() => null);
        const loc = live ?? (await Location.getLastKnownPositionAsync().catch(() => null));
        if (!cancelled && loc) {
          setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        }
      } catch {
        /* varsayılan kalır */
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(watchdog);
    };
  }, []);

  const baseLat = location?.lat ?? FALLBACK_LAT;
  const baseLng = location?.lng ?? FALLBACK_LNG;

  const nodesForMap =
    meshNodes.length > 0
      ? meshNodes.map((n) => ({
          id: n.id,
          name: n.name ?? n.id,
          score: n.anomalyScore?.total ?? 0,
          rssi: n.rssi,
          tele: (n as any).telemetry ?? ((n as any).isConnected ? tele : null),
        }))
      : connectedDevices.map((d) => ({
          id: d.id,
          name: d.name ?? d.id,
          score: 0,
          rssi: d.rssi,
          tele,
        }));

  const markers = nodesForMap.map((node) => {
    const hash = node.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const angle = ((hash % 360) * Math.PI) / 180;
    const radius = 0.003 + ((hash % 100) / 100) * 0.004;
    const score = node.score ?? 0;
    return {
      ...node,
      latitude: baseLat + Math.sin(angle) * radius,
      longitude: baseLng + Math.cos(angle) * radius,
      color: score >= 70 ? "#e8434f" : score >= 50 ? "#ffd166" : "#3ecf8e",
    };
  });

  const getBadge = (node: typeof nodesForMap[number]) => {
    const t = node.tele;
    const score = node.score ?? 0;
    if (t?.mains) return { label: "Şebeke gürültüsü", color: colors.primary };
    if (t?.fault) return { label: "Arıza", color: colors.primary };
    if (consensus?.status !== "Normal" && score >= 50)
      return { label: "Ağ doğruladı", color: colors.danger };
    if (score >= 50) return { label: "Yerel", color: colors.warning };
    return { label: "Normal", color: colors.accent };
  };

  // Leaflet haritası + marker'ları HTML olarak üret
  const polyline = markers.map((m) => `[${m.latitude}, ${m.longitude}]`).join(",");
  const markerJs = markers
    .map(
      (m) => `
      L.circleMarker([${m.latitude}, ${m.longitude}], {
        radius: 9, fillColor: '${m.color}', color: '#ffffff', weight: 2, fillOpacity: 1
      }).addTo(map).bindPopup(${JSON.stringify(
        `<b>${m.name}</b><br/>RSSI: ${m.rssi ?? "?"} dBm<br/>Skor: ${Math.round(m.score)}`
      )});
    `
    )
    .join("\n");

  const leafletHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #111; }
    .leaflet-container { background: #111; }
    .leaflet-popup-content { font-family: -apple-system, sans-serif; font-size: 12px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: true, attributionControl: true })
      .setView([${baseLat}, ${baseLng}], 14);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    ${
      markers.length > 1
        ? `L.polyline([${polyline}], { color: '#8B5CF6', weight: 2, dashArray: '6,6' }).addTo(map);`
        : ""
    }

    ${markerJs}

    // Harita boyutunu yenile (WebView yüklendiğinde)
    setTimeout(function() { map.invalidateSize(); }, 200);
  </script>
</body>
</html>
  `;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Gözlem Haritası
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {locationError && (
          <View
            style={[
              styles.warnBanner,
              { backgroundColor: colors.warning + "22", borderColor: colors.warning + "44" },
            ]}
          >
            <Feather name="alert-triangle" size={14} color={colors.warning} />
            <Text style={[styles.warnBannerText, { color: colors.warning }]}>
              {locationError}
            </Text>
          </View>
        )}

        <AnomalyVerdict consensus={consensus} tele={tele} />

        <View
          style={[
            styles.mapWrap,
            { borderColor: colors.border, backgroundColor: colors.card },
          ]}
        >
          <WebView
            ref={webRef}
            originWhitelist={["*"]}
            source={{ html: leafletHtml }}
            style={{ width: width - 32, height: 350, backgroundColor: "#111" }}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            scrollEnabled={false}
            onError={() => setLocationError("Harita yüklenemedi.")}
          />

          {/* Legend overlay */}
          <View style={[styles.legend, { backgroundColor: colors.background + "dd" }]}>
            {[
              { c: "#3ecf8e", t: "Normal" },
              { c: "#ffd166", t: "Şüpheli" },
              { c: "#e8434f", t: "Kritik" },
            ].map((l) => (
              <View key={l.t} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: l.c }]} />
                <Text style={[styles.legendText, { color: colors.mutedForeground }]}>
                  {l.t}
                </Text>
              </View>
            ))}
          </View>

          <View
            style={[
              styles.nodeCount,
              { backgroundColor: colors.primary + "22", borderColor: colors.primary + "44" },
            ]}
          >
            <Feather name="server" size={14} color={colors.primary} />
            <Text style={[styles.nodeCountText, { color: colors.primary }]}>
              {markers.length} düğüm
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 16 }]}>
          Bağlı Düğümler ({markers.length})
        </Text>

        {markers.length === 0 ? (
          <View
            style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Feather name="bluetooth" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Henüz bağlı düğüm yok
            </Text>
          </View>
        ) : (
          markers.map((m) => {
            const badge = getBadge(m);
            return (
              <View
                key={m.id}
                style={[
                  styles.deviceCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.deviceRow}>
                  <View style={[styles.deviceDot, { backgroundColor: m.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.deviceName, { color: colors.foreground }]}>
                      {m.name}
                    </Text>
                    <Text style={[styles.deviceRssi, { color: colors.mutedForeground }]}>
                      Sinyal: {m.rssi ?? "?"} dBm · Skor: {Math.round(m.score)}
                    </Text>
                    <View
                      style={{
                        alignSelf: "flex-start",
                        marginTop: 6,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 10,
                        backgroundColor: badge.color + "22",
                        borderWidth: 1,
                        borderColor: badge.color + "55",
                      }}
                    >
                      <Text
                        style={{
                          color: badge.color,
                          fontFamily: "Inter_600SemiBold",
                          fontSize: 10,
                        }}
                      >
                        {badge.label}
                      </Text>
                    </View>
                  </View>
                  <Feather name="map-pin" size={16} color={m.color} />
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
  warnBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 10,
  },
  warnBannerText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  mapWrap: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
    marginBottom: 8,
  },
  legend: {
    position: "absolute",
    bottom: 12,
    left: 12,
    padding: 10,
    borderRadius: 10,
    gap: 4,
  },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  nodeCount: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  nodeCountText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
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
  deviceRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  deviceDot: { width: 10, height: 10, borderRadius: 5 },
  deviceName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  deviceRssi: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
});