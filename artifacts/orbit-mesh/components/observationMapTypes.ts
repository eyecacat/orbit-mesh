export interface ObservationMapMarker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  score: number;
  rssi: number | null;
  color: string;
}

export interface ObservationMapProps {
  center: { lat: number; lng: number };
  markers: ObservationMapMarker[];
  width: number;
}