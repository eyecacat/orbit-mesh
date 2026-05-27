import { BleManager, Device } from 'react-native-ble-plx';
import { useState, useRef } from 'react';
import { PermissionsAndroid, Platform, Alert } from 'react-native';
const SERVICE_UUID = "12345678-1234-1234-1234-123456789abc";
const CHAR_UUID = "abcdefab-cdef-abcd-efab-cdefabcdefab";
export function useBLE() {
  const manager = useRef(new BleManager()).current;
  const [devices, setDevices] = useState<Device[]>([]);
  const [connected, setConnected] = useState<Device | null>(null);
  const [sensorData, setSensorData] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  async function requestPermissions() {
    if (Platform.OS === 'android') {
      const grants = await PermissionsAndroid.requestMultiple([PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT, PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]);
      return Object.values(grants).every(v => v === PermissionsAndroid.RESULTS.GRANTED);
    }
    return true;
  }
  async function startScan() {
    const ok = await requestPermissions();
    if (!ok) { Alert.alert('İzin gerekli', 'Bluetooth izni verilmedi'); return; }
    setDevices([]); setScanning(true);
    manager.startDeviceScan(null, null, (error, device) => {
      if (error) { setScanning(false); return; }
      if (device?.name?.startsWith('ORBIT-MESH')) setDevices(prev => prev.find(d => d.id === device.id) ? prev : [...prev, device]);
    });
    setTimeout(() => { manager.stopDeviceScan(); setScanning(false); }, 10000);
  }
  async function connect(device: Device) {
    try {
      manager.stopDeviceScan();
      const d = await device.connect();
      await d.discoverAllServicesAndCharacteristics();
      setConnected(d);
      d.monitorCharacteristicForService(SERVICE_UUID, CHAR_UUID, (err, char) => {
        if (err) return;
        const raw = char?.value ? Buffer.from(char.value, 'base64').toString('utf-8') : null;
        if (raw) setSensorData(JSON.parse(raw));
      });
    } catch (e) { Alert.alert('Bağlantı hatası', String(e)); }
  }
  async function disconnect() {
    if (connected) { await connected.cancelConnection(); setConnected(null); setSensorData(null); }
  }
  return { devices, connected, sensorData, scanning, startScan, connect, disconnect };
}
