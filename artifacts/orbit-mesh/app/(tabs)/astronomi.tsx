import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, RefreshControl, Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetObservations, useCreateObservation, useDeleteObservation,
  useGetMissions, useCompleteMission,
  getGetObservationsQueryKey, getGetMissionsQueryKey,
} from "@workspace/api-client-react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

const OBSERVATION_TYPES = [
  { key: "meteor", label: "Meteor", icon: "star" },
  { key: "planet", label: "Gezegen", icon: "circle" },
  { key: "nebula", label: "Nebula", icon: "cloud" },
  { key: "anomaly", label: "Anomali", icon: "alert-triangle" },
  { key: "star", label: "Yıldız", icon: "sun" },
  { key: "other", label: "Diğer", icon: "eye" },
];

const BADGE_COLORS: Record<string, string> = {
  bronze: "#cd7f32",
  silver: "#c0c0c0",
  gold: "#ffd700",
};

export default function AstronomiScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"mine" | "community" | "missions">("mine");
  const [showCreate, setShowCreate] = useState(false);
  const [showMissionModal, setShowMissionModal] = useState<number | null>(null);
  const [missionNotes, setMissionNotes] = useState("");
  const [newObs, setNewObs] = useState({ type: "star", title: "", description: "", isPublic: true });

  const { data: myObs, isLoading: myLoading, refetch: refetchMine } = useGetObservations({ public: false });
  const { data: publicObs, isLoading: pubLoading, refetch: refetchPub } = useGetObservations({ public: true });
  const { data: missions, isLoading: missionsLoading, refetch: refetchMissions } = useGetMissions();

  const { mutate: createObs, isPending: creating } = useCreateObservation({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetObservationsQueryKey() });
        setShowCreate(false);
        setNewObs({ type: "star", title: "", description: "", isPublic: true });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    },
  });

  const { mutate: deleteObs } = useDeleteObservation({
    mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getGetObservationsQueryKey() }) },
  });

  const { mutate: completeMission, isPending: completing } = useCompleteMission({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetMissionsQueryKey() });
        setShowMissionModal(null);
        setMissionNotes("");
        Alert.alert("Tebrikler!", "Görevi tamamladın! Rozet kazandın!");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    },
  });

  const typeInfo = (key: string) => OBSERVATION_TYPES.find(t => t.key === key) ?? OBSERVATION_TYPES[5]!;

  const renderObs = (obs: typeof myObs, loading: boolean) => {
    if (loading) return <ActivityIndicator color="#00d4ff" style={{ marginTop: 40 }} />;
    if (!obs || obs.length === 0) return (
      <View style={styles.emptyState}>
        <Feather name="telescope" size={40} color="#1e2a3d" />
        <Text style={styles.emptyText}>Henüz gözlem yok</Text>
      </View>
    );
    return obs.map(o => (
      <View key={o.id} style={styles.obsCard}>
        <View style={styles.obsHeader}>
          <View style={styles.obsTypeTag}>
            <Feather name={typeInfo(o.type).icon as "star"} size={12} color="#00d4ff" />
            <Text style={styles.obsTypeText}>{typeInfo(o.type).label}</Text>
          </View>
          <Text style={styles.obsDate}>{new Date(o.createdAt).toLocaleDateString("tr-TR")}</Text>
          {tab === "mine" && (
            <TouchableOpacity onPress={() => deleteObs({ id: o.id })}>
              <Feather name="trash-2" size={14} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.obsTitle}>{o.title}</Text>
        {o.description && <Text style={styles.obsDesc}>{o.description}</Text>}
        <View style={styles.obsMeta}>
          <Text style={styles.obsUser}>{o.userName}</Text>
          <View style={styles.obsStats}>
            <Feather name="heart" size={13} color="#64748b" />
            <Text style={styles.obsStatNum}>{o.likeCount}</Text>
            <Feather name="message-circle" size={13} color="#64748b" />
            <Text style={styles.obsStatNum}>{o.commentCount}</Text>
          </View>
        </View>
      </View>
    ));
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Astronomi</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
          <Feather name="plus" size={18} color="#0a0e1a" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        {(["mine", "community", "missions"] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.activeTab]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.activeTabText]}>
              {t === "mine" ? "Benim" : t === "community" ? "Topluluk" : "Görevler"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => { refetchMine(); refetchPub(); refetchMissions(); }} tintColor="#00d4ff" />}
      >
        {tab === "mine" && renderObs(myObs, myLoading)}
        {tab === "community" && renderObs(publicObs, pubLoading)}
        {tab === "missions" && (
          missionsLoading ? <ActivityIndicator color="#00d4ff" style={{ marginTop: 40 }} /> :
          (missions ?? []).map(m => (
            <View key={m.id} style={[styles.missionCard, m.isCompleted && styles.missionDone]}>
              <View style={styles.missionTop}>
                <View style={[styles.badgePill, { backgroundColor: BADGE_COLORS[m.badge ?? "bronze"] + "20" }]}>
                  <Text style={[styles.badgeText, { color: BADGE_COLORS[m.badge ?? "bronze"] }]}>
                    {m.badge === "gold" ? "Altın" : m.badge === "silver" ? "Gümüş" : "Bronz"}
                  </Text>
                </View>
                {m.isCompleted && (
                  <View style={styles.completedBadge}>
                    <Feather name="check" size={12} color="#00ff88" />
                    <Text style={styles.completedText}>Tamamlandı</Text>
                  </View>
                )}
              </View>
              <Text style={styles.missionTitle}>{m.title}</Text>
              <Text style={styles.missionDesc}>{m.description}</Text>
              <View style={styles.missionMeta}>
                <Feather name="users" size={13} color="#64748b" />
                <Text style={styles.missionParticipants}>{m.participantCount} katılımcı</Text>
                {m.endDate && <Text style={styles.missionDeadline}>Bitiş: {new Date(m.endDate).toLocaleDateString("tr-TR")}</Text>}
              </View>
              {!m.isCompleted && (
                <TouchableOpacity style={styles.joinMissionBtn} onPress={() => setShowMissionModal(m.id)}>
                  <Text style={styles.joinMissionText}>Görevi Tamamla</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
        <View style={{ height: 100 + insets.bottom }} />
      </ScrollView>

      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Yeni Gözlem</Text>
            <ScrollView>
              <Text style={styles.fieldLabel}>Tür</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {OBSERVATION_TYPES.map(t => (
                    <TouchableOpacity
                      key={t.key}
                      style={[styles.typeBtn, newObs.type === t.key && styles.typeBtnActive]}
                      onPress={() => setNewObs(p => ({ ...p, type: t.key }))}
                    >
                      <Text style={[styles.typeBtnText, newObs.type === t.key && styles.typeBtnTextActive]}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <Text style={styles.fieldLabel}>Başlık</Text>
              <TextInput style={styles.input} value={newObs.title} onChangeText={v => setNewObs(p => ({ ...p, title: v }))} placeholder="Ne gözlemledi?" placeholderTextColor="#64748b" />
              <Text style={styles.fieldLabel}>Açıklama</Text>
              <TextInput style={[styles.input, { height: 80 }]} value={newObs.description} onChangeText={v => setNewObs(p => ({ ...p, description: v }))} placeholder="Detaylar..." placeholderTextColor="#64748b" multiline />
              <TouchableOpacity style={styles.publicToggle} onPress={() => setNewObs(p => ({ ...p, isPublic: !p.isPublic }))}>
                <Feather name={newObs.isPublic ? "globe" : "lock"} size={16} color={newObs.isPublic ? "#00d4ff" : "#64748b"} />
                <Text style={[styles.publicToggleText, newObs.isPublic && { color: "#00d4ff" }]}>
                  {newObs.isPublic ? "Herkese Açık" : "Gizli"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreate(false)}>
                <Text style={styles.cancelBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, creating && { opacity: 0.6 }]}
                onPress={() => createObs({ data: newObs })}
                disabled={creating}
              >
                <Text style={styles.confirmBtnText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showMissionModal !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Görevi Tamamla</Text>
            <Text style={styles.fieldLabel}>Notlar</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              value={missionNotes}
              onChangeText={setMissionNotes}
              placeholder="Görevi nasıl tamamladını anlat..."
              placeholderTextColor="#64748b"
              multiline
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowMissionModal(null)}>
                <Text style={styles.cancelBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, completing && { opacity: 0.6 }]}
                onPress={() => showMissionModal !== null && completeMission({ id: showMissionModal, data: { notes: missionNotes } })}
                disabled={completing}
              >
                <Text style={styles.confirmBtnText}>Gönder</Text>
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
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, paddingBottom: 0 },
  title: { fontSize: 28, fontWeight: "800", color: "#ffffff", fontFamily: "Inter_700Bold" },
  createBtn: { backgroundColor: "#00d4ff", width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  tabBar: { flexDirection: "row", marginHorizontal: 16, marginTop: 16, backgroundColor: "#111827", borderRadius: 12, padding: 4 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 8 },
  activeTab: { backgroundColor: "#1e2a3d" },
  tabText: { color: "#64748b", fontSize: 13, fontFamily: "Inter_500Medium" },
  activeTabText: { color: "#00d4ff", fontFamily: "Inter_600SemiBold" },
  scroll: { padding: 16 },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { color: "#64748b", fontFamily: "Inter_400Regular" },
  obsCard: {
    backgroundColor: "#111827", borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: "#1e2a3d",
  },
  obsHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  obsTypeTag: {
    flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: "#00d4ff" + "20", borderRadius: 8,
  },
  obsTypeText: { color: "#00d4ff", fontSize: 11, fontFamily: "Inter_500Medium" },
  obsDate: { flex: 1, color: "#64748b", fontSize: 12, fontFamily: "Inter_400Regular" },
  obsTitle: { fontSize: 16, fontWeight: "700", color: "#ffffff", fontFamily: "Inter_700Bold", marginBottom: 4 },
  obsDesc: { color: "#94a3b8", fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 8, lineHeight: 18 },
  obsMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  obsUser: { color: "#64748b", fontSize: 12, fontFamily: "Inter_400Regular" },
  obsStats: { flexDirection: "row", alignItems: "center", gap: 6 },
  obsStatNum: { color: "#64748b", fontSize: 12, fontFamily: "Inter_400Regular" },
  missionCard: {
    backgroundColor: "#111827", borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: "#1e2a3d",
  },
  missionDone: { opacity: 0.7 },
  missionTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  badgePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  completedBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  completedText: { color: "#00ff88", fontSize: 12, fontFamily: "Inter_500Medium" },
  missionTitle: { fontSize: 16, fontWeight: "700", color: "#ffffff", fontFamily: "Inter_700Bold", marginBottom: 6 },
  missionDesc: { color: "#94a3b8", fontSize: 13, lineHeight: 18, fontFamily: "Inter_400Regular", marginBottom: 10 },
  missionMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  missionParticipants: { color: "#64748b", fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  missionDeadline: { color: "#ff9500", fontSize: 12, fontFamily: "Inter_400Regular" },
  joinMissionBtn: { backgroundColor: "#00d4ff" + "20", borderWidth: 1, borderColor: "#00d4ff" + "60", borderRadius: 10, padding: 12, alignItems: "center" },
  joinMissionText: { color: "#00d4ff", fontFamily: "Inter_600SemiBold" },
  modalOverlay: { flex: 1, backgroundColor: "#000000cc", justifyContent: "flex-end" },
  modal: { backgroundColor: "#111827", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "80%" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#ffffff", fontFamily: "Inter_700Bold", marginBottom: 16 },
  fieldLabel: { color: "#94a3b8", fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 8 },
  input: {
    backgroundColor: "#0a0e1a", borderWidth: 1, borderColor: "#1e2a3d",
    borderRadius: 12, padding: 14, color: "#ffffff", fontSize: 15, marginBottom: 14,
    fontFamily: "Inter_400Regular",
  },
  typeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "#1e2a3d", backgroundColor: "#0a0e1a" },
  typeBtnActive: { borderColor: "#00d4ff", backgroundColor: "#00d4ff" + "20" },
  typeBtnText: { color: "#64748b", fontSize: 13, fontFamily: "Inter_500Medium" },
  typeBtnTextActive: { color: "#00d4ff" },
  publicToggle: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  publicToggleText: { color: "#64748b", fontFamily: "Inter_500Medium" },
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#1e2a3d", alignItems: "center" },
  cancelBtnText: { color: "#64748b", fontFamily: "Inter_500Medium" },
  confirmBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#00d4ff", alignItems: "center" },
  confirmBtnText: { color: "#0a0e1a", fontWeight: "700", fontFamily: "Inter_700Bold" },
});
