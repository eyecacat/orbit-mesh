import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type ProgressContextValue = {
  xp: number;
  level: number;
  streak: number;
  dailyTasksDone: string[];
  addXp: (amount: number) => void;
  completeTask: (taskId: string, xpReward: number) => void;
  resetDailyTasks: () => void;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

const LEVEL_XP_STEP = 250;

function calcLevel(xp: number) {
  return Math.max(1, Math.floor(xp / LEVEL_XP_STEP) + 1);
}

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(1);
  const [dailyTasksDone, setDailyTasksDone] = useState<string[]>([]);

  useEffect(() => {
    const savedXp = Number(localStorage.getItem("orbit_xp") ?? "0");
    const savedStreak = Number(localStorage.getItem("orbit_streak") ?? "1");
    const savedTasks = JSON.parse(localStorage.getItem("orbit_daily_tasks") ?? "[]") as string[];

    setXp(Number.isFinite(savedXp) ? savedXp : 0);
    setStreak(Number.isFinite(savedStreak) ? savedStreak : 1);
    setDailyTasksDone(Array.isArray(savedTasks) ? savedTasks : []);
  }, []);

  useEffect(() => {
    localStorage.setItem("orbit_xp", String(xp));
    localStorage.setItem("orbit_streak", String(streak));
    localStorage.setItem("orbit_daily_tasks", JSON.stringify(dailyTasksDone));
  }, [xp, streak, dailyTasksDone]);

  function addXp(amount: number) {
    setXp(prev => Math.max(0, prev + amount));
  }

  function completeTask(taskId: string, xpReward: number) {
    setDailyTasksDone(prev => {
      if (prev.includes(taskId)) return prev;
      addXp(xpReward);
      return [...prev, taskId];
    });
  }

  function resetDailyTasks() {
    setDailyTasksDone([]);
  }

  const value = useMemo(
    () => ({
      xp,
      level: calcLevel(xp),
      streak,
      dailyTasksDone,
      addXp,
      completeTask,
      resetDailyTasks,
    }),
    [xp, streak, dailyTasksDone]
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used within ProgressProvider");
  return ctx;
}