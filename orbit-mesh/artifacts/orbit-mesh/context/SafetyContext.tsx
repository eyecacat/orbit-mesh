import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export type StatusColor = "green" | "yellow" | "red";

export interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  phone: string;
  status: StatusColor;
  lastCheckin: string;
  streak: number;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
}

export interface Group {
  id: string;
  name: string;
  members: string[];
  createdAt: string;
}

interface SafetyContextValue {
  myStatus: StatusColor;
  setMyStatus: (s: StatusColor) => Promise<void>;
  lastCheckin: string | null;
  checkin: (status: StatusColor) => Promise<void>;
  streak: number;
  family: FamilyMember[];
  addFamilyMember: (m: Omit<FamilyMember, "id" | "status" | "lastCheckin" | "streak">) => Promise<void>;
  removeFamilyMember: (id: string) => Promise<void>;
  emergencyContact: EmergencyContact | null;
  setEmergencyContact: (c: EmergencyContact) => Promise<void>;
  groups: Group[];
  createGroup: (name: string, memberIds: string[]) => Promise<void>;
}

const SafetyContext = createContext<SafetyContextValue | null>(null);

const FAMILY_KEY = "@orbit-mesh/family";
const STATUS_KEY = "@orbit-mesh/my-status";
const CHECKIN_KEY = "@orbit-mesh/last-checkin";
const STREAK_KEY = "@orbit-mesh/streak";
const EMERGENCY_KEY = "@orbit-mesh/emergency-contact";
const GROUPS_KEY = "@orbit-mesh/groups";

export function SafetyProvider({ children }: { children: React.ReactNode }) {
  const [myStatus, setMyStatusState] = useState<StatusColor>("green");
  const [lastCheckin, setLastCheckin] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [family, setFamily] = useState<FamilyMember[]>([]);
  const [emergencyContact, setEmergencyContactState] = useState<EmergencyContact | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const [statusData, checkinData, streakData, familyData, emergencyData, groupsData] = await Promise.all([
        AsyncStorage.getItem(STATUS_KEY),
        AsyncStorage.getItem(CHECKIN_KEY),
        AsyncStorage.getItem(STREAK_KEY),
        AsyncStorage.getItem(FAMILY_KEY),
        AsyncStorage.getItem(EMERGENCY_KEY),
        AsyncStorage.getItem(GROUPS_KEY),
      ]);
      if (statusData) setMyStatusState(JSON.parse(statusData));
      if (checkinData) setLastCheckin(checkinData);
      if (streakData) setStreak(JSON.parse(streakData));
      if (familyData) setFamily(JSON.parse(familyData));
      if (emergencyData) setEmergencyContactState(JSON.parse(emergencyData));
      if (groupsData) setGroups(JSON.parse(groupsData));
    } catch {}
  }

  async function setMyStatus(s: StatusColor) {
    setMyStatusState(s);
    await AsyncStorage.setItem(STATUS_KEY, JSON.stringify(s));
  }

  async function checkin(status: StatusColor) {
    const now = new Date().toISOString();
    const lastDate = lastCheckin ? new Date(lastCheckin).toDateString() : null;
    const todayDate = new Date().toDateString();
    let newStreak = streak;
    if (lastDate !== todayDate) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      newStreak = lastDate === yesterday.toDateString() ? streak + 1 : 1;
    }
    setMyStatusState(status);
    setLastCheckin(now);
    setStreak(newStreak);
    await Promise.all([
      AsyncStorage.setItem(STATUS_KEY, JSON.stringify(status)),
      AsyncStorage.setItem(CHECKIN_KEY, now),
      AsyncStorage.setItem(STREAK_KEY, JSON.stringify(newStreak)),
    ]);
  }

  async function addFamilyMember(m: Omit<FamilyMember, "id" | "status" | "lastCheckin" | "streak">) {
    const member: FamilyMember = {
      ...m,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      status: "green",
      lastCheckin: new Date().toISOString(),
      streak: 0,
    };
    const updated = [...family, member];
    setFamily(updated);
    await AsyncStorage.setItem(FAMILY_KEY, JSON.stringify(updated));
  }

  async function removeFamilyMember(id: string) {
    const updated = family.filter(m => m.id !== id);
    setFamily(updated);
    await AsyncStorage.setItem(FAMILY_KEY, JSON.stringify(updated));
  }

  async function setEmergencyContact(c: EmergencyContact) {
    setEmergencyContactState(c);
    await AsyncStorage.setItem(EMERGENCY_KEY, JSON.stringify(c));
  }

  async function createGroup(name: string, memberIds: string[]) {
    const group: Group = {
      id: Date.now().toString(),
      name,
      members: memberIds,
      createdAt: new Date().toISOString(),
    };
    const updated = [...groups, group];
    setGroups(updated);
    await AsyncStorage.setItem(GROUPS_KEY, JSON.stringify(updated));
  }

  return (
    <SafetyContext.Provider value={{
      myStatus, setMyStatus, lastCheckin, checkin, streak,
      family, addFamilyMember, removeFamilyMember,
      emergencyContact, setEmergencyContact,
      groups, createGroup,
    }}>
      {children}
    </SafetyContext.Provider>
  );
}

export function useSafety() {
  const ctx = useContext(SafetyContext);
  if (!ctx) throw new Error("useSafety must be inside SafetyProvider");
  return ctx;
}
