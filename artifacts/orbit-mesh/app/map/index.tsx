// app/map/index.tsx
// ORBIT-MESH PRO — OpenStreetMap TileOverlay ile ücretsiz harita (API anahtarı gerekmez)

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
import MapView, { Marker, TileOverlay, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";

import { useBle } from "@/context/BleContext";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

export default function MapScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { connectedDevices, meshNodes } = useBle();

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);

  // Konum izni ve konum al
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationError("Konum izni verilmedi.");
          setLoadingLocation(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation(loc);
      } catch (err: any) {
        setLocationError(err.message || "Konum alınamadı");
      } finally {
        setLoadingLocation(false);
      }
    })();
  }, []);

  const getMarkerColor = (node: any) => {
    const score = node?.anomalyScore?.total || 0;
    if (score >= 70) return "#e8434f";
    if (score >= 50) return "#ffd166";
    return "#3ecf8e";
  };

  // Düğümleri marker pozisyonlarına dönüştür
  const markers = connectedDevices.map((device) => {
    const node = meshNodes.find((n) => n.id === device.id);
    const hash = device.id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const baseLat = location?.coords.latitude ?? 41.0082;
    const baseLng = location?.coords.longitude ?? 28.9784;
    const latOffset = ((hash % 100) - 50) / 10000;
    const lngOffset = ((hash * 7) % 100 - 50) / 10000;
    return {
      id: device.id,
      name: device.name || device.id,
      rssi: device.rssi,
      latitude: baseLat + latOffset,
      longitude: baseLng + lngOffset,
      color: getMarkerColor(node),
      score: node?.anomalyScore?.total || 0,
      node,
    };
  });

  // OSM tile URL'si
  const tileUrlTemplate = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Gözlem Haritası</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {loadingLocation ? (
          <View style={[styles.loadingContainer, { backgroundColor: colors.card }]}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Konum alınıyor...</Text>
          </View>
        ) : locationError ? (
          <View style={[styles.errorContainer, { backgroundColor: colors.card, borderColor: colors.danger + "44" }]}>
            <Feather name="alert-circle" size={24} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.danger }]}>{locationError}</Text>
          </View>
        ) : (
          <View style={[styles.mapContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={[styles.map, { width: width - 32, height: 350 }]}
              initialRegion={{
                latitude: location?.coords.latitude ?? 41.0082,
                longitude: location?.coords.longitude ?? 28.9784,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
              showsUserLocation
              showsMyLocationButton
              showsCompass
            >
              {/* 🗺️ OpenStreetMap TileOverlay — API anahtarı gerekmez */}
              <TileOverlay
                tileUrlTemplate={tileUrlTemplate}
                maximumZ={19}
                zIndex={-1}
              />

              {markers.map((marker) => (
                <Marker
                  key={marker.id}
                  coordinate={{
                    latitude: marker.latitude,
                    longitude: marker.longitude,
                  }}
                  title={marker.name}
                  description={`RSSI: ${marker.rssi ?? "?"} dBm · Skor: ${Math.round(marker.score)}`}
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

            <View style={[styles.nodeCount, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "44" }]}>
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
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="bluetooth" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Henüz bağlı düğüm yok</Text>
          </View>
        ) : (
          markers.map((marker) => (
            <View key={marker.id} style={[styles.deviceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.deviceRow}>
                <View style={[styles.deviceDot, { backgroundColor: marker.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.deviceName, { color: colors.foreground }]}>{marker.name}</Text>
                  <Text style={[styles.deviceRssi, { color: colors.mutedForeground }]}>
                    Sinyal: {marker.rssi ?? "?"} dBm · Skor: {Math.round(marker.score)}
                  </Text>
                </View>
                <Feather name="map-pin" size={16} color={marker.color} />
              </View>
            </View>
          ))
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
  errorContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  errorText: { fontSize: 14, fontFamily: "Inter_500Medium" },
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
