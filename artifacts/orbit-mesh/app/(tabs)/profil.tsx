import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useUpdateProfile, getAuthMeQueryKey } from "@workspace/api-client-react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import * as Haptics from "expo-haptics";

export default function ProfilScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, setUser } = useAuth();
  const qc = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [city, setCity] = useState(user?.city ?? "");

  const { mutate: updateProfile, isPending } = useUpdateProfile({
    mutation: {
      onSuccess: (data) => {
        setUser(data);
        qc.invalidateQueries({ queryKey: getAuthMeQueryKey() });
        setShowEdit(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
      onError: () => Alert.alert("Hata", "Profil güncellenemedi"),
    },
  });

  const handleLogout = () => {
    Alert.alert("Çıkış Yap", "Hesabından çıkış yapmak istiyor musun?", [
      { text: "İptal", style: "cancel" },
      { text: "Çıkış Yap", style: "destructive", onPress: logout },
    ]);
  };

  const scoreColor = (s: number) => s >= 80 ? "#00ff88" : s >= 50 ? "#ff9500" : "#ff3b5c";

  const menuItems = [
    { icon: "bell" as const, label: "Bildirim Ayarları", sub: "Günlük check-in zamanı", onPress: () => {} },
    { icon: "globe" as const, label: "Dil", sub: "Türkçe", onPress: () => {} },
    { icon: "shield" as const, label: "Gizlilik", sub: "Veri ve güvenlik", onPress: () => {} },
    { icon: "help-circle" as const, label: "Yardım & Destek", sub: "SSS ve iletişim", onPress: () => {} },
    { icon: "info" as const, label: "Hakkında", sub: "ORBIT-MESH v1.0.0", onPress: () => {} },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Profil</Text>
          <TouchableOpacity onPress={() => { setName(user?.name ?? ""); setCity(user?.city ?? ""); setShowEdit(true); }}>
            <Feather name="edit-2" size={20} color="#00d4ff" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>{user?.name?.[0]?.toUpperCase() ?? "?"}</Text>
          </View>
          <Text style={styles.profileName}>{user?.name ?? "Kullanıcı"}</Text>
          <Text style={styles.profileEmail}>{user?.email ?? ""}</Text>
          {user?.city && (
            <View style={styles.cityBadge}>
              <Feather name="map-pin" size={12} color="#00d4ff" />
              <Text style={styles.cityBadgeText}>{user.city}</Text>
            </View>
          )}
          {user?.createdAt && (
            <Text style={styles.joinDate}>
              {new Date(user.createdAt).toLocaleDateString("tr-TR", { year: "numeric", month: "long" })} tarihinden beri üye
            </Text>
          )}
        </View>

        <View style={styles.nabizCard}>
          <View style={styles.nabizLeft}>
            <Feather name="activity" size={20} color="#00d4ff" />
            <View>
              <Text style={styles.nabizLabel}>Nabız Skorum</Text>
              <Text style={styles.nabizSub}>Ağ sağlık durumu</Text>
            </View>
          </View>
          <View style={styles.nabizRight}>
            <Text style={[styles.nabizScore, { color: scoreColor(user?.nabizScore ?? 100) }]}>
              {user?.nabizScore ?? 100}
            </Text>
            <Text style={styles.nabizMax}>/100</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Uygulama</Text>
          {menuItems.map((item, i) => (
            <TouchableOpacity key={i} style={[styles.menuItem, i === menuItems.length - 1 && styles.lastMenuItem]} onPress={item.onPress} activeOpacity={0.7}>
              <View style={styles.menuIcon}>
                <Feather name={item.icon} size={18} color="#00d4ff" />
              </View>
              <View style={styles.menuText}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuSub}>{item.sub}</Text>
              </View>
              <Feather name="chevron-right" size={16} color="#374151" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Feather name="log-out" size={18} color="#ff3b5c" />
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </TouchableOpacity>

        <View style={styles.versionWrap}>
          <View style={styles.orbitLogo}>
            <View style={styles.orbitRing} />
          </View>
          <Text style={styles.versionText}>ORBIT-MESH · Bağlı Kal, Güvende Kal</Text>
        </View>

        <View style={{ height: 100 + insets.bottom }} />
      </ScrollView>

      <Modal visible={showEdit} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Profili Düzenle</Text>
            <Text style={styles.fieldLabel}>Ad Soyad</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Adın ve soyadın"
              placeholderTextColor="#64748b"
            />
            <Text style={styles.fieldLabel}>Şehir</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="Şehrin"
              placeholderTextColor="#64748b"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEdit(false)}>
                <Text style={styles.cancelBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, isPending && { opacity: 0.6 }]}
                onPress={() => updateProfile({ data: { name, city } })}
                disabled={isPending}
              >
                {isPending ? <ActivityIndicator color="#0a0e1a" size="small" /> : <Text style={styles.confirmBtnText}>Kaydet</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0e1a" },
  scroll: { padding: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  title: { fontSize: 28, fontWeight: "800", color: "#ffffff", fontFamily: "Inter_700Bold" },
  profileCard: {
    backgroundColor: "#111827", borderRadius: 20, padding: 24,
    alignItems: "center", marginBottom: 16, borderWidth: 1, borderColor: "#1e2a3d",
  },
  avatarLarge: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: "#00d4ff" + "20",
    alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#00d4ff",
    marginBottom: 12,
  },
  avatarLargeText: { fontSize: 32, fontWeight: "800", color: "#00d4ff", fontFamily: "Inter_700Bold" },
  profileName: { fontSize: 22, fontWeight: "800", color: "#ffffff", fontFamily: "Inter_700Bold", marginBottom: 4 },
  profileEmail: { fontSize: 13, color: "#64748b", fontFamily: "Inter_400Regular", marginBottom: 10 },
  cityBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#00d4ff" + "15", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginBottom: 8 },
  cityBadgeText: { color: "#00d4ff", fontSize: 12, fontFamily: "Inter_500Medium" },
  joinDate: { color: "#374151", fontSize: 12, fontFamily: "Inter_400Regular" },
  nabizCard: {
    backgroundColor: "#111827", borderRadius: 14, padding: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 24, borderWidth: 1, borderColor: "#00d4ff" + "30",
  },
  nabizLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  nabizLabel: { color: "#ffffff", fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  nabizSub: { color: "#64748b", fontSize: 12, fontFamily: "Inter_400Regular" },
  nabizRight: { flexDirection: "row", alignItems: "baseline", gap: 2 },
  nabizScore: { fontSize: 32, fontWeight: "900", fontFamily: "Inter_700Bold" },
  nabizMax: { color: "#64748b", fontSize: 14, fontFamily: "Inter_400Regular" },
  section: { backgroundColor: "#111827", borderRadius: 16, marginBottom: 16, overflow: "hidden", borderWidth: 1, borderColor: "#1e2a3d" },
  sectionTitle: { color: "#64748b", fontSize: 12, fontFamily: "Inter_500Medium", padding: 14, paddingBottom: 8, textTransform: "uppercase", letterSpacing: 1 },
  menuItem: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: "#1e2a3d" },
  lastMenuItem: { borderBottomWidth: 0 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#00d4ff" + "15", alignItems: "center", justifyContent: "center" },
  menuText: { flex: 1 },
  menuLabel: { color: "#e2e8f0", fontFamily: "Inter_500Medium", fontSize: 15 },
  menuSub: { color: "#64748b", fontSize: 12, fontFamily: "Inter_400Regular" },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: "#ff3b5c" + "15", borderWidth: 1, borderColor: "#ff3b5c" + "40",
    borderRadius: 14, padding: 16, marginBottom: 24,
  },
  logoutText: { color: "#ff3b5c", fontWeight: "700", fontSize: 15, fontFamily: "Inter_700Bold" },
  versionWrap: { alignItems: "center", gap: 8 },
  orbitLogo: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: "#1e2a3d", alignItems: "center", justifyContent: "center" },
  orbitRing: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: "#374151", borderStyle: "dashed" },
  versionText: { color: "#374151", fontSize: 12, fontFamily: "Inter_400Regular" },
  modalOverlay: { flex: 1, backgroundColor: "#000000cc", justifyContent: "flex-end" },
  modal: { backgroundColor: "#111827", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#ffffff", fontFamily: "Inter_700Bold", marginBottom: 16 },
  fieldLabel: { color: "#94a3b8", fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 8 },
  input: {
    backgroundColor: "#0a0e1a", borderWidth: 1, borderColor: "#1e2a3d",
    borderRadius: 12, padding: 14, color: "#ffffff", fontSize: 15, marginBottom: 14,
    fontFamily: "Inter_400Regular",
  },
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#1e2a3d", alignItems: "center" },
  cancelBtnText: { color: "#64748b", fontFamily: "Inter_500Medium" },
  confirmBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#00d4ff", alignItems: "center" },
  confirmBtnText: { color: "#0a0e1a", fontWeight: "700", fontFamily: "Inter_700Bold" },
});
