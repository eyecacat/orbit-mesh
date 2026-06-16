import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function AuthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  async function handleSubmit() {
    setError("");
    if (!email.trim() || !password.trim()) { setError("Lütfen tüm alanları doldurun"); return; }
    if (mode === "register" && !name.trim()) { setError("Ad Soyad gerekli"); return; }
    if (password.length < 6) { setError("Şifre en az 6 karakter olmalı"); return; }

    setLoading(true);
    const result = mode === "login"
      ? await login(email.trim(), password)
      : await register(name.trim(), email.trim(), password);
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "Bir hata oluştu");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient colors={["#040D1A", "#081326", "#040D1A"]} style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={styles.logoSection}>
            <View style={[styles.logoCircle, { borderColor: colors.primary + "66" }]}>
              <LinearGradient colors={[colors.primary + "44", colors.secondary + "22"]} style={StyleSheet.absoluteFill} />
              <Feather name="radio" size={36} color={colors.primary} />
            </View>
            <Text style={[styles.appName, { color: colors.foreground }]}>ORBIT-MESH</Text>
            <Text style={[styles.tagline, { color: colors.mutedForeground }]}>Öğrenci tabanlı astronomi gözlem ağı</Text>
          </View>

          {/* Card */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Tab Toggle */}
            <View style={[styles.toggle, { backgroundColor: colors.muted }]}>
              <Pressable style={[styles.toggleBtn, mode === "login" && [styles.toggleActive, { backgroundColor: colors.card }]]} onPress={() => { setMode("login"); setError(""); }}>
                <Text style={[styles.toggleText, { color: mode === "login" ? colors.foreground : colors.mutedForeground }]}>Giriş Yap</Text>
              </Pressable>
              <Pressable style={[styles.toggleBtn, mode === "register" && [styles.toggleActive, { backgroundColor: colors.card }]]} onPress={() => { setMode("register"); setError(""); }}>
                <Text style={[styles.toggleText, { color: mode === "register" ? colors.foreground : colors.mutedForeground }]}>Kayıt Ol</Text>
              </Pressable>
            </View>

            {mode === "register" && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Ad Soyad</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Ada Lovelace"
                  placeholderTextColor={colors.mutedForeground}
                  autoComplete="name"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>E-posta</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                value={email}
                onChangeText={setEmail}
                placeholder="ornek@mail.com"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Şifre</Text>
              <View style={[styles.passRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.passInput, { color: colors.foreground }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry={!showPass}
                  autoComplete={mode === "login" ? "password" : "new-password"}
                />
                <Pressable onPress={() => setShowPass(p => !p)}>
                  <Feather name={showPass ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
                </Pressable>
              </View>
            </View>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.danger + "22" }]}>
                <Feather name="alert-circle" size={14} color={colors.danger} />
                <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [styles.submitBtn, { backgroundColor: colors.primary, opacity: pressed || loading ? 0.8 : 1 }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={[styles.submitText, { color: colors.background }]}>
                  {mode === "login" ? "Giriş Yap" : "Hesap Oluştur"}
                </Text>
              )}
            </Pressable>
          </View>

          <Text style={[styles.footer, { color: colors.mutedForeground }]}>
            ORBIT-MESH · TEKNOFEST 2025 · Türkiye
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  logoSection: { alignItems: "center", marginBottom: 32, gap: 10 },
  logoCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  appName: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  tagline: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  card: { borderRadius: 24, borderWidth: 1, padding: 24, gap: 16 },
  toggle: { flexDirection: "row", borderRadius: 12, padding: 4 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  toggleActive: { borderRadius: 10 },
  toggleText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  inputGroup: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  passRow: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, paddingHorizontal: 16 },
  passInput: { flex: 1, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10 },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  submitBtn: { borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  submitText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  footer: { textAlign: "center", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 24 },
});
