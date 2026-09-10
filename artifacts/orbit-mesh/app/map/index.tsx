// app/map/index.tsx
// ORBIT-MESH PRO — OpenStreetMap TileOverlay ile ücretsiz harita (API anahtarı gerekmez)
//
// DÜZELTMELER:
// 1) PROVIDER_GOOGLE kaldırıldı → Android'de Google Maps API anahtarı gerektirmez.
// 2) Konum efekti: 8 sn timeout + getLastKnownPositionAsync fallback → "Konum alınıyor..."
//    ekranında takılma giderildi.
// 3) Marker kaynağı: meshNodes (ORBIT-XXXX) öncelikli, connectedDevices yedek.
//    (Eski hata: device.id = BLE MAC ile meshNodes.id asla eşleşmiyordu.)
// 4) Deterministik konumlandırma (hash tabanlı ~300-600 m daire) + Polyline ile
//    mesh bağlantı çizgileri.
// 5) AnomalyVerdict kartı: gerçek / şüpheli / yerel yanlış algılama kararı.
// 6) Düğüm listesi satırlarına durum rozeti.

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker, TileOverlay, Polyline } from "react-native-maps";
import * as Location from "expo-location";

import { useBle } from "@/context/BleContext";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

// İstanbul — konum alınamadığında kullanılan güvenli varsayılan merkez
const FALLBACK_LAT = 41.0082;
const FALLBACK_LNG = 28.9784;

// ─────────────────────────────────────────────────────────────────────────────
// AnomalyVerdict — gerçek / şüpheli / yerel karar kartı
// ─────────────────────────────────────────────────────────────────────────────
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
    desc = "45-55 Hz bandı baskın: 50 Hz şebeke/elektrik gürültüsü ölçümü bozuyor. Uzay kaynaklı değil.";
    color = colors.primary;
  } else if (tele?.fault) {
    title = "YEREL YANLIŞ ALGILAMA — BAĞLANTI ARIZASI";
    desc = "Anten/bağlantı arızası (INPUT_FAULT). Sinyal yolu kontrol edilmeli.";
    color = colors.primary;
  } else if (nodeAnomaly) {
    title = "YEREL ANOMALİ — TEK DÜĞÜM";
    desc = "Yalnızca bu düğümde tespit edildi. Karışan frekans veya yerel parazit olabilir; ağ onayı bekleniyor.";
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

  // latestTelemetry ve consensus patch'te kullanılıyor.
  // BleContext'te yoksa TS hata verir; o zaman bu iki alanı context'e ekleyin.
  const { connectedDevices, meshNodes, latestTelemetry, consensus } = useBle();
  const tele = latestTelemetry;

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);

  // ───────────────────────────────────────────────────────────────────────────
  // 1) Konum efekti — 8 sn timeout + son bilinen konum fallback
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (!cancelled) {
            setLocationError("Konum izni verilmedi — harita varsayılan konumla gösteriliyor.");
            setLoadingLocation(false);
          }
          return;
        }

        const live = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<null>((res) => setTimeout(() => res(null), 8000)),
        ]);

        const loc =
          live ?? (await Location.getLastKnownPositionAsync().catch(() => null));

        if (!cancelled) {
          if (loc) setLocation(loc);
          else setLocationError("Konum alınamadı — varsayılan konum kullanılıyor.");
        }
      } catch (err: any) {
        if (!cancelled)
          setLocationError(
            (err?.message || "Konum alınamadı") + " — varsayılan konum kullanılıyor."
          );
      } finally {
        if (!cancelled) setLoadingLocation(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // 2) Marker kaynağı — meshNodes öncelikli, connectedDevices yedek
  // ───────────────────────────────────────────────────────────────────────────
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

  // ───────────────────────────────────────────────────────────────────────────
  // 3) Marker üretimi — deterministik dağılım + renk
  // ───────────────────────────────────────────────────────────────────────────
  const baseLat = location?.coords.latitude ?? FALLBACK_LAT;
  const baseLng = location?.coords.longitude ?? FALLBACK_LNG;

  const markers = nodesForMap.map((node) => {
    const hash = node.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const angle = ((hash % 360) * Math.PI) / 180;
    const radius = 0.003 + ((hash % 100) / 100) * 0.004;

    const score = node.score ?? 0;
    const color =
      score >= 70 ? "#e8434f" : score >= 50 ? "#ffd166" : "#3ecf8e";

    return {
      ...node,
      latitude: baseLat + Math.sin(angle) * radius,
      longitude: baseLng + Math.cos(angle) * radius,
      color,
    };
  });

  const meshLineCoords = markers.map((m) => ({
    latitude: m.latitude,
    longitude: m.longitude,
  }));

  // Rozet metni (düğüm listesi için)
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

  const tileUrlTemplate = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  const mapCenterLat = location?.coords.latitude ?? FALLBACK_LAT;
  const mapCenterLng = location?.coords.longitude ?? FALLBACK_LNG;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Gözlem Haritası</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {loadingLocation ? (
          <View style={[styles.loadingContainer, { backgroundColor: colors.card }]}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
              Konum alınıyor...
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.mapContainer,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {locationError && (
              <View
                style={[
                  styles.warnBanner,
                  {
                    backgroundColor: colors.warning + "22",
                    borderColor: colors.warning + "44",
                  },
                ]}
              >
                <Feather name="alert-triangle" size={14} color={colors.warning} />
                <Text style={[styles.warnBannerText, { color: colors.warning }]}>
                  {locationError}
                </Text>
              </View>
            )}

            {/* AnomalyVerdict kartı — warn banner'ın altında */}
            <AnomalyVerdict consensus={consensus} tele={tele} />

            {/* provider PROP'U KASITLI OLARAK VERİLMEDİ. */}
            <MapView
              style={[styles.map, { width: width - 32, height: 350 }]}
              initialRegion={{
                latitude: mapCenterLat,
                longitude: mapCenterLng,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
              showsUserLocation={!locationError}
              showsMyLocationButton={!locationError}
              showsCompass
            >
              {/* 🗺️ OpenStreetMap TileOverlay — API anahtarı gerekmez */}
              <TileOverlay tileUrlTemplate={tileUrlTemplate} maximumZ={19} zIndex={-1} />

              {/* Mesh bağlantı çizgileri (Marker'lardan önce render edilmeli) */}
              {markers.length > 1 && (
                <Polyline
                  coordinates={meshLineCoords}
                  strokeColor="#8B5CF6"
                  strokeWidth={2}
                  lineDashPattern={[6, 6]}
                />
              )}

              {markers.map((marker) => (
                <Marker
                  key={marker.id}
                  coordinate={{
                    latitude: marker.latitude,
                    longitude: marker.longitude,
                  }}
                  title={marker.name}
                  description={`RSSI: ${marker.rssi ?? "?"} dBm · Skor: ${Math.round(
                    marker.score
                  )}`}
                  pinColor={marker.color}
                />
              ))}
            </MapView>

            {/* Legend */}
            <View style={[styles.legend, { backgroundColor: colors.background + "dd" }]}>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: "#3ecf8e" }]} />
                <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Normal</Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: "#ffd166" }]} />
                <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Şüpheli</Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: "#e8434f" }]} />
                <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Kritik</Text>
              </View>
            </View>

            <View
              style={[
                styles.nodeCount,
                { backgroundColor: colors.primary + "22", borderColor: colors.primary + "44" },
              ]}
            >
              <Feather name="server" size={14} color={colors.primary} />
              <Text style={[styles.nodeCountText, { color: colors.primary }]}>
                {markers.length} düğüm gösteriliyor
              </Text>
            </View>
          </View>
        )}

        {/* Düğüm Listesi */}
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
          markers.map((marker) => {
            const badge = getBadge(marker);
            return (
              <View
                key={marker.id}
                style={[
                  styles.deviceCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.deviceRow}>
                  <View style={[styles.deviceDot, { backgroundColor: marker.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.deviceName, { color: colors.foreground }]}>
                      {marker.name}
                    </Text>
                    <Text style={[styles.deviceRssi, { color: colors.mutedForeground }]}>
                      Sinyal: {marker.rssi ?? "?"} dBm · Skor: {Math.round(marker.score)}
                    </Text>
                    {/* Rozet */}
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
                  <Feather name="map-pin" size={16} color={marker.color} />
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
  loadingContainer: {
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 12,
  },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  warnBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderWidth: 1,
    borderRadius: 12,
    margin: 10,
    marginBottom: 0,
  },
  warnBannerText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  mapContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  map: {
    borderRadius: 16,
  },
  legend: {
    position: "absolute",
    bottom: 12,
    left: 12,
    padding: 10,
    borderRadius: 10,
    gap: 4,
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
});
