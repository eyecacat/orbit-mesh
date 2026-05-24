import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Alert, RefreshControl, Linking,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetNetwork, useSubmitCheckin, useGetStreak, useGetContacts,
  useAddContact, useDeleteContact, useCreateGroup, useGetGroups,
  useGetGroupMembers, useInviteGroupMember, useRemoveGroupMember,
  getGetNetworkQueryKey, getGetStreakQueryKey, getGetContactsQueryKey,
  getGetGroupsQueryKey, getGetGroupMembersQueryKey,
} from "@workspace/api-client-react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useAuth } from "@/contexts/AuthContext";
import { useEmergency } from "@/hooks/useEmergency";

type Tab = "network" | "groups" | "contacts";

export default function HayatAgiScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { getLocation, sendEmergencySMS } = useEmergency();
  const [tab, setTab] = useState<Tab>("network");
  const [showAddContact, setShowAddContact] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showInvite, setShowInvite] = useState<number | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactRel, setContactRel] = useState("");
  const [groupName, setGroupName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  const { data: network, isLoading: netLoading, refetch: refetchNet } = useGetNetwork();
  const { data: streak } = useGetStreak();
  const { data: contacts, refetch: refetchContacts } = useGetContacts();
  const { data: groups, isLoading: groupsLoading, refetch: refetchGroups } = useGetGroups();
  const { data: groupMembers } = useGetGroupMembers(expandedGroup ?? 0, {
    query: {
      enabled: expandedGroup !== null,
      queryKey: getGetGroupMembersQueryKey(expandedGroup ?? 0),
    },
  });

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
        qc.invalidateQueries({ queryKey: getGetGroupsQueryKey() });
        setShowCreateGroup(false);
        setGroupName("");
        setTab("groups");
      },
    },
  });

  const { mutate: inviteMember, isPending: inviting } = useInviteGroupMember({
    mutation: {
      onSuccess: () => {
        if (expandedGroup !== null) {
          qc.invalidateQueries({ queryKey: getGetGroupMembersQueryKey(expandedGroup) });
          qc.invalidateQueries({ queryKey: getGetGroupsQueryKey() });
        }
        setShowInvite(null);
        setInviteEmail("");
        Alert.alert("Başarılı", "Üye gruba eklendi!");
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Üye eklenemedi";
        Alert.alert("Hata", msg);
      },
    },
  });

  const { mutate: removeMember } = useRemoveGroupMember({
    mutation: {
      onSuccess: () => {
        if (expandedGroup !== null) {
          qc.invalidateQueries({ queryKey: getGetGroupMembersQueryKey(expandedGroup) });
          qc.invalidateQueries({ queryKey: getGetGroupsQueryKey() });
        }
      },
    },
  });

  const handleYardim = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    const locationText = await getLocation();
    const allContacts = (contacts ?? []).map(c => ({ name: c.name, phone: c.phone }));
    await sendEmergencySMS(allContacts, user?.name ?? "Kullanıcı", locationText);
    checkin({ data: { status: "alert" } });
  };

  const statusColor = (s?: string | null) => s === "ok" ? "#00ff88" : s === "alert" ? "#ff3b5c" : "#ff9500";
  const statusLabel = (s?: string | null) => s === "ok" ? "İyi" : s === "alert" ? "Yardım" : "Bekliyor";
  const myStatus = network?.myStatus;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>HayatAğı</Text>
        <Text style={styles.subtitle}>Ağının Güvenlik Durumu</Text>
      </View>

      {streak && (
        <View style={styles.streakCard}>
          <Feather name="zap" size={18} color="#ff9500" />
          <Text style={styles.streakText}>{streak.message}</Text>
          <View style={styles.streakBadge}>
            <Text style={styles.streakNum}>{streak.streak}</Text>
            <Text style={styles.streakDay}>gün</Text>
          </View>
        </View>
      )}

      <View style={styles.checkinRow}>
        <TouchableOpacity
          style={[styles.okBtn, checkingIn && { opacity: 0.5 }]}
          onPress={() => checkin({ data: { status: "ok" } })}
          disabled={checkingIn}
          activeOpacity={0.8}
        >
          {checkingIn ? <ActivityIndicator color="#0a0e1a" size="small" /> : (
            <>
              <Feather name="check-circle" size={20} color="#0a0e1a" />
              <Text style={styles.okBtnText}>İyiyim</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.helpBtn, checkingIn && { opacity: 0.5 }]}
          onPress={handleYardim}
          disabled={checkingIn}
          activeOpacity={0.8}
        >
          <Feather name="alert-triangle" size={20} color="#ffffff" />
          <Text style={styles.helpBtnText}>Yardım + SMS</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        {(["network", "groups", "contacts"] as Tab[]).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.activeTab]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.activeTabText]}>
              {t === "network" ? "Ağ" : t === "groups" ? `Gruplar (${groups?.length ?? 0})` : "Kişiler"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => { refetchNet(); refetchContacts(); refetchGroups(); }} tintColor="#00d4ff" />}
      >
        {tab === "network" && (
          <>
            {myStatus && (
              <View style={[styles.myStatusBadge, { borderColor: statusColor(myStatus) }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColor(myStatus) }]} />
                <Text style={[styles.myStatusText, { color: statusColor(myStatus) }]}>Bugün: {statusLabel(myStatus)}</Text>
              </View>
            )}
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
                    <Text style={styles.emptySubText}>Acil kişi ekleyerek ağını kur</Text>
                  </View>
                ) : (
                  (network?.members ?? []).map(member => (
                    <View key={member.id} style={styles.memberCard}>
                      <View style={[styles.memberAvatar, { borderColor: statusColor(member.todayStatus) }]}>
                        <Text style={styles.memberInitial}>{member.name[0]?.toUpperCase() ?? "?"}</Text>
                        <View style={[styles.statusIndicator, { backgroundColor: statusColor(member.todayStatus) }]} />
                      </View>
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>{member.name}</Text>
                        <Text style={styles.memberRel}>{member.relationship}</Text>
                        {member.city && <Text style={styles.memberCity}><Feather name="map-pin" size={10} color="#00d4ff" /> {member.city}</Text>}
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
          </>
        )}

        {tab === "groups" && (
          <>
            <TouchableOpacity style={styles.createGroupBtn} onPress={() => setShowCreateGroup(true)}>
              <Feather name="plus" size={16} color="#ff9500" />
              <Text style={styles.createGroupText}>Yeni Grup Oluştur</Text>
            </TouchableOpacity>
            {groupsLoading ? <ActivityIndicator color="#00d4ff" style={{ marginTop: 20 }} /> : null}
            {(groups ?? []).length === 0 && !groupsLoading && (
              <View style={styles.emptyState}>
                <Feather name="users" size={32} color="#1e2a3d" />
                <Text style={styles.emptyText}>Henüz grup yok</Text>
                <Text style={styles.emptySubText}>Aile, sınıf veya arkadaş grupları oluştur</Text>
              </View>
            )}
            {(groups ?? []).map(group => {
              const isExpanded = expandedGroup === group.id;
              return (
                <View key={group.id} style={styles.groupCard}>
                  <TouchableOpacity style={styles.groupHeader} onPress={() => setExpandedGroup(isExpanded ? null : group.id)} activeOpacity={0.8}>
                    <View style={styles.groupAvatar}>
                      <Text style={styles.groupAvatarText}>{group.name[0]?.toUpperCase() ?? "G"}</Text>
                    </View>
                    <View style={styles.groupInfo}>
                      <Text style={styles.groupName}>{group.name}</Text>
                      <Text style={styles.groupMeta}>
                        {group.memberCount} üye · {group.isAdmin ? "Yönetici" : group.adminName}
                      </Text>
                    </View>
                    <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color="#64748b" />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.groupExpanded}>
                      {group.isAdmin && (
                        <TouchableOpacity style={styles.inviteBtn} onPress={() => setShowInvite(group.id)}>
                          <Feather name="user-plus" size={14} color="#00d4ff" />
                          <Text style={styles.inviteBtnText}>Üye Davet Et</Text>
                        </TouchableOpacity>
                      )}
                      {(groupMembers ?? []).map(m => (
                        <View key={m.id} style={styles.memberRow}>
                          <View style={styles.memberRowAvatar}>
                            <Text style={styles.memberRowInitial}>{m.userName[0]?.toUpperCase() ?? "?"}</Text>
                          </View>
                          <View style={styles.memberRowInfo}>
                            <Text style={styles.memberRowName}>{m.userName}</Text>
                            <Text style={styles.memberRowEmail}>{m.userEmail}</Text>
                          </View>
                          {group.isAdmin && m.id !== 0 && (
                            <TouchableOpacity onPress={() => Alert.alert("Üyeyi Çıkar", `${m.userName} grubu çıkarılsın mı?`, [
                              { text: "İptal", style: "cancel" },
                              { text: "Çıkar", style: "destructive", onPress: () => removeMember({ groupId: group.id, userId: m.userId }) },
                            ])}>
                              <Feather name="user-minus" size={16} color="#ff3b5c" />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}

        {tab === "contacts" && (
          <>
            <TouchableOpacity style={styles.addContactBtn} onPress={() => setShowAddContact(true)}>
              <Feather name="plus" size={16} color="#00d4ff" />
              <Text style={styles.addContactText}>Acil Kişi Ekle</Text>
            </TouchableOpacity>
            {(contacts ?? []).length === 0 && (
              <View style={styles.emptyState}>
                <Feather name="phone-missed" size={32} color="#1e2a3d" />
                <Text style={styles.emptyText}>Henüz acil kişi yok</Text>
                <Text style={styles.emptySubText}>Yardım butonuna basıldığında SMS gönderilecek kişiler</Text>
              </View>
            )}
            {(contacts ?? []).map(c => (
              <View key={c.id} style={styles.contactRow}>
                <View style={styles.contactAvatar}>
                  <Text style={styles.memberInitial}>{c.name[0]?.toUpperCase() ?? "?"}</Text>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.memberName}>{c.name}</Text>
                  <Text style={styles.contactPhone}>{c.phone} · {c.relationship}</Text>
                </View>
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${c.phone}`)} style={styles.callBtn}>
                  <Feather name="phone" size={16} color="#00ff88" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteContact({ id: c.id })}>
                  <Feather name="trash-2" size={16} color="#64748b" />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
        <View style={{ height: 100 + insets.bottom }} />
      </ScrollView>

      <Modal visible={showAddContact} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Acil Kişi Ekle</Text>
            <TextInput style={styles.input} value={contactName} onChangeText={setContactName} placeholder="Ad Soyad" placeholderTextColor="#64748b" />
            <TextInput style={styles.input} value={contactPhone} onChangeText={setContactPhone} placeholder="Telefon numarası veya email" placeholderTextColor="#64748b" keyboardType="phone-pad" />
            <TextInput style={styles.input} value={contactRel} onChangeText={setContactRel} placeholder="Yakınlık (Anne, Baba, Eş...)" placeholderTextColor="#64748b" />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddContact(false)}>
                <Text style={styles.cancelBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={() => addContact({ data: { name: contactName, phone: contactPhone, relationship: contactRel } })} disabled={addingContact}>
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
              <TouchableOpacity style={styles.confirmBtn} onPress={() => createGroup({ data: { name: groupName, checkInTime: "21:00" } })} disabled={creatingGroup}>
                <Text style={styles.confirmBtnText}>Oluştur</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showInvite !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Üye Davet Et</Text>
            <Text style={styles.modalSub}>Kullanıcının ORBIT-MESH email adresi</Text>
            <TextInput style={styles.input} value={inviteEmail} onChangeText={setInviteEmail} placeholder="ornek@email.com" placeholderTextColor="#64748b" keyboardType="email-address" autoCapitalize="none" />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowInvite(null)}>
                <Text style={styles.cancelBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, inviting && { opacity: 0.6 }]}
                onPress={() => showInvite !== null && inviteMember({ groupId: showInvite, data: { email: inviteEmail } })}
                disabled={inviting}
              >
                {inviting ? <ActivityIndicator color="#0a0e1a" size="small" /> : <Text style={styles.confirmBtnText}>Davet Et</Text>}
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
  header: { padding: 16, paddingBottom: 0 },
  title: { fontSize: 28, fontWeight: "800", color: "#ffffff", fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, color: "#64748b", marginTop: 2, fontFamily: "Inter_400Regular" },
  streakCard: {
    flexDirection: "row", alignItems: "center", gap: 10, margin: 16, marginBottom: 8,
    backgroundColor: "#111827", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#ff9500" + "40",
  },
  streakText: { flex: 1, color: "#e2e8f0", fontSize: 13, fontFamily: "Inter_500Medium" },
  streakBadge: { alignItems: "center" },
  streakNum: { fontSize: 20, fontWeight: "800", color: "#ff9500", fontFamily: "Inter_700Bold" },
  streakDay: { fontSize: 10, color: "#64748b", fontFamily: "Inter_400Regular" },
  checkinRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  okBtn: { flex: 1, backgroundColor: "#00ff88", borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  okBtnText: { color: "#0a0e1a", fontWeight: "800", fontSize: 15, fontFamily: "Inter_700Bold" },
  helpBtn: { flex: 1, backgroundColor: "#ff3b5c", borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  helpBtnText: { color: "#ffffff", fontWeight: "800", fontSize: 15, fontFamily: "Inter_700Bold" },
  tabBar: { flexDirection: "row", marginHorizontal: 16, marginBottom: 8, backgroundColor: "#111827", borderRadius: 12, padding: 4 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 8 },
  activeTab: { backgroundColor: "#1e2a3d" },
  tabText: { color: "#64748b", fontSize: 12, fontFamily: "Inter_500Medium" },
  activeTabText: { color: "#00d4ff", fontFamily: "Inter_600SemiBold" },
  scroll: { padding: 16, paddingTop: 4 },
  myStatusBadge: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 12, backgroundColor: "#111827" },
  myStatusText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: "#111827", borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "#1e2a3d" },
  statNum: { fontSize: 26, fontWeight: "800", fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, color: "#64748b", fontFamily: "Inter_400Regular" },
  memberCard: { backgroundColor: "#111827", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8, borderWidth: 1, borderColor: "#1e2a3d" },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#1e2a3d", alignItems: "center", justifyContent: "center", borderWidth: 2 },
  memberInitial: { color: "#ffffff", fontWeight: "700", fontSize: 16, fontFamily: "Inter_700Bold" },
  statusIndicator: { position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: "#0a0e1a" },
  memberInfo: { flex: 1 },
  memberName: { color: "#ffffff", fontWeight: "600", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  memberRel: { color: "#64748b", fontSize: 12, fontFamily: "Inter_400Regular" },
  memberCity: { color: "#00d4ff", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyText: { color: "#64748b", fontFamily: "Inter_400Regular" },
  emptySubText: { color: "#374151", fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  createGroupBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "#ff9500" + "60", borderRadius: 12, padding: 14, marginBottom: 14, backgroundColor: "#ff9500" + "10" },
  createGroupText: { color: "#ff9500", fontFamily: "Inter_600SemiBold" },
  groupCard: { backgroundColor: "#111827", borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: "#1e2a3d", overflow: "hidden" },
  groupHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  groupAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#00d4ff" + "20", alignItems: "center", justifyContent: "center" },
  groupAvatarText: { color: "#00d4ff", fontWeight: "800", fontSize: 16, fontFamily: "Inter_700Bold" },
  groupInfo: { flex: 1 },
  groupName: { color: "#ffffff", fontWeight: "700", fontSize: 15, fontFamily: "Inter_700Bold" },
  groupMeta: { color: "#64748b", fontSize: 12, fontFamily: "Inter_400Regular" },
  groupExpanded: { borderTopWidth: 1, borderTopColor: "#1e2a3d", padding: 14, gap: 8 },
  inviteBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#00d4ff" + "15", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "#00d4ff" + "40", alignSelf: "flex-start" },
  inviteBtnText: { color: "#00d4ff", fontFamily: "Inter_600SemiBold", fontSize: 13 },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  memberRowAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#1e2a3d", alignItems: "center", justifyContent: "center" },
  memberRowInitial: { color: "#94a3b8", fontFamily: "Inter_700Bold", fontSize: 12 },
  memberRowInfo: { flex: 1 },
  memberRowName: { color: "#e2e8f0", fontFamily: "Inter_600SemiBold", fontSize: 13 },
  memberRowEmail: { color: "#64748b", fontSize: 11, fontFamily: "Inter_400Regular" },
  addContactBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "#00d4ff" + "60", borderRadius: 12, padding: 14, marginBottom: 14, backgroundColor: "#00d4ff" + "10" },
  addContactText: { color: "#00d4ff", fontFamily: "Inter_600SemiBold" },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: "#111827", borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: "#1e2a3d" },
  contactAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#1e2a3d", alignItems: "center", justifyContent: "center" },
  contactInfo: { flex: 1 },
  contactPhone: { color: "#64748b", fontSize: 12, fontFamily: "Inter_400Regular" },
  callBtn: { padding: 4 },
  modalOverlay: { flex: 1, backgroundColor: "#000000cc", justifyContent: "flex-end" },
  modal: { backgroundColor: "#111827", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#ffffff", fontFamily: "Inter_700Bold" },
  modalSub: { color: "#64748b", fontSize: 13, fontFamily: "Inter_400Regular", marginTop: -4 },
  input: { backgroundColor: "#0a0e1a", borderWidth: 1, borderColor: "#1e2a3d", borderRadius: 12, padding: 14, color: "#ffffff", fontSize: 15, fontFamily: "Inter_400Regular" },
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#1e2a3d", alignItems: "center" },
  cancelBtnText: { color: "#64748b", fontFamily: "Inter_500Medium" },
  confirmBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#00d4ff", alignItems: "center" },
  confirmBtnText: { color: "#0a0e1a", fontWeight: "700", fontFamily: "Inter_700Bold" },
});
