import { OPENROUTER_API_KEY } from "@/lib/env";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView as KAV } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  content:
    "Merhaba! Ben ORBIT AI. Astronomi, uzay havası, Deneyap Kart, BLE ağları ve ORBIT-MESH hakkında sorular sorabilirsin.",
  timestamp: new Date(),
};

export default function SohbetScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>([INITIAL_MSG]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const flatRef = useRef<FlatList<Message>>(null);
console.log("SEND MESSAGE CALLED");
  async function sendMessage() {
    const text = input.trim();

    if (!text || loading) return;

    console.log(
      "OPENROUTER:",
      OPENROUTER_API_KEY ? "FOUND" : "MISSING"
    );

    Haptics.impactAsync(
      Haptics.ImpactFeedbackStyle.Light
    ).catch(() => {});

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const apiMessages = updatedMessages
        .filter(m => m.id !== "sys-1")
        .map(m => ({
          role: m.role,
          content: m.content,
        }));

      console.log("KEY LENGTH:", OPENROUTER_API_KEY.length);
      console.log("KEY START:", OPENROUTER_API_KEY.slice(0, 10));
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://replit.com",
            "X-Title": "ORBIT-MESH",
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini",
            messages: apiMessages,
            temperature: 0.4,
          }),
        }
      );

      const data = await response.json();

      console.log("OPENROUTER RESPONSE:", data);

      if (!response.ok) {
        throw new Error(
          data?.error?.message ||
            `HTTP ${response.status}`
        );
      }

      const aiText =
        data?.choices?.[0]?.message?.content ||
        "Yanıt alınamadı.";

      const aiMessage: Message = {
        id: `${Date.now()}-ai`,
        role: "assistant",
        content: aiText,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Bilinmeyen hata";

      setMessages(prev => [
        ...prev,
        {
          id: `${Date.now()}-err`,
          role: "assistant",
          content: `Hata: ${message}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function renderMessage({ item }: { item: Message }) {
    const isUser = item.role === "user";

    return (
      <View
        style={[
          styles.msgRow,
          isUser
            ? styles.msgRowRight
            : styles.msgRowLeft,
        ]}
      >
        {!isUser && (
          <View
            style={[
              styles.avatar,
              {
                backgroundColor:
                  colors.primary + "22",
              },
            ]}
          >
            <Feather
              name="cpu"
              size={14}
              color={colors.primary}
            />
          </View>
        )}

        <View
          style={[
            styles.bubble,
            isUser
              ? {
                  backgroundColor:
                    colors.primary,
                }
              : {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderWidth: 1,
                },
          ]}
        >
          <Text
            style={{
              color: isUser
                ? colors.background
                : colors.foreground,
            }}
          >
            {item.content}
          </Text>
        </View>
      </View>
    );
  }

  const topPad =
    Platform.OS === "web"
      ? 67
      : insets.top;

  const bottomPad =
    Platform.OS === "web"
      ? 34
      : insets.bottom;

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor:
            colors.background,
        },
      ]}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 8,
            borderBottomColor:
              colors.border,
          },
        ]}
      >
        <Text
          style={{
            color: colors.foreground,
            fontSize: 18,
            fontWeight: "700",
          }}
        >
          ORBIT AI
        </Text>
      </View>

      <KAV
        style={{ flex: 1 }}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : "height"
        }
      >
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{
            padding: 16,
            gap: 12,
          }}
          onContentSizeChange={() =>
            flatRef.current?.scrollToEnd({
              animated: true,
            })
          }
        />

        <View
          style={[
            styles.inputArea,
            {
              borderTopColor:
                colors.border,
              paddingBottom:
                bottomPad + 20,
            },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              {
                color:
                  colors.foreground,
                borderColor:
                  colors.border,
              },
            ]}
            value={input}
            onChangeText={setInput}
            placeholder="Mesaj yaz..."
            placeholderTextColor={
              colors.mutedForeground
            }
            multiline
          />

          <Pressable
            style={[
              styles.sendBtn,
              {
                backgroundColor:
                  colors.primary,
              },
            ]}
            onPress={sendMessage}
            disabled={
              loading || !input.trim()
            }
          >
            <Feather
              name="send"
              size={18}
              color={colors.background}
            />
          </Pressable>
        </View>
      </KAV>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  header: {
    padding: 16,
    borderBottomWidth: 1,
  },

  msgRow: {
    flexDirection: "row",
    marginBottom: 10,
    maxWidth: "85%",
  },

  msgRowLeft: {
    alignSelf: "flex-start",
  },

  msgRowRight: {
    alignSelf: "flex-end",
  },

  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },

  bubble: {
    padding: 12,
    borderRadius: 16,
  },

  inputArea: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
  },

  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
});