import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthRegister } from "@workspace/api-client-react";
import { StarBackground } from "@/components/StarBackground";

export default function RegisterScreen() {
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [password, setPassword] = useState("");

  const { mutate, isPending } = useAuthRegister({
    mutation: {
      onSuccess: async (data) => {
        await login(data.token, data.user);
        router.replace("/(tabs)");
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Kayıt sırasında hata oluştu";
        Alert.alert("Hata", msg);
      },
    },
  });

  return (
    <LinearGradient colors={["#0a0e1a", "#0d1424", "#0a0e1a"]} style={styles.container}>
      <StarBackground />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.kav}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← Geri</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Hesap Oluştur</Text>
            <Text style={styles.subtitle}>ORBIT-MESH ağına katıl</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.inputWrap}>
              <Text style={styles.label}>Ad Soyad</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Adın ve soyadın"
                placeholderTextColor="#64748b"
                autoCapitalize="words"
              />
            </View>

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
              />
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.label}>Şehir (isteğe bağlı)</Text>
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder="İstanbul, Ankara..."
                placeholderTextColor="#64748b"
              />
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.label}>Şifre</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="En az 6 karakter"
                placeholderTextColor="#64748b"
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.btn, isPending && styles.btnDisabled]}
              onPress={() => mutate({ data: { name, email, password, city: city || undefined } })}
              disabled={isPending}
              activeOpacity={0.8}
            >
              {isPending ? (
                <ActivityIndicator color="#0a0e1a" />
              ) : (
                <Text style={styles.btnText}>Ağa Katıl</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()} style={styles.link}>
              <Text style={styles.linkText}>
                Zaten hesabın var mı? <Text style={styles.linkAccent}>Giriş Yap</Text>
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
  scroll: { flexGrow: 1, padding: 24, paddingTop: 60 },
  header: { marginBottom: 32 },
  backBtn: { marginBottom: 16 },
  backBtnText: { color: "#00d4ff", fontSize: 15, fontFamily: "Inter_500Medium" },
  title: { fontSize: 28, fontWeight: "800", color: "#ffffff", fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 14, color: "#64748b", marginTop: 4, fontFamily: "Inter_400Regular" },
  card: {
    backgroundColor: "#111827", borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: "#1e2a3d",
  },
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
