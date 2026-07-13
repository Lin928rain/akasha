import { AppHeaderContent } from "@/app/shell/Header/Header";
import { genericFail } from "@/components/Notification/Notification";
import { prioritizeCard } from "@/logic/card/prioritizeCard";
import { getDeckSummariesByIds } from "@/logic/db";
import { db } from "@/logic/db";
import {
  applyRatingToCard,
  applySlashRatingToCard,
  getRepeatInfoForCard,
  timeStringForRating,
  timeStringForSlashRating,
} from "@/logic/learnReview";
import { useDbQuery } from "@/logic/useDbQuery";
import {
  Badge,
  Button,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconSearch } from "@tabler/icons-react";
import { Rating, State } from "fsrs.js";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import classes from "./SearchView.module.css";

const MAX_RENDERED_RESULTS = 200;

type SearchResult = {
  cardId: string;
  noteId: string;
  deckId: string;
  deckName: string;
  front: string;
  back: string;
  state: State;
  card: any;
  searchText: string;
  headwordSearchText: string;
  frontSearchText: string;
  backSearchText: string;
  deckSearchText: string;
};

export default function SearchView() {
  const [t] = useTranslation();
  const [query, setQuery] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [localCardOverrides, setLocalCardOverrides] = useState<
    Record<string, any>
  >({});
  const [prioritizedCards, setPrioritizedCards] = useState<
    Record<string, boolean>
  >({});
  const [debouncedQuery] = useDebouncedValue(query.trim().toLowerCase(), 250);

  const [searchIndex, indexReady] = useDbQuery(
    async (): Promise<[SearchResult[], boolean]> => {
      const cards = await db.cards.toArray();
      if (cards.length === 0) {
        return [[], true];
      }

      const noteIds = Array.from(new Set(cards.map((card) => card.note)));
      const deckIds = Array.from(new Set(cards.map((card) => card.deck)));
      const [notes, decks] = await Promise.all([
        db.notes.bulkGet(noteIds),
        getDeckSummariesByIds(deckIds),
      ]);

      const notesById = new Map(
        notes
          .filter((note) => note !== undefined)
          .map((note) => [note.id, note])
      );
      const decksById = new Map(
        decks
          .filter((deck) => deck !== undefined)
          .map((deck) => [deck.id, deck])
      );

      const index = await buildSearchIndex(cards, notesById, decksById);

      return [index, true];
    },
    [],
    [[], false]
  );

  const filtered = useMemo(() => {
    const keyword = debouncedQuery.trim();
    if (!keyword) {
      return { results: [] as SearchResult[], total: 0 };
    }

    const normalizedKeyword = normalizeForSearch(keyword);
    const tokens = normalizedKeyword.split(/\s+/).filter(Boolean);
    const scored: Array<{ result: SearchResult; score: number }> = [];
    let total = 0;

    for (const item of searchIndex) {
      const mergedCard = localCardOverrides[item.cardId] || item.card;
      const mergedState = mergedCard?.model?.state ?? item.state;
      const mergedItem = {
        ...item,
        card: mergedCard,
        state: mergedState,
      };
      const score = getRelevanceScore(mergedItem, tokens, normalizedKeyword);
      if (score <= 0) {
        continue;
      }
      total += 1;
      scored.push({ result: mergedItem, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return {
      results: scored.slice(0, MAX_RENDERED_RESULTS).map((item) => item.result),
      total,
    };
  }, [debouncedQuery, localCardOverrides, searchIndex]);

  const emptyText = useMemo(() => {
    if (!query.trim()) {
      return "输入关键词开始搜索";
    }
    if (!indexReady) {
      return "正在构建搜索索引...";
    }
    if (filtered.total === 0) {
      return "没有匹配结果";
    }
    return "";
  }, [query, indexReady, filtered.total]);

  async function onPrioritize(cardId: string) {
    try {
      setBusyKey(`prioritize-${cardId}`);
      await prioritizeCard(cardId);
      setPrioritizedCards((current) => ({
        ...current,
        [cardId]: true,
      }));
      notifications.show({
        title: "已应用",
        message: "已将此卡片标记为优先学习。",
        color: "teal",
        autoClose: 900,
      });
    } catch (error) {
      genericFail();
      console.log(error);
    } finally {
      setBusyKey(null);
    }
  }

  async function onRate(result: SearchResult, rating: Rating) {
    try {
      setBusyKey(`rate-${result.cardId}-${rating}`);
      await applyRatingToCard(result.card, rating, { forcePersist: true });
      const updatedCard = await db.cards.get(result.cardId);
      if (updatedCard) {
        setLocalCardOverrides((current) => ({
          ...current,
          [result.cardId]: updatedCard,
        }));
      }
      notifications.show({
        title: "已应用",
        message: `已应用"${ratingLabel(rating, t)}"评分。`,
        color: "teal",
        autoClose: 900,
      });
    } catch (error) {
      genericFail();
      console.log(error);
    } finally {
      setBusyKey(null);
    }
  }

  async function onSlash(result: SearchResult) {
    try {
      setBusyKey(`slash-${result.cardId}`);
      await applySlashRatingToCard(result.card, { forcePersist: true });
      const updatedCard = await db.cards.get(result.cardId);
      if (updatedCard) {
        setLocalCardOverrides((current) => ({
          ...current,
          [result.cardId]: updatedCard,
        }));
      }
      notifications.show({
        title: "已斩！",
        message: `此卡片已被推到 100 年后！`,
        color: "violet",
        autoClose: 900,
      });
    } catch (error) {
      genericFail();
      console.log(error);
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <Stack className={classes.wrapper} gap="sm">
      <AppHeaderContent>
        <Title order={3}>搜索</Title>
      </AppHeaderContent>
      <TextInput
        placeholder={t("sidebar.search-placeholder")}
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
        leftSection={<IconSearch size={16} />}
      />

      <Stack className={classes.content} gap="sm">
        {!indexReady && <Loader size="sm" />}
        {filtered.total > MAX_RENDERED_RESULTS ? (
          <Text size="sm" c="dimmed">
            共匹配 {filtered.total} 条结果，显示前 {MAX_RENDERED_RESULTS} 条
          </Text>
        ) : null}
        {emptyText ? <Text c="dimmed">{emptyText}</Text> : null}
        {filtered.results.map((result) => (
          <SearchResultCard
            key={result.cardId}
            result={result}
            busyKey={busyKey}
            prioritized={Boolean(prioritizedCards[result.cardId])}
            onPrioritize={onPrioritize}
            onRate={onRate}
            onSlash={onSlash}
          />
        ))}
      </Stack>
    </Stack>
  );
}

function SearchResultCard({
  result,
  busyKey,
  prioritized,
  onPrioritize,
  onRate,
  onSlash,
}: {
  result: SearchResult;
  busyKey: string | null;
  prioritized: boolean;
  onPrioritize: (cardId: string) => void;
  onRate: (result: SearchResult, rating: Rating) => void;
  onSlash: (result: SearchResult) => void;
}) {
  const [t] = useTranslation();
  const repeatInfo =
    result.state === State.Review ? getRepeatInfoForCard(result.card) : null;

  return (
    <Paper withBorder p="sm" radius="sm">
      <Group justify="space-between" mb="xs">
        <Badge size="sm" variant="light">
          {result.deckName}
        </Badge>
        <Group>
          {result.state === State.New ? (
            <Button
              size="xs"
              onClick={() => onPrioritize(result.cardId)}
              variant={prioritized ? "filled" : "light"}
            >
              {prioritized ? "已优先" : "优先学习"}
            </Button>
          ) : result.state === State.Review && repeatInfo ? (
            <div className={classes.ratingGroup}>
              <RatingButton
                color="red"
                label={t("learning.rate-again")}
                timeInfo={timeStringForRating(Rating.Again, repeatInfo)}
                loading={busyKey === `rate-${result.cardId}-${Rating.Again}`}
                onClick={() => onRate(result, Rating.Again)}
              />
              <RatingButton
                color="yellow"
                label={t("learning.rate-hard")}
                timeInfo={timeStringForRating(Rating.Hard, repeatInfo)}
                loading={busyKey === `rate-${result.cardId}-${Rating.Hard}`}
                onClick={() => onRate(result, Rating.Hard)}
              />
              <RatingButton
                color="green"
                label={t("learning.rate-good")}
                timeInfo={timeStringForRating(Rating.Good, repeatInfo)}
                loading={busyKey === `rate-${result.cardId}-${Rating.Good}`}
                onClick={() => onRate(result, Rating.Good)}
              />
              <RatingButton
                color="blue"
                label={t("learning.rate-easy")}
                timeInfo={timeStringForRating(Rating.Easy, repeatInfo)}
                loading={busyKey === `rate-${result.cardId}-${Rating.Easy}`}
                onClick={() => onRate(result, Rating.Easy)}
              />
              <RatingButton
                color="violet"
                label={t("learning.rate-slash")}
                timeInfo={timeStringForSlashRating()}
                loading={busyKey === `slash-${result.cardId}`}
                onClick={() => onSlash(result)}
              />
            </div>
          ) : (
            <Text c="dimmed" size="xs">
              该卡片暂无可执行操作
            </Text>
          )}
        </Group>
      </Group>

      <Stack gap="xs">
        <Text fw={600} size="sm">
          正面
        </Text>
        <Text size="sm" className={classes.resultText}>
          {result.front}
        </Text>
        <Text fw={600} size="sm">
          背面
        </Text>
        <Text size="sm" className={classes.resultText}>
          {result.back}
        </Text>
      </Stack>
    </Paper>
  );
}

function RatingButton({
  label,
  timeInfo,
  color,
  onClick,
  loading,
}: {
  label: string;
  timeInfo: string;
  color: string;
  onClick: () => void;
  loading: boolean;
}) {
  return (
    <Button
      variant="light"
      color={color}
      size="xs"
      className={classes.ratingButton}
      loading={loading}
      onClick={onClick}
    >
      <div style={{ textAlign: "center" }}>
        <div>{label}</div>
        {timeInfo && (
          <div style={{ fontSize: "0.8em", opacity: 0.8 }}>{timeInfo}</div>
        )}
      </div>
    </Button>
  );
}

function ratingLabel(rating: Rating, t: (key: string) => string): string {
  switch (rating) {
    case Rating.Again:
      return t("learning.rate-again");
    case Rating.Hard:
      return t("learning.rate-hard");
    case Rating.Good:
      return t("learning.rate-good");
    case Rating.Easy:
      return t("learning.rate-easy");
    default:
      return "评分";
  }
}

function normalizeForSearch(text: string): string {
  return String(text ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function getRelevanceScore(
  item: SearchResult,
  tokens: string[],
  fullKeyword: string
): number {
  if (tokens.length === 0) {
    return 0;
  }

  let score = 0;
  let matchedTokens = 0;

  if (item.headwordSearchText === fullKeyword) {
    score += 1200;
  } else if (
    isWholeWordMatch(fullKeyword, item.headwordSearchText) ||
    startsWithWord(fullKeyword, item.headwordSearchText)
  ) {
    score += 800;
  } else if (item.headwordSearchText.includes(fullKeyword)) {
    score += 400;
  }

  const searchFields = [
    item.headwordSearchText,
    item.frontSearchText,
    item.backSearchText,
    item.deckSearchText,
  ];

  for (const token of tokens) {
    for (const field of searchFields) {
      if (field.includes(token)) {
        matchedTokens += 1;
        score += 10;
      }
    }
  }

  if (matchedTokens === tokens.length) {
    score += 50;
  }

  return score;
}

function isWholeWordMatch(keyword: string, text: string): boolean {
  const regex = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, "i");
  return regex.test(text);
}

function startsWithWord(keyword: string, text: string): boolean {
  return text.toLowerCase().startsWith(keyword.toLowerCase());
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function buildSearchIndex(
  cards: any[],
  notesById: Map<string, any>,
  decksById: Map<string, any>
): Promise<SearchResult[]> {
  const index: SearchResult[] = [];

  for (const card of cards) {
    try {
      const note = notesById.get(card.note);
      const deck = decksById.get(card.deck);

      if (!note || !deck) {
        continue;
      }

      const noteContent = getNoteContentAsString(note);
      const front = getCardField(note, "front") || "";
      const back = getCardField(note, "back") || "";

      index.push({
        cardId: card.id,
        noteId: note.id,
        deckId: deck.id,
        deckName: deck.name || "Unknown Deck",
        front,
        back,
        state: card.model.state,
        card,
        searchText: normalizeForSearch(noteContent),
        headwordSearchText: normalizeForSearch(front),
        frontSearchText: normalizeForSearch(front),
        backSearchText: normalizeForSearch(back),
        deckSearchText: normalizeForSearch(deck.name || ""),
      });
    } catch (error) {
      console.error("Failed to index card:", card.id, error);
    }
  }

  return index;
}

function getNoteContentAsString(note: any): string {
  try {
    if (note.content) {
      if (typeof note.content === "string") {
        return note.content;
      }
      if (typeof note.content === "object") {
        return JSON.stringify(note.content);
      }
    }
    return "";
  } catch {
    return "";
  }
}

function getCardField(note: any, fieldName: string): string {
  try {
    if (note.content && typeof note.content === "object") {
      const value = note.content[fieldName];
      if (typeof value === "string") {
        return stripHtml(value);
      }
    }
    return "";
  } catch {
    return "";
  }
}

function stripHtml(html: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}
