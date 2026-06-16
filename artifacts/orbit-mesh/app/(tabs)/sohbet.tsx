import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView as KAV } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const INITIAL_MSG: Message = {
  id: "sys-1",
  role: "assistant",
  content: "Merhaba! Ben ORBIT-MESH yapay zeka asistanıyım. Astronomi, Deneyap Kart, BLE ağları, VLF sinyalleri ve güvenlik ağları hakkında soru sorabilirsin.",
  timestamp: new Date(),
};

function getApiBase() {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}/api`;
  return "/api";
}

export default function SohbetScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([INITIAL_MSG]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const flatRef = useRef<FlatList>(null);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInput("");
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text, timestamp: new Date() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      const apiMessages = newMessages
        .filter(m => m.id !== "sys-1")
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch(`${getApiBase()}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (res.ok) {
        const data = await res.json();
        const aiContent = data.choices?.[0]?.message?.content ?? "Yanıt alınamadı.";
        const aiMsg: Message = { id: (Date.now() + 1).toString(), role: "assistant", content: aiContent, timestamp: new Date() };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        throw new Error("API error");
      }
    } catch {
      const errMsg: Message = { id: (Date.now() + 1).toString(), role: "assistant", content: "Bağlantı hatası. Lütfen tekrar dene.", timestamp: new Date() };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }

  function renderMessage({ item }: { item: Message }) {
    const isUser = item.role === "user";
    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowRight : styles.msgRowLeft]}>
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: colors.primary + "22" }]}>
            <Feather name="cpu" size={14} color={colors.primary} />
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isUser
              ? [styles.userBubble, { backgroundColor: colors.primary }]
              : [styles.aiBubble, { backgroundColor: colors.card, borderColor: colors.border }],
          ]}
        >
          <Text style={[styles.bubbleText, { color: isUser ? colors.background : colors.foreground }]}>
            {item.content}
          </Text>
          <Text style={[styles.timeText, { color: isUser ? colors.background + "99" : colors.mutedForeground }]}>
            {item.timestamp.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
      </View>
    );
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <View style={[styles.aiAvatar, { backgroundColor: colors.primary + "22" }]}>
          <Feather name="cpu" size={20} color={colors.primary} />
        </View>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>ORBIT AI</Text>
          <Text style={[styles.headerStatus, { color: colors.accent }]}>Çevrimiçi</Text>
        </View>
      </View>

      <KAV style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 20 }}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            loading ? (
              <View style={[styles.typingBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.typingText, { color: colors.mutedForeground }]}>ORBIT AI yazıyor...</Text>
              </View>
            ) : null
          }
        />

        <View style={[styles.inputArea, { borderTopColor: colors.border, backgroundColor: colors.card, paddingBottom: bottomPad + 80 }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
            value={input}
            onChangeText={setInput}
            placeholder="Bir şey sor..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
          />
          <Pressable
            style={({ pressed }) => [styles.sendBtn, { backgroundColor: colors.primary, opacity: pressed || loading || !input.trim() ? 0.6 : 1 }]}
            onPress={sendMessage}
            disabled={loading || !input.trim()}
          >
            <Feather name="send" size={18} color={colors.background} />
          </Pressable>
        </View>
      </KAV>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, paddingBottom: 12, borderBottomWidth: 1 },
  aiAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  headerStatus: { fontSize: 12, fontFamily: "Inter_400Regular" },
  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, maxWidth: "85%" },
  msgRowRight: { alignSelf: "flex-end", flexDirection: "row-reverse" },
  msgRowLeft: { alignSelf: "flex-start" },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  bubble: { borderRadius: 18, padding: 12, maxWidth: "100%" },
  userBubble: {},
  aiBubble: { borderWidth: 1 },
  bubbleText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  timeText: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 4, textAlign: "right" },
  typingBubble: { alignSelf: "flex-start", borderRadius: 18, padding: 12, borderWidth: 1, marginTop: 8 },
  typingText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  inputArea: { flexDirection: "row", alignItems: "flex-end", gap: 10, padding: 12, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, fontFamily: "Inter_400Regular", maxHeight: 120 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
