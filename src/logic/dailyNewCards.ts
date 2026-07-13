import { useCallback } from "react";
import { db } from "./db";
import { useDbQuery } from "./useDbQuery";

/**
 * 获取"学习日"日期字符串
 * 每天凌晨4点作为分界，4点前算前一天，4点及之后算当天
 * 这样熬夜学习时不会突然重置计数
 */
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getStudyDay(date: Date = new Date()): string {
  const adjustedDate = new Date(date);
  // If current time is before 4am, count as previous day.
  if (adjustedDate.getHours() < 4) {
    adjustedDate.setDate(adjustedDate.getDate() - 1);
  }
  return formatLocalDate(adjustedDate);
}

export async function getTodayNewCardsCount(): Promise<number> {
  const today = getStudyDay();
  const record = await db.dailyNewCards.get(today);
  return record?.count || 0;
}

export async function incrementTodayNewCardsCount(
  increment = 1
): Promise<number> {
  const today = getStudyDay();
  const existing = await db.dailyNewCards.get(today);

  if (existing) {
    const newCount = existing.count + increment;
    await db.dailyNewCards.update(today, { count: newCount });
    return newCount;
  }
  await db.dailyNewCards.add({ day: today, count: increment });
  return increment;
}

export function useTodayNewCardsCount(): number {
  const today = getStudyDay();
  const record = useDbQuery(
    () => db.dailyNewCards.get(today),
    [today],
    undefined
  );
  return record?.count || 0;
}

export function useCheckNewCardsLimit(): {
  checkLimit: (limit: number) => boolean;
  remaining: (limit: number) => number;
} {
  const todayCount = useTodayNewCardsCount();

  const checkLimit = useCallback(
    (limit: number): boolean => {
      return todayCount >= limit;
    },
    [todayCount]
  );

  const remaining = useCallback(
    (limit: number): number => {
      return Math.max(0, limit - todayCount);
    },
    [todayCount]
  );

  return { checkLimit, remaining };
}
