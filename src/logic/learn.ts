import { Rating, SchedulingInfo, State } from "fsrs.js";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  updateGlobalScheduler,
  useGlobalScheduler,
} from "./card/CardScheduler";
import type { Card } from "./card/card";
import { useCardsWith } from "./card/hooks/useCardsWith";
import { updateCardModel } from "./card/updateCardModel";
import {
  getTodayNewCardsCount,
  incrementTodayNewCardsCount,
} from "./dailyNewCards";
import { DbTable, runWithoutDbNotifications } from "./db";
import type { DeckOptions } from "./deck/deck";
import type { NoteType } from "./note/note";
import { DeckStatistics, newStatistics } from "./statistics";

export type LearnPhase = "normal" | "limit-reached" | "finishing";

export type LearnOptions = {
  learnAll: boolean;
  newToReviewRatio: number;
  maxUniqueCardsPerSession: number;
  maxNewCardsPerDay: number;
  newCardsLimit?: number;
  newCardsLimitUnlimited?: boolean; // 是否突破每日新卡片限制
  sort?: (a: Card<NoteType>, b: Card<NoteType>) => number;
  shuffle?: boolean; // 是否随机顺序学习
  // 分组学习配置
  groupId?: string; // 指定学习特定分组，undefined 表示学习全部
  cardGroups?: DeckOptions["cardGroups"]; // 卡组分组配置，用于过滤卡片
  groupLearningRespectLimits?: boolean; // 分组学习是否受常规限制约束
};

export type CardQuerier = {
  querier: (
    cards: DbTable<Card<NoteType>>
  ) => Promise<Card<NoteType>[] | undefined>;
  dependencies: any[];
};

export type NewCardPosition = {
  cardId: string;
  position: number;
  queuePercentage: number;
  dueInMinutes: number;
};

export type LearnController = {
  newCardsNumber: number;
  timeCriticalCardsNumber: number;
  toReviewCardsNumber: number;
  learnedCardsNumber: number;
  uniqueCardsCount: number;
  uniqueCardsLimit: number;
  todayNewCardsCount: number;
  todayNewCardsLimit: number;
  phase: LearnPhase;
  newCardPositions: NewCardPosition[];

  currentCard: Card<NoteType> | null;
  currentCardRepeatInfo: Record<number, SchedulingInfo> | null;

  showingAnswer: boolean;
  showAnswer: () => void;

  answerCard: (rating: Rating) => void;
  updateStatistics: (rating: Rating) => void;
  requestNextCard: () => void;

  statistics: DeckStatistics;
  isFinished: boolean;
  estimatedTotal: number;
  dynamicMax: number;
  progress: number;

  options: LearnOptions;
  finishUp: () => void;

  // 内部状态，用于预取 notes
  isInitialized: boolean;
  timeCriticalCards: Card<NoteType>[];
  newCards: Card<NoteType>[];
  toReviewCards: Card<NoteType>[];
  learnedCards: Card<NoteType>[];
};

export function useLearning(
  cardQuerier: CardQuerier,
  options: LearnOptions
): LearnController {
  const [providedCards] = useCardsWith(
    cardQuerier.querier,
    cardQuerier.dependencies
  );

  const scheduler = useGlobalScheduler();

  const [timeCriticalCards, setTimeCriticalCards] = useState<Card<NoteType>[]>(
    []
  );
  const [newCards, setNewCards] = useState<Card<NoteType>[]>([]);
  const [toReviewCards, setToReviewCards] = useState<Card<NoteType>[]>([]);
  const [learnedCards, setLearnedCards] = useState<Card<NoteType>[]>([]);

  const [currentCard, setCurrentCard] = useState<Card<NoteType> | null>(null);
  const [showingAnswer, setShowingAnswer] = useState<boolean>(false);
  const [requestedNextCard, setRequestedNextCard] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [statistics, setStatistics] = useState<DeckStatistics>(() =>
    newStatistics()
  );

  const [seenCardIds, setSeenCardIds] = useState<Set<string>>(new Set());
  const [todayNewCardsCount, setTodayNewCardsCount] = useState<number>(0);
  const [phase, setPhase] = useState<LearnPhase>("normal");
  const [shouldPrioritizeNewCards, setShouldPrioritizeNewCards] =
    useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  const initializedRef = useRef<boolean>(false);

  const sortNewCardsByPriority = useCallback(
    (a: Card<NoteType>, b: Card<NoteType>) => {
      if (a.customOrder !== undefined || b.customOrder !== undefined) {
        if (a.customOrder === undefined) return 1;
        if (b.customOrder === undefined) return -1;
        if (a.customOrder !== b.customOrder) {
          return a.customOrder - b.customOrder;
        }
      }
      if (options.sort) {
        return options.sort(a, b);
      }
      return a.creationDate.getTime() - b.creationDate.getTime();
    },
    [options.sort]
  );

  // 洗牌函数 - 使用 Fisher-Yates 算法随机打乱数组
  const shuffleArray = useCallback(<T>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  // 存储上一次 groupId，用于检测是否需要重新初始化
  const prevGroupIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    // 如果 groupId 发生变化，重置初始化状态
    if (prevGroupIdRef.current !== options.groupId) {
      initializedRef.current = false;
      prevGroupIdRef.current = options.groupId;
    }
  }, [options.groupId]);

  useEffect(() => {
    getTodayNewCardsCount().then((count) => {
      setTodayNewCardsCount(count);
    });
  }, []);

  const isNewCard = useCallback((card: Card<NoteType>) => {
    return card.model.state === State.New;
  }, []);

  const wasNewCard = useCallback(
    (card: Card<NoteType>) => {
      return statistics.cards[State.New] > 0 && seenCardIds.has(card.id);
    },
    [statistics.cards, seenCardIds]
  );

  useEffect(() => {
    // 只有当有卡片且未初始化时才执行
    if (providedCards && providedCards.length > 0 && !initializedRef.current) {
      initializedRef.current = true;
      const now = new Date(Date.now());

      // 如果指定了 groupId 且有 cardGroups，过滤出该分组的卡片
      let filteredCards = providedCards;
      if (
        options.groupId &&
        options.cardGroups &&
        options.cardGroups.length > 0
      ) {
        const group = options.cardGroups.find((g) => g.id === options.groupId);
        if (group) {
          const groupCardIds = new Set(group.cardIds);
          filteredCards = providedCards.filter((card) =>
            groupCardIds.has(card.id)
          );
        }
      }

      // 检查是否是分组学习模式且不受限制
      const isGroupLearningWithoutLimits = !!(
        options.groupId && options.groupLearningRespectLimits === false
      );

      const allTimeCritical = filteredCards.filter(
        (card) =>
          card.model.state === State.Learning ||
          card.model.state === State.Relearning
      );

      const allNewCards = filteredCards.filter(
        (card) => card.model.state === State.New
      );

      // 分组模式下，所有复习卡片都加入队列（不管是否到期）
      // 非分组模式下，只加入已到期的复习卡片
      const allReviewCards = filteredCards.filter(
        (card) =>
          card.model.state === State.Review &&
          (isGroupLearningWithoutLimits || card.model.due <= now)
      );

      // 非分组模式下，未到期的复习卡片单独存放（仅在 learnAll 模式下学习）
      const allLearnedCards = isGroupLearningWithoutLimits
        ? []
        : filteredCards.filter(
            (card) => card.model.state === State.Review && card.model.due > now
          );

      // 检查是否突破每日新卡片限制（mixed 模式）
      const isUnlimitedNewCards = options.newCardsLimitUnlimited === true;

      // 计算每日剩余可学习新卡片数
      // 分组学习不受限或 mixed 模式下，不受每日上限限制
      const remainingDailyNewCards =
        isGroupLearningWithoutLimits || isUnlimitedNewCards
          ? allNewCards.length // 不受限制时，使用所有可用新卡片
          : Math.max(0, options.maxNewCardsPerDay - todayNewCardsCount);

      let maxNewCardsForSession: number;
      if (isGroupLearningWithoutLimits || isUnlimitedNewCards) {
        // 不受每日限制时，新卡片数量由 maxUniqueCardsPerSession 和比例决定
        maxNewCardsForSession = allNewCards.length;
      } else if (options.newCardsLimit === 0) {
        maxNewCardsForSession = 0;
      } else if (options.newCardsLimit !== undefined) {
        maxNewCardsForSession = Math.min(
          options.newCardsLimit,
          remainingDailyNewCards,
          allNewCards.length
        );
      } else {
        maxNewCardsForSession = Math.min(
          remainingDailyNewCards,
          allNewCards.length
        );
      }

      const ratio = options.newToReviewRatio;
      // 计算目标新卡片数量
      const targetNewCards = isGroupLearningWithoutLimits
        ? allNewCards.length // 分组学习不受限时，学习所有新卡片
        : isUnlimitedNewCards
          ? Math.min(
              Math.floor(
                options.maxUniqueCardsPerSession * (ratio / (1 + ratio))
              ),
              allNewCards.length
            ) // mixed 模式：按比例计算，只受单次学习上限限制
          : Math.min(
              Math.floor(
                options.maxUniqueCardsPerSession * (ratio / (1 + ratio))
              ),
              maxNewCardsForSession
            ); // 正常模式：受每日限制

      // 计算目标复习卡片数量
      const targetReviewCards = isGroupLearningWithoutLimits
        ? allReviewCards.length // 分组学习不受限时，学习所有复习卡片
        : isUnlimitedNewCards
          ? Math.min(
              options.maxUniqueCardsPerSession - targetNewCards,
              allReviewCards.length
            ) // mixed 模式：剩余名额给复习卡片
          : Math.min(
              options.maxUniqueCardsPerSession - targetNewCards,
              allReviewCards.length
            ); // 正常模式

      // 根据是否启用随机模式，选择排序或洗牌
      // 随机模式下，新卡片只洗牌不排序；非随机模式下按优先级排序
      const sortedNewCards = options.shuffle
        ? shuffleArray(allNewCards)
        : allNewCards.sort(sortNewCardsByPriority);
      // 复习卡片始终按原有逻辑排序（不随机）
      const sortedReviewCards = allReviewCards.sort(options.sort);

      const selectedNewCards = sortedNewCards.slice(0, targetNewCards);
      const selectedReviewCards = sortedReviewCards.slice(0, targetReviewCards);

      setTimeCriticalCards(
        allTimeCritical.sort(
          (a, b) => a.model.due.getTime() - b.model.due.getTime()
        )
      );
      setNewCards(selectedNewCards);
      setToReviewCards(selectedReviewCards);
      // 已学习卡片始终按到期时间排序（不随机）
      setLearnedCards(
        allLearnedCards.sort(
          (a, b) => a.model.due.getTime() - b.model.due.getTime()
        )
      );

      setIsInitialized(true);
    }
  }, [
    providedCards,
    options.groupId,
    options.cardGroups,
    options.groupLearningRespectLimits,
    options.maxNewCardsPerDay,
    options.newCardsLimit,
    options.maxUniqueCardsPerSession,
    options.newToReviewRatio,
    options.sort,
    options.shuffle,
    todayNewCardsCount,
    sortNewCardsByPriority,
    shuffleArray,
  ]);

  const nextCard = useCallback(() => {
    if (!isInitialized) {
      return;
    }

    if (isFinished) {
      return;
    }

    // 如果没有加载任何卡片，直接返回
    if (providedCards && providedCards.length === 0) {
      return;
    }

    const now = new Date(Date.now());

    if (phase === "finishing" || shouldPrioritizeNewCards) {
      const unseenNewCard = newCards.find((card) => !seenCardIds.has(card.id));
      if (unseenNewCard) {
        setCurrentCard(unseenNewCard);
        setNewCards((cards) => cards.filter((c) => c.id !== unseenNewCard.id));
        setSeenCardIds(
          (prev) => new Set([...Array.from(prev), unseenNewCard.id])
        );
        return;
      }

      const unfinishedNewCards = timeCriticalCards.filter(
        (card) =>
          seenCardIds.has(card.id) && wasNewCard(card) && card.model.due <= now
      );

      if (unfinishedNewCards.length > 0) {
        const card = unfinishedNewCards[0];
        setCurrentCard(card);
        setTimeCriticalCards((cards) => cards.filter((c) => c.id !== card.id));
        return;
      }

      const anyUnfinishedSeenCards = timeCriticalCards.filter(
        (card) => seenCardIds.has(card.id) && card.model.due <= now
      );

      if (anyUnfinishedSeenCards.length > 0) {
        const card = anyUnfinishedSeenCards[0];
        setCurrentCard(card);
        setTimeCriticalCards((cards) => cards.filter((c) => c.id !== card.id));
        return;
      }

      setIsFinished(true);
      updateGlobalScheduler();
      return;
    }

    if (timeCriticalCards.length > 0 && timeCriticalCards[0].model.due <= now) {
      const card = timeCriticalCards[0];
      setCurrentCard(card);
      setTimeCriticalCards((cards) => cards.slice(1));

      if (!seenCardIds.has(card.id)) {
        setSeenCardIds((prev) => new Set([...Array.from(prev), card.id]));

        if (seenCardIds.size + 1 >= options.maxUniqueCardsPerSession) {
          setPhase("limit-reached");
        }
      }
      return;
    }

    if (seenCardIds.size >= options.maxUniqueCardsPerSession) {
      const anyUnfinishedSeenCards = timeCriticalCards.filter(
        (card) => seenCardIds.has(card.id) && card.model.due <= now
      );

      if (anyUnfinishedSeenCards.length > 0) {
        const card = anyUnfinishedSeenCards[0];
        setCurrentCard(card);
        setTimeCriticalCards((cards) => cards.filter((c) => c.id !== card.id));
        return;
      }

      setIsFinished(true);
      updateGlobalScheduler();
      return;
    }

    if (newCards.length + toReviewCards.length > 0) {
      let selectedCard: Card<NoteType> | null = null;

      if (newCards.length === 0) {
        selectedCard = toReviewCards[0];
        setToReviewCards((cards) => cards.slice(1));
      } else if (toReviewCards.length === 0) {
        selectedCard = newCards[0];
        setNewCards((cards) => cards.slice(1));
      } else {
        if (Math.random() < options.newToReviewRatio) {
          selectedCard = newCards[0];
          setNewCards((cards) => cards.slice(1));
        } else {
          selectedCard = toReviewCards[0];
          setToReviewCards((cards) => cards.slice(1));
        }
      }

      if (selectedCard) {
        setCurrentCard(selectedCard);

        if (!seenCardIds.has(selectedCard.id)) {
          setSeenCardIds((prev) => {
            const newSet = new Set([...Array.from(prev), selectedCard!.id]);
            if (newSet.size >= options.maxUniqueCardsPerSession) {
              setPhase("limit-reached");
            }
            return newSet;
          });
        }
      }
      return;
    }

    if (options.learnAll && learnedCards.length > 0) {
      const card = learnedCards[0];
      setCurrentCard(card);
      setLearnedCards((cards) => cards.slice(1));

      if (!seenCardIds.has(card.id)) {
        setSeenCardIds((prev) => {
          const newSet = new Set([...Array.from(prev), card.id]);
          if (newSet.size >= options.maxUniqueCardsPerSession) {
            setPhase("limit-reached");
          }
          return newSet;
        });
      }
      return;
    }

    if (timeCriticalCards.length > 0) {
      const card = timeCriticalCards[0];
      setCurrentCard(card);
      setTimeCriticalCards((cards) => cards.slice(1));
      return;
    }

    setIsFinished(true);
    updateGlobalScheduler();
  }, [
    isInitialized,
    isFinished,
    phase,
    shouldPrioritizeNewCards,
    timeCriticalCards,
    newCards,
    toReviewCards,
    learnedCards,
    seenCardIds,
    options,
    wasNewCard,
    providedCards,
  ]);

  useLayoutEffect(() => {
    if (requestedNextCard) {
      nextCard();
      setRequestedNextCard(false);
    }
  }, [requestedNextCard, nextCard]);

  useEffect(() => {
    if (currentCard === null && !isFinished && providedCards && isInitialized) {
      nextCard();
    }
  }, [currentCard, isFinished, providedCards, isInitialized, nextCard]);

  const currentCardRepeatInfo = useMemo(() => {
    if (currentCard) {
      return scheduler.repeat(currentCard.model, new Date(Date.now()));
    }
    return null;
  }, [currentCard, scheduler]);

  const answer = useCallback(
    (rating: Rating) => {
      if (currentCard && currentCardRepeatInfo) {
        const isNewCard = currentCard.model.state === State.New;
        const shouldPersistUpdate = !(
          currentCard.model.state === State.Review &&
          currentCard.model.due.getTime() >= Date.now()
        );

        void runWithoutDbNotifications(async () => {
          if (shouldPersistUpdate) {
            await updateCardModel(
              currentCard,
              currentCardRepeatInfo[rating].card,
              currentCardRepeatInfo[rating].review_log
            );
          }
          if (isNewCard) {
            await incrementTodayNewCardsCount(1);
          }
        });

        if (currentCardRepeatInfo[rating].card.scheduled_days === 0) {
          setTimeCriticalCards((tcCards) =>
            [
              ...tcCards,
              { ...currentCard, model: currentCardRepeatInfo[rating].card },
            ].sort((a, b) => a.model.due.getTime() - b.model.due.getTime())
          );
        }

        if (isNewCard) {
          setTodayNewCardsCount((c) => c + 1);
        }

        setStatistics((ds) => ({
          ...ds,
          ratingsList: [...ds.ratingsList, rating],
          cards: {
            ...ds.cards,
            [currentCard.model.state]: ds.cards[currentCard.model.state] + 1,
          },
        }));
      }
      setShowingAnswer(false);
    },
    [currentCard, currentCardRepeatInfo]
  );

  // 只更新统计，不更新卡片模型（用于斩等特殊操作）
  const updateStatistics = useCallback(
    (rating: Rating) => {
      if (currentCard) {
        const currentCardState = currentCard.model.state;
        setStatistics((ds) => ({
          ...ds,
          ratingsList: [...ds.ratingsList, rating],
          cards: {
            ...ds.cards,
            [currentCardState]: ds.cards[currentCardState] + 1,
          },
        }));
        setShowingAnswer(false);
      }
    },
    [currentCard]
  );

  const finishUp = useCallback(() => {
    setShouldPrioritizeNewCards(true);
    setPhase("finishing");
  }, []);

  const estimatedTotal = useMemo(() => {
    return (
      1 +
      newCards.length * 2 +
      toReviewCards.length +
      timeCriticalCards.length +
      (options.learnAll ? learnedCards.length : 0)
    );
  }, [
    newCards.length,
    toReviewCards.length,
    timeCriticalCards.length,
    learnedCards.length,
    options.learnAll,
  ]);

  const uniqueCardsCount = seenCardIds.size;
  const ratingsCount = statistics.ratingsList.length;
  const repeatCount = Math.max(0, ratingsCount - uniqueCardsCount);

  const dynamicMax = useMemo(() => {
    return Math.min(
      options.maxUniqueCardsPerSession + repeatCount,
      estimatedTotal
    );
  }, [options.maxUniqueCardsPerSession, repeatCount, estimatedTotal]);

  const progress = useMemo(() => {
    if (isFinished) return 100;
    if (dynamicMax === 0) return 0;
    return (
      Math.max(
        ratingsCount / (ratingsCount + estimatedTotal),
        ratingsCount / (options.maxUniqueCardsPerSession + repeatCount)
      ) * 100
    );
  }, [
    isFinished,
    ratingsCount,
    estimatedTotal,
    options.maxUniqueCardsPerSession,
    repeatCount,
  ]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    console.debug("[learn] progress metrics", {
      dynamicMax,
      maxUniqueCardsPerSession: options.maxUniqueCardsPerSession,
      repeatCount,
      estimatedTotal,
      ratingsCount,
      uniqueCardsCount,
      toReviewCards: toReviewCards.map((card) => ({
        id: card.id,
        due: card.model.due,
        state: card.model.state,
      })),
      timeCriticalCards: timeCriticalCards.map((card) => ({
        id: card.id,
        due: card.model.due,
        state: card.model.state,
      })),
    });
  }, [
    dynamicMax,
    options.maxUniqueCardsPerSession,
    repeatCount,
    estimatedTotal,
    ratingsCount,
    uniqueCardsCount,
    toReviewCards,
    timeCriticalCards,
  ]);

  const newCardPositions = useMemo(() => {
    if (phase !== "limit-reached" && phase !== "finishing") {
      return [];
    }

    const newCardIds = new Set(
      Array.from(seenCardIds).filter((id) => {
        const card = providedCards?.find((c) => c.id === id);
        return card && isNewCard(card);
      })
    );

    const totalQueueLength = Math.max(timeCriticalCards.length, 1);

    return timeCriticalCards
      .map((card, index) => ({
        card,
        index,
        isNewCard: newCardIds.has(card.id),
      }))
      .filter(({ isNewCard }) => isNewCard)
      .map(({ card, index }) => ({
        cardId: card.id,
        position: index + 1,
        queuePercentage: (index / (totalQueueLength - 1 || 1)) * 100,
        dueInMinutes: Math.max(
          0,
          Math.ceil((card.model.due.getTime() - Date.now()) / 60000)
        ),
      }));
  }, [phase, seenCardIds, timeCriticalCards, providedCards, isNewCard]);

  return {
    newCardsNumber: newCards.length,
    timeCriticalCardsNumber: timeCriticalCards.length,
    toReviewCardsNumber: toReviewCards.length,
    learnedCardsNumber: learnedCards.length,
    uniqueCardsCount,
    uniqueCardsLimit: options.maxUniqueCardsPerSession,
    todayNewCardsCount,
    todayNewCardsLimit: options.maxNewCardsPerDay,
    phase,
    newCardPositions,

    currentCard,
    currentCardRepeatInfo,

    showingAnswer,
    showAnswer: () => setShowingAnswer(true),

    answerCard: answer,
    updateStatistics,
    requestNextCard: () => setRequestedNextCard(true),

    statistics,
    isFinished,
    estimatedTotal,
    dynamicMax,
    progress,

    options,
    finishUp,

    // 内部状态，用于预取 notes
    isInitialized,
    timeCriticalCards,
    newCards,
    toReviewCards,
    learnedCards,
  };
}

export function useRepetitionAccuracy(ratingsList: number[]): number {
  return useMemo(() => {
    if (ratingsList.length !== 0) {
      let sum = 0;
      ratingsList.forEach((rating) => {
        sum += (rating - 1) / 2;
      });
      return Math.round((sum / ratingsList.length) * 1000) / 10;
    }
    return Number.NaN;
  }, [ratingsList]);
}
