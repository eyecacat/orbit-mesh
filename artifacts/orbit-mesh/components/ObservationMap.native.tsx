import React from "react";
import { View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import type { ObservationMapProps } from "./observationMapTypes";

export default function ObservationMap({ center, markers, width }: ObservationMapProps) {
  return (
    <MapView
      style={{ width, height: 320 }}
      initialRegion={{
        latitude: center.lat,
        longitude: center.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
      showsUserLocation
      showsMyLocationButton={false}
      showsCompass
    >
      {markers.length > 1 && (
        <Polyline
          coordinates={markers.map((marker) => ({
            latitude: marker.latitude,
            longitude: marker.longitude,
          }))}
          strokeColor="#8B5CF6"
          strokeWidth={2}
          lineDashPattern={[6, 6]}
        />
      )}
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
          title={marker.name}
          description={`RSSI: ${marker.rssi ?? "?"} dBm · Skor: ${Math.round(marker.score)}`}
          pinColor={marker.color}
        />
      ))}
    </MapView>
  );
}