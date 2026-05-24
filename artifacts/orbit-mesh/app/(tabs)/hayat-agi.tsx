import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Alert, RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetNetwork, useSubmitCheckin, useGetStreak, useGetContacts,
  useAddContact, useDeleteContact, useCreateGroup, getGetNetworkQueryKey, getGetStreakQueryKey, getGetContactsQueryKey,
} from "@workspace/api-client-react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

export default function HayatAgiScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [showAddContact, setShowAddContact] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactRel, setContactRel] = useState("");
  const [groupName, setGroupName] = useState("");

  const { data: network, isLoading: netLoading, refetch: refetchNet } = useGetNetwork();
  const { data: streak } = useGetStreak();
  const { data: contacts, refetch: refetchContacts } = useGetContacts();

  const { mutate: checkin, isPending: checkingIn } = useSubmitCheckin({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetNetworkQueryKey() });
        qc.invalidateQueries({ queryKey: getGetStreakQueryKey() });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    },
  });

  const { mutate: addContact, isPending: addingContact } = useAddContact({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetContactsQueryKey() });
        setShowAddContact(false);
        setContactName(""); setContactPhone(""); setContactRel("");
      },
      onError: () => Alert.alert("Hata", "Kişi eklenemedi"),
    },
  });

  const { mutate: deleteContact } = useDeleteContact({
    mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getGetContactsQueryKey() }) },
  });

  const { mutate: createGroup, isPending: creatingGroup } = useCreateGroup({
    mutation: {
      onSuccess: () => {
        setShowCreateGroup(false);
        setGroupName("");
        Alert.alert("Başarılı", "Grup oluşturuldu!");
      },
    },
  });

  const statusColor = (s?: string | null) => {
    if (s === "ok") return "#00ff88";
    if (s === "alert") return "#ff3b5c";
    return "#ff9500";
  };

  const statusLabel = (s?: string | null) => {
    if (s === "ok") return "İyi";
    if (s === "alert") return "Yardım";
    return "Bekliyor";
  };

  const myStatus = network?.myStatus;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => { refetchNet(); refetchContacts(); }} tintColor="#00d4ff" />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>HayatAğı</Text>
          <Text style={styles.subtitle}>Ağının Güvenlik Durumu</Text>
        </View>

        {streak && (
          <View style={styles.streakCard}>
            <Feather name="zap" size={20} color="#ff9500" />
            <Text style={styles.streakText}>{streak.message}</Text>
            <View style={styles.streakBadge}>
              <Text style={styles.streakNum}>{streak.streak}</Text>
              <Text style={styles.streakDayLabel}>gün</Text>
            </View>
          </View>
        )}

        <View style={styles.checkinSection}>
          <Text style={styles.sectionTitle}>Günlük Durum</Text>
          {myStatus && (
            <View style={[styles.myStatusBadge, { borderColor: statusColor(myStatus) }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor(myStatus) }]} />
              <Text style={[styles.myStatusText, { color: statusColor(myStatus) }]}>
                Bugün: {statusLabel(myStatus)}
              </Text>
            </View>
          )}
          <View style={styles.checkinBtns}>
            <TouchableOpacity
              style={[styles.okBtn, checkingIn && styles.btnDisabled]}
              onPress={() => checkin({ data: { status: "ok" } })}
              disabled={checkingIn}
              activeOpacity={0.8}
            >
              {checkingIn ? <ActivityIndicator color="#0a0e1a" size="small" /> : (
                <>
                  <Feather name="check-circle" size={24} color="#0a0e1a" />
                  <Text style={styles.okBtnText}>İyiyim</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.helpBtn, checkingIn && styles.btnDisabled]}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                checkin({ data: { status: "alert" } });
              }}
              disabled={checkingIn}
              activeOpacity={0.8}
            >
              <Feather name="alert-triangle" size={24} color="#ffffff" />
              <Text style={styles.helpBtnText}>Yardım</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.networkSection}>
          <Text style={styles.sectionTitle}>Ağ Durumu</Text>
          {netLoading ? (
            <ActivityIndicator color="#00d4ff" style={{ marginTop: 20 }} />
          ) : (
            <>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={[styles.statNum, { color: "#00ff88" }]}>{network?.okCount ?? 0}</Text>
                  <Text style={styles.statLabel}>İyi</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statNum, { color: "#ff9500" }]}>{network?.pendingCount ?? 0}</Text>
                  <Text style={styles.statLabel}>Bekliyor</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statNum, { color: "#ff3b5c" }]}>{network?.alertCount ?? 0}</Text>
                  <Text style={styles.statLabel}>Yardım</Text>
                </View>
              </View>

              {(network?.members ?? []).length === 0 ? (
                <View style={styles.emptyState}>
                  <Feather name="users" size={32} color="#1e2a3d" />
                  <Text style={styles.emptyText}>Henüz kişi eklenmedi</Text>
                  <Text style={styles.emptySubText}>Acil kişilerini ekleyerek ağını oluştur</Text>
                </View>
              ) : (
                (network?.members ?? []).map((member) => (
                  <View key={member.id} style={styles.memberCard}>
                    <View style={[styles.memberAvatar, { borderColor: statusColor(member.todayStatus) }]}>
                      <Text style={styles.memberInitial}>{member.name[0]?.toUpperCase() ?? "?"}</Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      <Text style={styles.memberRel}>{member.relationship}</Text>
                      {member.city && <Text style={styles.memberCity}>{member.city}</Text>}
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: statusColor(member.todayStatus) + "20" }]}>
                      <View style={[styles.statusDot, { backgroundColor: statusColor(member.todayStatus) }]} />
                      <Text style={[styles.statusPillText, { color: statusColor(member.todayStatus) }]}>
                        {statusLabel(member.todayStatus)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </>
          )}
        </View>

        <View style={styles.contactsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Acil Kişiler</Text>
            <TouchableOpacity onPress={() => setShowAddContact(true)}>
              <Feather name="plus" size={20} color="#00d4ff" />
            </TouchableOpacity>
          </View>
          {(contacts ?? []).map((c) => (
            <View key={c.id} style={styles.contactRow}>
              <View style={styles.contactAvatar}>
                <Text style={styles.memberInitial}>{c.name[0]?.toUpperCase() ?? "?"}</Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.memberName}>{c.name}</Text>
                <Text style={styles.contactPhone}>{c.phone} · {c.relationship}</Text>
              </View>
              <TouchableOpacity onPress={() => deleteContact({ id: c.id })}>
                <Feather name="trash-2" size={16} color="#64748b" />
              </TouchableOpacity>
            </View>
          ))}
          {(contacts ?? []).length === 0 && (
            <Text style={styles.emptyText}>Henüz acil kişi eklenmedi</Text>
          )}
        </View>

        <TouchableOpacity style={styles.groupBtn} onPress={() => setShowCreateGroup(true)} activeOpacity={0.8}>
          <Feather name="users" size={18} color="#ff9500" />
          <Text style={styles.groupBtnText}>Yeni Grup Oluştur</Text>
        </TouchableOpacity>

        <View style={{ height: 100 + insets.bottom }} />
      </ScrollView>

      <Modal visible={showAddContact} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Acil Kişi Ekle</Text>
            <TextInput style={styles.input} value={contactName} onChangeText={setContactName} placeholder="Ad Soyad" placeholderTextColor="#64748b" />
            <TextInput style={styles.input} value={contactPhone} onChangeText={setContactPhone} placeholder="Telefon veya Email" placeholderTextColor="#64748b" keyboardType="phone-pad" />
            <TextInput style={styles.input} value={contactRel} onChangeText={setContactRel} placeholder="Yakınlık (Anne, Baba, Eş...)" placeholderTextColor="#64748b" />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddContact(false)}>
                <Text style={styles.cancelBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={() => addContact({ data: { name: contactName, phone: contactPhone, relationship: contactRel } })}
                disabled={addingContact}
              >
                <Text style={styles.confirmBtnText}>Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showCreateGroup} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Grup Oluştur</Text>
            <TextInput style={styles.input} value={groupName} onChangeText={setGroupName} placeholder="Grup adı (Aile, Sınıf...)" placeholderTextColor="#64748b" />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreateGroup(false)}>
                <Text style={styles.cancelBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={() => createGroup({ data: { name: groupName, checkInTime: "21:00" } })}
                disabled={creatingGroup}
              >
                <Text style={styles.confirmBtnText}>Oluştur</Text>
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
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: "800", color: "#ffffff", fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 14, color: "#64748b", marginTop: 4, fontFamily: "Inter_400Regular" },
  streakCard: {
    backgroundColor: "#111827", borderRadius: 14, padding: 16,
    flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20,
    borderWidth: 1, borderColor: "#ff9500" + "40",
  },
  streakText: { flex: 1, color: "#e2e8f0", fontFamily: "Inter_500Medium", fontSize: 14 },
  streakBadge: { alignItems: "center" },
  streakNum: { fontSize: 22, fontWeight: "800", color: "#ff9500", fontFamily: "Inter_700Bold" },
  streakDayLabel: { fontSize: 11, color: "#64748b", fontFamily: "Inter_400Regular" },
  checkinSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#ffffff", marginBottom: 12, fontFamily: "Inter_700Bold" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  myStatusBadge: {
    flexDirection: "row", alignItems: "center", gap: 8, padding: 10,
    borderRadius: 10, borderWidth: 1, marginBottom: 12, backgroundColor: "#111827",
  },
  myStatusText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  checkinBtns: { flexDirection: "row", gap: 12 },
  okBtn: {
    flex: 1, backgroundColor: "#00ff88", borderRadius: 16, padding: 20,
    alignItems: "center", gap: 8,
  },
  helpBtn: {
    flex: 1, backgroundColor: "#ff3b5c", borderRadius: 16, padding: 20,
    alignItems: "center", gap: 8,
  },
  btnDisabled: { opacity: 0.5 },
  okBtnText: { color: "#0a0e1a", fontWeight: "800", fontSize: 16, fontFamily: "Inter_700Bold" },
  helpBtnText: { color: "#ffffff", fontWeight: "800", fontSize: 16, fontFamily: "Inter_700Bold" },
  networkSection: { marginBottom: 24 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: "#111827", borderRadius: 12, padding: 14,
    alignItems: "center", borderWidth: 1, borderColor: "#1e2a3d",
  },
  statNum: { fontSize: 28, fontWeight: "800", fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, color: "#64748b", marginTop: 2, fontFamily: "Inter_400Regular" },
  memberCard: {
    backgroundColor: "#111827", borderRadius: 14, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8,
    borderWidth: 1, borderColor: "#1e2a3d",
  },
  memberAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: "#1e2a3d",
    alignItems: "center", justifyContent: "center", borderWidth: 2,
  },
  contactAvatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: "#1e2a3d",
    alignItems: "center", justifyContent: "center",
  },
  memberInitial: { color: "#ffffff", fontWeight: "700", fontSize: 16, fontFamily: "Inter_700Bold" },
  memberInfo: { flex: 1 },
  memberName: { color: "#ffffff", fontWeight: "600", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  memberRel: { color: "#64748b", fontSize: 13, fontFamily: "Inter_400Regular" },
  memberCity: { color: "#00d4ff", fontSize: 12, fontFamily: "Inter_400Regular" },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusPillText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  emptyState: { alignItems: "center", paddingVertical: 30, gap: 8 },
  emptyText: { color: "#64748b", fontFamily: "Inter_400Regular", textAlign: "center" },
  emptySubText: { color: "#374151", fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  contactsSection: { marginBottom: 20 },
  contactRow: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 12,
    backgroundColor: "#111827", borderRadius: 12, marginBottom: 8,
    borderWidth: 1, borderColor: "#1e2a3d",
  },
  contactInfo: { flex: 1 },
  contactPhone: { color: "#64748b", fontSize: 13, fontFamily: "Inter_400Regular" },
  groupBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 1, borderColor: "#ff9500" + "60", borderRadius: 14, padding: 14,
    marginBottom: 12, backgroundColor: "#ff9500" + "10",
  },
  groupBtnText: { color: "#ff9500", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: "#000000cc", justifyContent: "flex-end" },
  modal: {
    backgroundColor: "#111827", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#ffffff", fontFamily: "Inter_700Bold", marginBottom: 4 },
  input: {
    backgroundColor: "#0a0e1a", borderWidth: 1, borderColor: "#1e2a3d",
    borderRadius: 12, padding: 14, color: "#ffffff", fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#1e2a3d", alignItems: "center" },
  cancelBtnText: { color: "#64748b", fontFamily: "Inter_500Medium" },
  confirmBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#00d4ff", alignItems: "center" },
  confirmBtnText: { color: "#0a0e1a", fontWeight: "700", fontFamily: "Inter_700Bold" },
});
