import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthLogin } from "@workspace/api-client-react";
import { StarBackground } from "@/components/StarBackground";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { mutate, isPending } = useAuthLogin({
    mutation: {
      onSuccess: async (data) => {
        await login(data.token, data.user);
        router.replace("/(tabs)/");
      },
      onError: () => {
        Alert.alert("Hata", "Geçersiz email veya şifre");
      },
    },
  });

  return (
    <LinearGradient colors={["#0a0e1a", "#0d1424", "#0a0e1a"]} style={styles.container}>
      <StarBackground />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.kav}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logoArea}>
            <View style={styles.orbitalRing}>
              <View style={styles.orbitalRingInner} />
            </View>
            <Text style={styles.logoTitle}>ORBIT</Text>
            <Text style={styles.logoSubtitle}>· MESH ·</Text>
            <Text style={styles.tagline}>Bağlı Kal, Güvende Kal</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Giriş Yap</Text>

            <View style={styles.inputWrap}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="ornek@email.com"
                placeholderTextColor="#64748b"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.label}>Şifre</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#64748b"
                secureTextEntry
                autoComplete="password"
              />
            </View>

            <TouchableOpacity
              style={[styles.btn, isPending && styles.btnDisabled]}
              onPress={() => mutate({ data: { email, password } })}
              disabled={isPending}
              activeOpacity={0.8}
            >
              {isPending ? (
                <ActivityIndicator color="#0a0e1a" />
              ) : (
                <Text style={styles.btnText}>Giriş Yap</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push("/(auth)/register")} style={styles.link}>
              <Text style={styles.linkText}>
                Hesabın yok mu? <Text style={styles.linkAccent}>Kayıt Ol</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  logoArea: { alignItems: "center", marginBottom: 40 },
  orbitalRing: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 2, borderColor: "#00d4ff",
    alignItems: "center", justifyContent: "center",
    marginBottom: 16,
  },
  orbitalRingInner: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 1.5, borderColor: "#ff9500",
    borderStyle: "dashed",
  },
  logoTitle: { fontSize: 40, fontWeight: "900", color: "#ffffff", letterSpacing: 8, fontFamily: "Inter_700Bold" },
  logoSubtitle: { fontSize: 14, color: "#00d4ff", letterSpacing: 6, marginTop: -4, fontFamily: "Inter_500Medium" },
  tagline: { fontSize: 13, color: "#64748b", marginTop: 8, fontFamily: "Inter_400Regular" },
  card: {
    backgroundColor: "#111827",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#1e2a3d",
  },
  cardTitle: { fontSize: 22, fontWeight: "700", color: "#ffffff", marginBottom: 24, fontFamily: "Inter_700Bold" },
  inputWrap: { marginBottom: 16 },
  label: { fontSize: 13, color: "#94a3b8", marginBottom: 8, fontFamily: "Inter_500Medium" },
  input: {
    backgroundColor: "#0d1424", borderWidth: 1, borderColor: "#1e2a3d",
    borderRadius: 12, padding: 14, color: "#ffffff", fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  btn: {
    backgroundColor: "#00d4ff", borderRadius: 12, padding: 16,
    alignItems: "center", marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#0a0e1a", fontWeight: "700", fontSize: 16, fontFamily: "Inter_700Bold" },
  link: { alignItems: "center", marginTop: 20 },
  linkText: { color: "#64748b", fontFamily: "Inter_400Regular" },
  linkAccent: { color: "#00d4ff", fontFamily: "Inter_600SemiBold" },
});
