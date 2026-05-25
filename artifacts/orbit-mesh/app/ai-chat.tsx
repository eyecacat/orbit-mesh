import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { StarBackground } from "@/components/StarBackground";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

let conversationId: number | null = null;

async function ensureConversation(token: string): Promise<number> {
  if (conversationId) return conversationId;
  const res = await fetch(`${BASE_URL}/api/openrouter/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title: "ORBIT-MESH Chat" }),
  });
  const data = await res.json();
  conversationId = data.id;
  return data.id;
}

export default function AIChatScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Merhaba! Ben ORBIT-MESH'in yapay zeka asistanıyım. Uzay, astronomi veya gökyüzü gözlemi hakkında ne öğrenmek istersin?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    // Get token from storage
    import("@react-native-async-storage/async-storage").then(({ default: AsyncStorage }) => {
      AsyncStorage.getItem("orbit_token").then(t => { tokenRef.current = t; });
    });
  }, []);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    if (!tokenRef.current) return;

    setInput("");
    setLoading(true);

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    const assistantId = (Date.now() + 1).toString();
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "", streaming: true };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    scrollToEnd();

    try {
      const convId = await ensureConversation(tokenRef.current!);
      const res = await fetch(`${BASE_URL}/api/openrouter/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenRef.current}` },
        body: JSON.stringify({ content: text }),
      });

      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6);
          try {
            const obj = JSON.parse(json);
            if (obj.done) break;
            if (obj.content) {
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: m.content + obj.content } : m
              ));
              scrollToEnd();
            }
          } catch {}
        }
      }

      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, streaming: false } : m
      ));
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: "Bağlantı hatası. Tekrar deneyin.", streaming: false } : m
      ));
    } finally {
      setLoading(false);
      scrollToEnd();
    }
  }, [input, loading, scrollToEnd]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
        {!isUser && (
          <View style={styles.avatar}>
            <Feather name="cpu" size={14} color="#00d4ff" />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
            {item.content}
            {item.streaming && <Text style={styles.cursor}>▋</Text>}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StarBackground />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#00d4ff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.aiDot} />
          <Text style={styles.headerTitle}>AI Asistan</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <LinearGradient colors={["#00d4ff15", "#0a0e1a00"]} style={styles.headerGrad} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.list}
          onContentSizeChange={scrollToEnd}
          showsVerticalScrollIndicator={false}
        />

        <View style={[styles.inputRow, { paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Uzay hakkında bir şey sor..."
            placeholderTextColor="#4a5568"
            multiline
            maxLength={500}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!input.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#0a0e1a" />
            ) : (
              <Feather name="send" size={18} color="#0a0e1a" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0e1a" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  aiDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#00ff88" },
  headerTitle: { color: "#e2e8f0", fontSize: 17, fontFamily: "Inter_700Bold" },
  headerGrad: { height: 2, marginHorizontal: 16, borderRadius: 1 },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 12, gap: 8 },
  msgRowUser: { flexDirection: "row-reverse" },
  avatar: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: "#00d4ff20",
    borderWidth: 1, borderColor: "#00d4ff40", alignItems: "center", justifyContent: "center",
  },
  bubble: { maxWidth: "78%", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleAssistant: { backgroundColor: "#111827", borderWidth: 1, borderColor: "#1e2a3d" },
  bubbleUser: { backgroundColor: "#00d4ff", borderBottomRightRadius: 4 },
  bubbleText: { color: "#cbd5e1", fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  bubbleTextUser: { color: "#0a0e1a" },
  cursor: { color: "#00d4ff", fontSize: 15 },
  inputRow: {
    flexDirection: "row", alignItems: "flex-end", gap: 10,
    paddingHorizontal: 16, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: "#1e2a3d",
    backgroundColor: "#0a0e1a",
  },
  input: {
    flex: 1, backgroundColor: "#111827", borderWidth: 1, borderColor: "#1e2a3d",
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    color: "#e2e8f0", fontSize: 15, fontFamily: "Inter_400Regular",
    maxHeight: 100, minHeight: 44,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: "#00d4ff",
    alignItems: "center", justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: "#1e2a3d" },
});
