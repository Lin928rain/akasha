import i18n from "@/i18n";
import { getGlobalScheduler } from "@/logic/card/CardScheduler";
import { Card } from "@/logic/card/card";
import { updateCardModel } from "@/logic/card/updateCardModel";
import { incrementTodayNewCardsCount } from "@/logic/dailyNewCards";
import { runWithoutDbNotifications } from "@/logic/db";
import { NoteType } from "@/logic/note/note";
import { Rating, SchedulingInfo, State } from "fsrs.js";

const DAY_IN_MILLISECONDS = 1000 * 60 * 60 * 24;
const MINUTE_IN_MILLISECONDS = 1000 * 60;

// "斩！"评级 - 将卡片推到 100 年后
export const SLASH_YEARS = 100;

export function getRepeatInfoForCard(
  card: Card<NoteType>
): Record<number, SchedulingInfo> {
  return getGlobalScheduler().repeat(card.model, new Date(Date.now()));
}

export function timeStringForRating(
  rating: Rating,
  repeatInfo: Record<number, SchedulingInfo> | null
): string {
  if (!repeatInfo) {
    return "";
  }
  const rtf = new Intl.RelativeTimeFormat(i18n.language, {
    style: "short",
    numeric: "auto",
  });

  const timeDifference = repeatInfo[rating]?.card.due.getTime() - Date.now();
  if (timeDifference >= DAY_IN_MILLISECONDS * 30) {
    return rtf.format(
      Math.round(timeDifference / (DAY_IN_MILLISECONDS * 30)),
      "month"
    );
  }
  if (timeDifference >= DAY_IN_MILLISECONDS * 0.9) {
    return rtf.format(Math.round(timeDifference / DAY_IN_MILLISECONDS), "day");
  }
  return (
    "~ " +
    rtf.format(Math.round(timeDifference / MINUTE_IN_MILLISECONDS), "minute")
  );
}

export function timeStringForSlashRating(): string {
  const rtf = new Intl.RelativeTimeFormat(i18n.language, {
    style: "long",
    numeric: "auto",
  });
  return rtf.format(SLASH_YEARS, "year");
}

export async function applyRatingToCard(
  card: Card<NoteType>,
  rating: Rating,
  options?: { forcePersist?: boolean }
): Promise<void> {
  const repeatInfo = getRepeatInfoForCard(card);
  const scheduling = repeatInfo[rating];
  const isNewCard = card.model.state === State.New;
  const shouldPersistUpdate =
    options?.forcePersist === true
      ? true
      : !(
          card.model.state === State.Review &&
          card.model.due.getTime() >= Date.now()
        );

  await runWithoutDbNotifications(async () => {
    if (shouldPersistUpdate) {
      await updateCardModel(card, scheduling.card, scheduling.review_log);
    }
    if (isNewCard) {
      await incrementTodayNewCardsCount(1);
    }
  });
}

// "斩！" - 将卡片推到非常远的未来（100 年）
export async function applySlashRatingToCard(
  card: Card<NoteType>,
  options?: { forcePersist?: boolean }
): Promise<void> {
  const repeatInfo = getRepeatInfoForCard(card);
  // 使用 Easy 的调度信息作为基础，然后手动修改时间
  const scheduling = repeatInfo[Rating.Easy];
  const isNewCard = card.model.state === State.New;
  const shouldPersistUpdate =
    options?.forcePersist === true
      ? true
      : !(
          card.model.state === State.Review &&
          card.model.due.getTime() >= Date.now()
        );

  // 创建一个修改后的卡片对象，将 due 时间推到 100 年后
  const slashCard = { ...scheduling.card };
  const slashDate = new Date();
  slashDate.setFullYear(slashDate.getFullYear() + SLASH_YEARS);
  slashCard.due = slashDate;
  // 设置一个非常大的间隔（以天为单位）
  slashCard.scheduled_days = SLASH_YEARS * 365;

  await runWithoutDbNotifications(async () => {
    if (shouldPersistUpdate) {
      await updateCardModel(card, slashCard, scheduling.review_log);
    }
    if (isNewCard) {
      await incrementTodayNewCardsCount(1);
    }
  });
}
