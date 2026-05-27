import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name='index'><Icon sf={{ default: 'house', selected: 'house.fill' }} /><Label>Ana Sayfa</Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name='hayat-agi'><Icon sf={{ default: 'person.3', selected: 'person.3.fill' }} /><Label>HayatAğı</Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name='astronomi'><Icon sf={{ default: 'sparkles', selected: 'sparkles' }} /><Label>Astronomi</Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name='profil'><Icon sf={{ default: 'person.circle', selected: 'person.circle.fill' }} /><Label>Profil</Label></NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#00d4ff', tabBarInactiveTintColor: '#374151', headerShown: false, tabBarStyle: { position: 'absolute', backgroundColor: isIOS ? 'transparent' : '#0d1424', borderTopWidth: 1, borderTopColor: '#1e2a3d', elevation: 0, height: isWeb ? 84 : 60, paddingBottom: isWeb ? 34 : 8 }, tabBarBackground: () => isIOS ? <BlurView intensity={80} tint='dark' style={StyleSheet.absoluteFill} /> : isWeb ? <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0d1424' }]} /> : null, tabBarLabelStyle: { fontSize: 10, fontFamily: 'Inter_500Medium' } }}>
      <Tabs.Screen name='index' options={{ title: 'Ana Sayfa', tabBarIcon: ({ color }) => isIOS ? <SymbolView name='house' tintColor={color} size={22}/> : <Feather name='home' size={20} color={color}/> }}/>
      <Tabs.Screen name='hayat-agi' options={{ title: 'HayatAğı', tabBarIcon: ({ color }) => isIOS ? <SymbolView name='person.3' tintColor={color} size={22}/> : <Feather name='users' size={20} color={color}/> }}/>
      <Tabs.Screen name='astronomi' options={{ title: 'Astronomi', tabBarIcon: ({ color }) => isIOS ? <SymbolView name='sparkles' tintColor={color} size={22}/> : <Feather name='star' size={20} color={color}/> }}/>
      <Tabs.Screen name='profil' options={{ title: 'Profil', tabBarIcon: ({ color }) => isIOS ? <SymbolView name='person.circle' tintColor={color} size={22}/> : <Feather name='user' size={20} color={color}/> }}/>
      <Tabs.Screen name='nabiz' options={{ href: null }}/>
      <Tabs.Screen name='auet' options={{ href: null }}/>
      <Tabs.Screen name='seismic' options={{ href: null }}/>
      <Tabs.Screen name='heliomesh' options={{ href: null }}/>
      <Tabs.Screen name='earthsign' options={{ href: null }}/>
      <Tabs.Screen name='network-map' options={{ href: null }}/>
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) return <NativeTabLayout />;
  return <ClassicTabLayout />;
}
