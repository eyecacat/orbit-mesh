import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          paddingTop: 4,
          paddingBottom: isWeb ? 4 : Math.max(insets.bottom - 4, 4),
          height: isWeb ? 68 : 52 + insets.bottom,
        },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            <LinearGradient
              colors={
                isIOS
                  ? ["rgba(8,13,24,0.72)", "rgba(17,24,39,0.86)", "rgba(30,41,59,0.96)"]
                  : ["#050816", "#0F172A", "#172554"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  borderTopWidth: 1,
                  borderTopColor: "rgba(255,255,255,0.08)",
                },
              ]}
            />
          </View>
        ),
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 9,
          marginTop: -2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Ana Sayfa",
          tabBarIcon: ({ color }) => <Feather name="home" size={20} color={color} />,
        }}
      />

      <Tabs.Screen
        name="kesfet"
        options={{
          title: "Keşfet",
          tabBarIcon: ({ color }) => <Feather name="search" size={20} color={color} />,
        }}
      />

      <Tabs.Screen
        name="profil"
        options={{
          title: "Profil",
          tabBarIcon: ({ color }) => <Feather name="user" size={20} color={color} />,
        }}
      />

      <Tabs.Screen name="atlas" options={{ href: null }} />
      <Tabs.Screen name="missions" options={{ href: null }} />
      <Tabs.Screen name="sohbet" options={{ href: null }} />
      <Tabs.Screen name="hayatagi" options={{ href: null }} />
    </Tabs>
  );
}