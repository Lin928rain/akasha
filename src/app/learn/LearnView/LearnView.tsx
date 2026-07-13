import { AppHeaderContent } from "@/app/shell/Header/Header";
import { LearnModeSelector } from "@/components/LearnModeSelector";
import { VoiceIndicator } from "@/components/VoiceControl/VoiceIndicator";
import MissingObject from "@/components/MissingObject";
import { genericFail } from "@/components/Notification/Notification";
import i18n from "@/i18n";
import { getAdapter } from "@/logic/NoteTypeAdapter";
import { extractWordsFromCard, generateSentence } from "@/logic/ai/sentence";
import { getApiPrefix } from "@/logic/api";
import { getAccessToken } from "@/logic/auth";
import { CardSorts } from "@/logic/card/CardSorting";
import {
  type CardsLoadProgress,
  getCardsOfWithProgress,
} from "@/logic/card/getCardsOf";
import { db } from "@/logic/db";
import { useDeckFromUrl } from "@/logic/deck/hooks/useDeckFromUrl";
import { useLearning } from "@/logic/learn";
import { useNote } from "@/logic/note/hooks/useNote";
import { Note, NoteType } from "@/logic/note/note";
import { useSetting } from "@/logic/settings/hooks/useSetting";
import {
  formatTtsRate,
  getDefaultVoiceForLanguage,
} from "@/logic/tts/ttsConfig";
import {
  parseVoiceCommand,
} from "@/logic/voice";
import {
  ActionIcon,
  Flex,
  Loader,
  Modal,
  Paper,
  Progress,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconLoader2, IconPlayerStop, IconVolume2 } from "@tabler/icons-react";
import { Rating } from "fsrs.js";
import { applySlashRatingToCard } from "@/logic/learnReview";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import FinishedLearningView from "../FinishedLearningView/FinishedLearningView";
import LearnViewCurrentCardStateIndicator from "../LearnViewCurrentCardStateIndicator/LearnViewCurrentCardStateIndicator";
import classes from "./LearnView.module.css";
import LearnViewFooter from "./LearnViewFooter";
import LearnViewHeader, { stopwatchResult } from "./LearnViewHeader";
import VisualFeedback from "./VisualFeedback";

function LearnView() {
  const [t] = useTranslation();
  const [useVisualFeedback] = useSetting("useVisualFeedback");
  const [loadingProgress, setLoadingProgress] =
    useState<CardsLoadProgress | null>(null);
  const [notePrefetchProgress, setNotePrefetchProgress] = useState<{
    loaded: number;
    total: number;
  } | null>(null);
  const [notePrefetchError, setNotePrefetchError] = useState<string | null>(
    null
  );
  // const [notePrefetchComplete, setNotePrefetchComplete] = useState(false); // 暂时不用
  // const [audioPrefetchProgress, setAudioPrefetchProgress] = useState<{ loaded: number; total: number } | null>(null);
  // const [audioPrefetchError, setAudioPrefetchError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingLineIndex, setSpeakingLineIndex] = useState<number | null>(
    null
  );
  const [lineAnchors, setLineAnchors] = useState<LineAnchor[]>([]);
  const [pendingLineIndex, setPendingLineIndex] = useState<number | null>(null);
  const cardContentRef = useRef<HTMLDivElement | null>(null);
  const cardContainerRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);
  const ttsSequenceRef = useRef(0);
  const lastAutoReadCardIdRef = useRef<string | null>(null);
  const lineAnchorsCardIdRef = useRef<string | null>(null);
  const autoReadReadyRef = useRef(false);
  const userInteractedRef = useRef(false);
  const notePrefetchCompletedRef = useRef(false);
  const [ttsVoiceZh] = useSetting("tts_voice_zh");
  const [ttsVoiceEn] = useSetting("tts_voice_en");
  const [ttsRate] = useSetting("tts_rate");

  // 语音控制设置
  const [voiceControlEnabled] = useSetting("voice_control_enabled");
  const [voiceControlLanguage] = useSetting("voice_control_language");
  const [isVoiceControlManualToggle, setIsVoiceControlManualToggle] =
    useState(false);

  // 语音控制状态
  const [isListening, setIsListening] = useState(false);
  const [voiceIsSupported, setVoiceIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [commandCount, setCommandCount] = useState(0);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const controllerRef = useRef<any>(null);
  const speakingLineIndexRef = useRef<number | null>(null);
  const lineAnchorsRef = useRef<any[]>([]);
  const readLineRef = useRef<{(line: string, index: number, sequenceId?: number): Promise<void>} | null>(null);
  const isVoiceControlManualToggleRef = useRef(false);
  const shouldAutoReadAfterShowAnswerRef = useRef(false);

  // Note 缓存，用于预取和避免重复请求
  const noteCacheRef = useRef<Map<string, Note<NoteType>>>(new Map());

  // 自动造句功能
  const [autoSentence, setAutoSentenceEnabled] = useState(false);
  const [generatedSentence, setGeneratedSentence] = useState<string | null>(
    null
  );
  const [generatedTranslation, setGeneratedTranslation] = useState<string | null>(
    null
  );
  const [sentenceLoading, setSentenceLoading] = useState(false);
  const [sentenceError, setSentenceError] = useState<string | null>(null);
  const [showSentence, setShowSentence] = useState(false);
  const sentenceSequenceRef = useRef(0);

  // 学习模式选择状态
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>();
  const [hasShownModeSelector, setHasShownModeSelector] = useState(false);
  const [shouldStartLearning, setShouldStartLearning] = useState(false);

  const navigate = useNavigate();
  const [deck, isReady, params, searchParams] = useDeckFromUrl();

  const [newToReviewRatio] = useSetting("learn_newToReviewRatio");
  const [maxUniqueCardsPerSession] = useSetting(
    "learn_maxUniqueCardsPerSession"
  );
  const [maxNewCardsPerDay] = useSetting("learn_maxNewCardsPerDay");

  // 从 URL 读取新卡片限制参数
  const newCardsLimitParam = searchParams.get("newCardsLimit");
  const newCardsLimit = newCardsLimitParam
    ? Number.parseInt(newCardsLimitParam, 10)
    : undefined;
  // 是否突破每日新卡片限制（只受单次学习卡片数量上限限制）
  const newCardsLimitUnlimited =
    searchParams.get("newCardsLimitUnlimited") === "1";

  // 使用 useMemo 稳定 options 对象引用
  const learnOptions = useMemo(
    () => ({
      learnAll: params === "all",
      newToReviewRatio: newToReviewRatio ?? 0.5,
      maxUniqueCardsPerSession: (maxUniqueCardsPerSession as number) || 50,
      maxNewCardsPerDay: (maxNewCardsPerDay as number) || 20,
      newCardsLimit: newCardsLimit,
      newCardsLimitUnlimited,
      sort: CardSorts.byCreationDate(1),
      shuffle: deck?.options?.shuffleCards,
      groupId: selectedGroupId,
      cardGroups: deck?.options?.cardGroups,
      groupLearningRespectLimits:
        deck?.options?.groupLearningRespectLimits ?? false,
    }),
    [
      params,
      newToReviewRatio,
      maxUniqueCardsPerSession,
      maxNewCardsPerDay,
      newCardsLimit,
      newCardsLimitUnlimited,
      selectedGroupId,
      deck?.options?.cardGroups,
      deck?.options?.groupLearningRespectLimits,
      deck?.options?.shuffleCards,
    ]
  );

  const controller = useLearning(
    {
      querier: () => {
        if (!shouldStartLearning) {
          // 如果还没开始学习，返回空数组
          return Promise.resolve([]);
        }
        return getCardsOfWithProgress(deck, false, (progress) =>
          setLoadingProgress(progress)
        );
      },
      dependencies: [deck, shouldStartLearning],
    },
    learnOptions
  );

  const currentNoteId = controller.currentCard?.note ?? "";
  const note = useNote(currentNoteId, noteCacheRef.current);
  const cardContent = note?.content;
  const isNoteReady = !controller.currentCard || note?.id === currentNoteId;

  const [currentRating, setCurrentRating] = useState<Rating | null>(null);
  const [isSlash, setIsSlash] = useState<boolean>(false);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  const [debouncedFinish] = useDebouncedValue(controller.isFinished, 50);
  const ttsEnabled = true;

  // 更新 refs 以保持在闭包中访问最新状态
  useEffect(() => {
    controllerRef.current = controller;
    speakingLineIndexRef.current = speakingLineIndex;
    lineAnchorsRef.current = lineAnchors;
    isVoiceControlManualToggleRef.current = isVoiceControlManualToggle;
  }, [controller, speakingLineIndex, lineAnchors, isVoiceControlManualToggle]);

  const answerButtonPressed = useCallback(
    async (rating: Rating) => {
      try {
        controller.answerCard(rating);
        controller.requestNextCard();
        setIsTransitioning(true);
        setCurrentRating(rating);
        setTimeout(() => setCurrentRating(null), 150);
      } catch (error) {
        genericFail();
        console.log(error);
      }
    },
    [controller]
  );

  const handleSlash = useCallback(() => {
    try {
      if (controller.currentCard) {
        // 执行斩操作（异步，不等待完成）
        void applySlashRatingToCard(controller.currentCard);

        // 更新统计数据并设置 showingAnswer 为 false（和 answerCard 一样）
        controller.updateStatistics(Rating.Easy);

        controller.requestNextCard();
        setIsTransitioning(true);
        setIsSlash(true);
        setCurrentRating(Rating.Easy);
        setTimeout(() => {
          setIsSlash(false);
          setCurrentRating(null);
        }, 150);
      }
    } catch (error) {
      genericFail();
      console.log(error);
    }
  }, [controller]);

  useEffect(() => {
    if (controller.isFinished) {
      stopwatchResult && stopwatchResult.pause();
    } else {
      stopwatchResult && stopwatchResult.start();
    }
  }, [controller.isFinished]);

  useEffect(() => {
    if (controller.currentCard) {
      setIsTransitioning(false);
    }
  }, [controller.currentCard]);

  useEffect(() => {
    if (controller.currentCard?.id) {
      autoReadReadyRef.current = false;
      lastAutoReadCardIdRef.current = null;
    }
  }, [controller.currentCard?.id]);

  const stopSpeaking = useCallback(() => {
    ttsSequenceRef.current += 1;
    ttsAbortRef.current?.abort();
    ttsAbortRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setIsSpeaking(false);
    setSpeakingLineIndex(null);
    setPendingLineIndex(null);
  }, []);

  // 语音控制事件监听
  useEffect(() => {
    const handleStopTts = () => {
      stopSpeaking();
    };

    const handleReplayTts = () => {
      // 重播当前行的 TTS
      if (speakingLineIndex !== null && lineAnchors[speakingLineIndex]) {
        readLine(lineAnchors[speakingLineIndex].text, speakingLineIndex);
      } else if (lineAnchors.length > 0) {
        // 如果没有正在朗读的行，朗读第一行
        readLine(lineAnchors[0].text, 0);
      }
    };

    window.addEventListener('voice-stop-tts', handleStopTts);
    window.addEventListener('voice-replay-tts', handleReplayTts);

    return () => {
      window.removeEventListener('voice-stop-tts', handleStopTts);
      window.removeEventListener('voice-replay-tts', handleReplayTts);
    };
  }, [stopSpeaking, speakingLineIndex, lineAnchors]);

  // 检测浏览器语音识别支持
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceIsSupported(true);
    } else {
      setVoiceIsSupported(false);
      setVoiceError('浏览器不支持语音识别，请使用 Chrome 或 Edge 浏览器');
    }
  }, []);

  // 语音控制初始化 - 只有在手动启用时才开始监听
  useEffect(() => {
    if (!voiceControlEnabled || !isVoiceControlManualToggle) {
      setIsListening(false);
      return;
    }

    if (!voiceIsSupported) {
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    const recognition = new SpeechRecognition();
    recognition.lang = voiceControlLanguage === 'en' ? 'en-US' : 'zh-CN';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceError(null);
    };

    recognition.onresult = (event: any) => {
      const lastResult = event.results[event.results.length - 1];
      const transcriptText = lastResult[0].transcript.trim();
      const speechConfidence = lastResult[0].confidence || 0;

      setTranscript(transcriptText);

      // 如果是最终结果，处理命令
      if (lastResult.isFinal) {
        const command = parseVoiceCommand(transcriptText, voiceControlLanguage as 'zh' | 'en');
        console.log('[Voice Control] Raw transcript:', transcriptText);
        console.log('[Voice Control] Parsed command:', command);
        console.log('[Voice Control] Speech confidence:', speechConfidence);

        if (command) {
          console.log('[Voice Control] Command:', command, 'Transcript:', transcriptText);

          setCommandCount(prev => prev + 1);

          const currentController = controllerRef.current;
          const currentSpeakingLineIndex = speakingLineIndexRef.current;
          const currentLineAnchors = lineAnchorsRef.current;

          if (currentController) {
            switch (command.type) {
              case 'showAnswer':
                console.log('[Voice Control] Executing showAnswer');
                if (!currentController.showingAnswer) {
                  shouldAutoReadAfterShowAnswerRef.current = true;
                  currentController.showAnswer();
                }
                break;
              case 'answer':
                console.log('[Voice Control] Executing answer:', command.rating);
                if (command.rating) {
                  // 如果卡片在问题面，先显示答案再评分；如果已在答案面，直接评分
                  if (!currentController.showingAnswer) {
                    // 先显示答案，然后在下一个事件循环中执行评分
                    currentController.showAnswer();
                    setTimeout(() => {
                      currentController.answerCard(command.rating!);
                      currentController.requestNextCard();
                    }, 100);
                  } else {
                    currentController.answerCard(command.rating);
                    currentController.requestNextCard();
                  }
                }
                break;
              case 'stopTts':
                console.log('[Voice Control] Executing stopTts');
                stopSpeaking();
                break;
              case 'replayTts':
                console.log('[Voice Control] Executing replayTts');
                if (currentSpeakingLineIndex !== null && currentLineAnchors[currentSpeakingLineIndex]) {
                  readLineRef.current?.(currentLineAnchors[currentSpeakingLineIndex].text, currentSpeakingLineIndex);
                } else if (currentLineAnchors.length > 0) {
                  readLineRef.current?.(currentLineAnchors[0].text, 0);
                }
                break;
            }
          }
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('语音识别错误:', event.error, event.message);
      let errorMessage = `识别错误：${event.error}`;
      if (event.error === 'no-speech') {
        errorMessage = '未检测到语音，请对着麦克风说话';
      } else if (event.error === 'audio-capture') {
        errorMessage = '无法访问麦克风，请检查权限设置';
      } else if (event.error === 'not-allowed') {
        errorMessage = '麦克风权限被拒绝';
      }
      setVoiceError(errorMessage);
      setIsListening(false);
    };

    recognition.onend = () => {
      // 连续模式下自动重启
      if (isVoiceControlManualToggleRef.current) {
        try {
          recognition.start();
        } catch (e) {
          // 忽略重启失败
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();

    return () => {
      recognition.stop();
    };
  }, [voiceControlEnabled, isVoiceControlManualToggle, voiceControlLanguage, stopSpeaking]);

  // 卡组变化时重置语音控制手动开关
  useEffect(() => {
    setIsVoiceControlManualToggle(false);
  }, [deck?.id]);

  // 检查是否需要显示学习模式选择器
  useEffect(() => {
    if (deck && !hasShownModeSelector && isReady) {
      const enableCardBatching = deck.options?.enableCardBatching ?? false;
      const hasGroups = (deck.options?.cardGroups?.length ?? 0) > 0;

      if (enableCardBatching && hasGroups) {
        setShowModeSelector(true);
        setHasShownModeSelector(true);
      } else {
        // 不需要选择模式，直接开始学习
        setShouldStartLearning(true);
      }
    }
  }, [deck, hasShownModeSelector, isReady]);

  const handleModeConfirm = (groupId?: string) => {
    setSelectedGroupId(groupId);
    // 用户选择模式后，开始加载卡片
    setShouldStartLearning(true);
    setShowModeSelector(false);
  };

  // 预取 Notes - 在开始学习后，批量获取本次学习可能用到的所有 notes
  // 包含进度跟踪和网络错误重试机制
  useEffect(() => {
    if (!controller.isInitialized) return;

    // 收集本次学习所有可能用到的 noteIds
    const allNoteIds = [
      ...controller.timeCriticalCards,
      ...controller.newCards,
      ...controller.toReviewCards,
      ...controller.learnedCards,
    ].map((card) => card.note);

    // 过滤掉已经缓存的
    const uniqueNoteIds = Array.from(new Set(allNoteIds));
    const missingIds = uniqueNoteIds.filter(
      (id) => !noteCacheRef.current.has(id)
    );

    if (missingIds.length === 0) {
      setNotePrefetchProgress(null);
      setNotePrefetchError(null);
      notePrefetchCompletedRef.current = true;
      console.log("[Note Prefetch] All notes already cached");
      return;
    }

    // 重试配置
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 1000;

    let retryCount = 0;
    let isCancelled = false;

    const fetchWithRetry = async (): Promise<void> => {
      try {
        setNotePrefetchError(null);
        setNotePrefetchProgress({ loaded: 0, total: missingIds.length });

        // 分批获取，每批 50 个
        const BATCH_SIZE = 50;
        let loadedCount = 0;

        for (let i = 0; i < missingIds.length; i += BATCH_SIZE) {
          if (isCancelled) return;

          const batch = missingIds.slice(i, i + BATCH_SIZE);
          const batchNotes = await db.notes.bulkGet(batch);

          batchNotes.forEach((note) => {
            if (note) {
              noteCacheRef.current.set(note.id, note);
            }
          });

          loadedCount += batch.length;
          setNotePrefetchProgress({
            loaded: loadedCount,
            total: missingIds.length,
          });
        }

        // 完成
        setNotePrefetchProgress(null);
        setNotePrefetchError(null);
        notePrefetchCompletedRef.current = true;
        console.log(
          "[Note Prefetch] Completed, cached",
          uniqueNoteIds.length - missingIds.length,
          "new",
          missingIds.length
        );
      } catch (error) {
        if (isCancelled) return;

        console.error("Note prefetch failed:", error);
        retryCount += 1;

        if (retryCount <= MAX_RETRIES) {
          // 重试
          setNotePrefetchError(
            `网络不稳定，${RETRY_DELAY_MS / 1000}秒后重试... (${retryCount}/${MAX_RETRIES})`
          );
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
          await fetchWithRetry();
        } else {
          // 超过最大重试次数，显示错误
          setNotePrefetchError(
            "网络错误：无法获取笔记内容，请检查网络连接后重试"
          );
          setNotePrefetchProgress(null);
        }
      }
    };

    void fetchWithRetry();

    return () => {
      isCancelled = true;
    };
  }, [
    controller.isInitialized,
    controller.timeCriticalCards,
    controller.newCards,
    controller.toReviewCards,
    controller.learnedCards,
  ]);

  // 音频预下载功能已暂时移除，每次直接从服务器获取 TTS 音频

  const readLine = useCallback(
    async (line: string, index: number, sequenceId?: number) => {
      if (!ttsEnabled) return;
      const sanitizedLine = sanitizeTtsText(line);
      if (!sanitizedLine) return;
      if (!sequenceId) {
        stopSpeaking();
      }
      const currentSequence = sequenceId ?? ttsSequenceRef.current;
      setPendingLineIndex(index);

      const detectedLanguage = detectLanguageForText(sanitizedLine);
      const voice =
        detectedLanguage === "zh" && ttsVoiceZh
          ? ttsVoiceZh
          : detectedLanguage === "en" && ttsVoiceEn
            ? ttsVoiceEn
            : getDefaultVoiceForLanguage(detectedLanguage);
      const rate = formatTtsRate(ttsRate ?? 0);

      // 发起网络请求获取 TTS 音频
      const controller = new AbortController();
      ttsAbortRef.current = controller;
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) return;
        if (currentSequence !== ttsSequenceRef.current) return;
        const response = await fetch(`${getApiPrefix()}/tts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            text: sanitizedLine,
            voice,
            rate,
            stream: true,
          }),
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`TTS request failed: ${response.status}`);
        }
        if (response.body) {
          await playStreamedAudio({
            response,
            audioRef,
            audioUrlRef,
            onStart: () => {
              if (currentSequence !== ttsSequenceRef.current) return;
              setPendingLineIndex(null);
              setIsSpeaking(true);
              setSpeakingLineIndex(index);
            },
            onStop: () => {
              if (currentSequence !== ttsSequenceRef.current) return;
              setIsSpeaking(false);
              setSpeakingLineIndex(null);
              setPendingLineIndex(null);
            },
          });
        }
      } catch (error) {
        if ((error as Error)?.name !== "AbortError") {
          genericFail();
          console.log(error);
        }
        if (currentSequence !== ttsSequenceRef.current) return;
        setIsSpeaking(false);
        setSpeakingLineIndex(null);
        setPendingLineIndex(null);
      }
    },
    [stopSpeaking, ttsEnabled, ttsRate, ttsVoiceEn, ttsVoiceZh]
  );

  // 更新 readLineRef 以在闭包中访问最新状态
  useEffect(() => {
    readLineRef.current = readLine;
  }, [readLine]);

  useEffect(() => {
    setLoadingProgress(null);
    // 重置预取状态
    notePrefetchCompletedRef.current = false;
    setNotePrefetchProgress(null);
    setNotePrefetchError(null);
  }, [deck?.id]);

  useEffect(() => {
    if (!cardContentRef.current || !isNoteReady) {
      setLineAnchors([]);
      lineAnchorsCardIdRef.current = null;
      autoReadReadyRef.current = false;
      return;
    }

    const targetCardId = controller.currentCard?.id ?? null;
    let animationFrameId = 0;
    let nestedAnimationFrameId = 0;

    setLineAnchors([]);
    lineAnchorsCardIdRef.current = null;
    autoReadReadyRef.current = false;

    const updateLines = () => {
      if (!cardContentRef.current) return;
      const anchors = getLineAnchors(cardContentRef.current);
      setLineAnchors(anchors);
      lineAnchorsCardIdRef.current = targetCardId;
      if (anchors.length > 0) {
        autoReadReadyRef.current = true;
      }
    };

    animationFrameId = window.requestAnimationFrame(() => {
      nestedAnimationFrameId = window.requestAnimationFrame(updateLines);
    });

    const observer = new MutationObserver(updateLines);
    observer.observe(cardContentRef.current, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    });
    const resizeObserver = new ResizeObserver(updateLines);
    resizeObserver.observe(cardContentRef.current);
    window.addEventListener("resize", updateLines);
    const scrollContainer = cardContainerRef.current;
    scrollContainer?.addEventListener("scroll", updateLines, { passive: true });
    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.cancelAnimationFrame(nestedAnimationFrameId);
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateLines);
      scrollContainer?.removeEventListener("scroll", updateLines);
    };
  }, [controller.currentCard?.id, controller.showingAnswer, isNoteReady]);

  useEffect(() => {
    stopSpeaking();
  }, [controller.currentCard?.id, controller.showingAnswer, stopSpeaking]);

  // 语音控制模式下，显示答案后自动朗读答案部分
  useEffect(() => {
    if (!isVoiceControlManualToggleRef.current) return;
    if (!controller.showingAnswer) return;
    if (!shouldAutoReadAfterShowAnswerRef.current) return;
    if (lineAnchors.length === 0) return;

    // 重置标志
    shouldAutoReadAfterShowAnswerRef.current = false;

    // 开始朗读
    const sequenceId = ttsSequenceRef.current + 1;
    ttsSequenceRef.current = sequenceId;
    void (async () => {
      for (let i = 0; i < lineAnchors.length; i += 1) {
        if (sequenceId !== ttsSequenceRef.current) return;
        await readLine(lineAnchors[i].text, i, sequenceId);
      }
    })();
  }, [controller.showingAnswer, lineAnchors]);

  useEffect(() => {
    const autoReadEnabled = deck?.options?.autoReadOnCard ?? false;
    if (!autoReadEnabled) return;
    if (!controller.currentCard) return;
    if (!isNoteReady) return;
    if (controller.showingAnswer) return;
    if (lineAnchors.length === 0) return;
    if (!autoReadReadyRef.current) return;
    if (lineAnchorsCardIdRef.current !== controller.currentCard.id) return;
    if (lastAutoReadCardIdRef.current === controller.currentCard.id) return;
    // 检查用户是否已与页面交互（浏览器自动播放策略要求）
    if (!userInteractedRef.current) {
      console.log("[Auto Read] Waiting for user interaction");
      return;
    }
    lastAutoReadCardIdRef.current = controller.currentCard.id;
    const sequenceId = ttsSequenceRef.current + 1;
    ttsSequenceRef.current = sequenceId;
    void (async () => {
      for (let i = 0; i < lineAnchors.length; i += 1) {
        if (sequenceId !== ttsSequenceRef.current) return;
        await readLine(lineAnchors[i].text, i, sequenceId);
      }
    })();
  }, [
    controller.currentCard,
    controller.showingAnswer,
    deck?.options?.autoReadOnCard,
    isNoteReady,
    lineAnchors,
    readLine,
  ]);

  // 监听用户交互，用于浏览器自动播放策略
  useEffect(() => {
    const handleInteraction = () => {
      userInteractedRef.current = true;
    };
    document.addEventListener("click", handleInteraction);
    document.addEventListener("keydown", handleInteraction);
    return () => {
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("keydown", handleInteraction);
    };
  }, []);

  // 切换卡片时重置造句显示状态
  useEffect(() => {
    setShowSentence(false);
    setGeneratedSentence(null);
    setGeneratedTranslation(null);
    setSentenceError(null);
    setSentenceLoading(false);
    sentenceSequenceRef.current++;
  }, [controller.currentCard?.id]);

  // 自动造句功能 - 检测卡组设置和卡片变化
  useEffect(() => {
    // 检查卡组是否启用了自动造句
    const deckAutoSentenceEnabled = deck?.options?.autoSentence ?? false;
    setAutoSentenceEnabled(deckAutoSentenceEnabled);

    // 如果未启用，清空当前造句
    if (!deckAutoSentenceEnabled) {
      setGeneratedSentence(null);
      setSentenceError(null);
      return;
    }

    // 如果没有当前卡片，跳过
    const currentCardId = controller.currentCard?.id;
    if (!currentCardId) {
      setGeneratedSentence(null);
      return;
    }

    // 如果是显示答案状态，不触发造句（只在问题面触发）
    if (controller.showingAnswer) {
      return;
    }

    if (!cardContent || !isNoteReady) {
      return;
    }

    // 提取词语并生成造句
    const currentSequence = sentenceSequenceRef.current;
    const fetchSentence = async () => {
      setSentenceLoading(true);
      setSentenceError(null);

      try {
        // 从卡片内容提取词语
        const wordItems = extractWordsFromCard(cardContent);

        if (wordItems.length === 0) {
          setSentenceLoading(false);
          setSentenceError("未能从卡片内容中提取到合适的词语");
          return;
        }

        // 优先使用英文词语，如果没有英文则使用第一个词语
        const firstEnglishWord = wordItems.find((w) => w.language === "en");
        const wordToUse = firstEnglishWord || wordItems[0];

        const result = await generateSentence({
          word: wordToUse.word,
          language: wordToUse.language,
        });

        // 如果期间已切换到新卡片，丢弃此响应
        if (currentSequence !== sentenceSequenceRef.current) {
          return;
        }

        setGeneratedSentence(result.sentence);
        if (result.translation) {
          setGeneratedTranslation(result.translation);
        }
      } catch (error) {
        // 如果期间已切换到新卡片，丢弃此错误
        if (currentSequence !== sentenceSequenceRef.current) {
          return;
        }
        console.error("造句失败:", error);
        setSentenceError(
          error instanceof Error ? error.message : "造句失败，请稍后重试"
        );
      }

      // 不在 finally 中 return，避免遮蔽异常
      if (currentSequence !== sentenceSequenceRef.current) return;
      setSentenceLoading(false);
    };

    void fetchSentence();
  }, [
    deck?.options?.autoSentence,
    controller.currentCard?.id,
    controller.showingAnswer,
    cardContent,
    isNoteReady,
  ]);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, [stopSpeaking]);

  if (isReady && !deck) {
    return <MissingObject />;
  }

  // 如果正在显示模式选择器，不渲染学习内容
  if (showModeSelector) {
    return (
      <div className={classes.learnView}>
        <AppHeaderContent>
          <LearnViewHeader
            currentCard={undefined}
            controller={controller}
            deck={deck}
            voiceControlProps={{
              isListening,
              isSupported: voiceIsSupported,
              isEnabled: isVoiceControlManualToggle,
              onToggle: () => setIsVoiceControlManualToggle(!isVoiceControlManualToggle),
              error: voiceError,
            }}
          />
        </AppHeaderContent>
        <Flex
          direction="column"
          justify="center"
          align="center"
          h="100%"
          w="100%"
        >
          <Loader color="green" size="lg" />
          <Text c="dimmed" size="sm" mt="md">
            请选择学习模式...
          </Text>
        </Flex>
        <LearnModeSelector
          opened={showModeSelector}
          setOpened={setShowModeSelector}
          cardGroups={deck?.options?.cardGroups || []}
          onConfirm={handleModeConfirm}
        />
      </div>
    );
  }

  return (
    <div className={classes.learnView}>
      <AppHeaderContent>
        <LearnViewHeader
          currentCard={controller.currentCard ?? undefined}
          controller={controller}
          deck={deck}
          voiceControlProps={{
            isListening,
            isSupported: voiceIsSupported,
            isEnabled: isVoiceControlManualToggle,
            onToggle: () => setIsVoiceControlManualToggle(!isVoiceControlManualToggle),
            error: voiceError,
          }}
        />
      </AppHeaderContent>

      {/* Note 预取进度条 */}
      {notePrefetchProgress && (
        <div className={classes.notePrefetchProgress}>
          <Progress
            value={
              (notePrefetchProgress.loaded / notePrefetchProgress.total) * 100
            }
            size="sm"
            color="green"
          />
          <Text size="xs" c="dimmed" ta="center" mt="xs">
            正在加载笔记内容：{notePrefetchProgress.loaded} /{" "}
            {notePrefetchProgress.total}
          </Text>
        </div>
      )}

      {/* 网络错误提示 */}
      {notePrefetchError && (
        <div className={classes.notePrefetchError}>
          <Text size="xs" c="red" ta="center">
            {notePrefetchError}
          </Text>
        </div>
      )}

      <Flex
        direction="column"
        justify="space-between"
        h="100%"
        w="100%"
        className={classes.learnViewWrapper}
      >
        {useVisualFeedback && <VisualFeedback rating={currentRating} isSlash={isSlash} />}
        <div className={classes.cardContainer} ref={cardContainerRef}>
          {!controller.currentCard && !controller.isFinished ? (
            <div className={classes.loadingState}>
              <Loader color="green" size="lg" />
              {loadingProgress?.total ? (
                <Text c="dimmed" size="sm">
                  已加载 {loadingProgress.loaded} / {loadingProgress.total} 张
                </Text>
              ) : (
                <Text c="dimmed" size="sm">
                  正在加载卡片…
                </Text>
              )}
            </div>
          ) : (
            <div className={classes.cardWrapper}>
              <Paper className={classes.card}>
                <LearnViewCurrentCardStateIndicator
                  currentCardModel={controller.currentCard?.model}
                />
                <div ref={cardContentRef} className={classes.cardContent}>
                  {isNoteReady &&
                    !controller.showingAnswer &&
                    controller.currentCard &&
                    getAdapter(controller.currentCard).displayQuestion(
                      controller.currentCard,
                      cardContent
                    )}
                  {isNoteReady &&
                    controller.showingAnswer &&
                    controller.currentCard &&
                    getAdapter(controller.currentCard).displayAnswer(
                      controller.currentCard,
                      cardContent
                    )}
                  {ttsEnabled && lineAnchors.length > 0 && (
                    <div className={classes.lineButtonOverlay}>
                      {lineAnchors.map((anchor, index) => {
                        const isLineSpeaking =
                          isSpeaking && speakingLineIndex === index;
                        const isLinePending = pendingLineIndex === index;
                        return (
                          <ActionIcon
                            key={`${index}-${anchor.text}`}
                            className={classes.lineButton}
                            size="xs"
                            variant="transparent"
                            color={isLineSpeaking ? "red" : "gray"}
                            onClick={() =>
                              isLineSpeaking
                                ? stopSpeaking()
                                : readLine(anchor.text, index)
                            }
                            style={{ top: `${anchor.top}px` }}
                            aria-label={
                              isLineSpeaking
                                ? i18n.t("learning.stop-reading")
                                : i18n.t("learning.read-aloud")
                            }
                          >
                            {isLinePending ? (
                              <IconLoader2 className={classes.spinIcon} />
                            ) : isLineSpeaking ? (
                              <IconPlayerStop />
                            ) : (
                              <IconVolume2 />
                            )}
                          </ActionIcon>
                        );
                      })}
                    </div>
                  )}
                  {/* 自动造句结果显示 */}
                  {autoSentence && (
                    <div className={classes.sentenceContainer} data-sentence-container="true">
                      {sentenceLoading ? (
                        <Text className={classes.sentenceLoading}>
                          {t("learning.generating-sentence")}
                        </Text>
                      ) : sentenceError ? (
                        <Text className={classes.sentenceText} c="red">
                          {sentenceError}
                        </Text>
                      ) : generatedSentence ? (
                        // 判断是否显示答案：答案面显示完整内容（造句 + 翻译），问题面显示造句（可点击展开）
                        controller.showingAnswer ? (
                          <div className={classes.sentenceContent}>
                            <Text className={classes.sentenceText}>
                              {generatedSentence}
                            </Text>
                            {generatedTranslation && (
                              <Text className={classes.sentenceTranslation}>
                                {generatedTranslation}
                              </Text>
                            )}
                          </div>
                        ) : showSentence ? (
                          // 问题面但已点击显示造句：只显示造句，不显示翻译
                          <Text className={classes.sentenceText}>
                            {generatedSentence}
                          </Text>
                        ) : (
                          // 问题面且未点击显示造句：显示按钮
                          <UnstyledButton
                            className={classes.sentenceButton}
                            onClick={() => setShowSentence(true)}
                          >
                            {t("image-occlusion.click-to-reveal-sentence")}
                          </UnstyledButton>
                        )
                      ) : null}
                    </div>
                  )}
                </div>
              </Paper>
              {isTransitioning && (
                <div className={classes.transitionOverlay}>
                  <Loader color="green" size="sm" />
                </div>
              )}
            </div>
          )}
        </div>
        <LearnViewFooter controller={controller} answer={answerButtonPressed} onSlash={handleSlash} />

        <Modal
          opened={debouncedFinish}
          onClose={() => navigate("/home")}
          fullScreen
          closeOnClickOutside={false}
          closeOnEscape={false}
          withCloseButton={false}
          transitionProps={{ transition: "fade" }}
        >
          <FinishedLearningView
            statistics={controller.statistics}
            time={stopwatchResult}
            deckId={deck?.id}
          />
        </Modal>

        {/* 语音控制状态指示器 */}
        {voiceControlEnabled && (
          <VoiceIndicator
            isListening={isListening}
            transcript={transcript}
            confidence={0}
            commandCount={commandCount}
          />
        )}
      </Flex>
    </div>
  );
}

export default LearnView;

const blockTags = new Set([
  "DIV",
  "P",
  "LI",
  "UL",
  "OL",
  "SECTION",
  "ARTICLE",
  "HEADER",
  "FOOTER",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "TABLE",
  "TR",
  "TD",
  "TH",
  "BLOCKQUOTE",
]);

function shouldIgnoreElement(element: Element) {
  if (element.getAttribute("aria-hidden") === "true") return true;
  if (element.getAttribute("data-occlusion-hint") === "true") return true;
  if (element.getAttribute("data-occlusion-hidden") === "true") return true;
  if (element.getAttribute("data-sentence-container") === "true") return true;
  if (
    element.classList.contains("occludable") &&
    !element.classList.contains("visible")
  ) {
    return true;
  }
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") return true;
  return false;
}

type LineAnchor = {
  text: string;
  top: number;
};

function getLineAnchors(root: HTMLElement): LineAnchor[] {
  const segments = collectVisibleSegments(root);
  if (segments.length === 0) return [];
  const rootRect = root.getBoundingClientRect();
  const anchors: LineAnchor[] = [];

  let lineStartIndex: number | null = null;
  let lineText = "";
  let globalIndex = 0;

  const flushLine = (endIndex: number) => {
    const trimmed = lineText.trim();
    if (!trimmed || lineStartIndex === null) return;
    const startPos = indexToDomPosition(lineStartIndex, segments);
    const endPos = indexToDomPosition(endIndex, segments);
    if (!startPos || !endPos) return;
    const range = document.createRange();
    range.setStart(startPos.node, startPos.offset);
    range.setEnd(endPos.node, endPos.offset);
    const rects = Array.from(range.getClientRects());
    if (rects.length === 0) return;
    anchors.push({
      text: trimmed,
      top: rects[0].top - rootRect.top + rects[0].height / 2,
    });
  };

  for (const segment of segments) {
    for (const char of segment.text) {
      if (char === "\n") {
        flushLine(globalIndex);
        lineStartIndex = null;
        lineText = "";
        globalIndex += 1;
        continue;
      }
      if (lineStartIndex === null) {
        lineStartIndex = globalIndex;
      }
      lineText += char;
      globalIndex += 1;
    }
  }

  flushLine(globalIndex);
  return anchors;
}

type Segment = {
  text: string;
  node: Text | null;
};

function collectVisibleSegments(root: HTMLElement): Segment[] {
  const segments: Segment[] = [];

  function walk(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      segments.push({ text: node.textContent ?? "", node: node as Text });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as Element;
    if (shouldIgnoreElement(element)) return;
    if (element.tagName === "BR") {
      segments.push({ text: "\n", node: null });
      return;
    }

    const isBlock = blockTags.has(element.tagName);
    if (isBlock) {
      segments.push({ text: "\n", node: null });
    }
    element.childNodes.forEach(walk);
    if (isBlock) {
      segments.push({ text: "\n", node: null });
    }
  }

  walk(root);
  return segments;
}

function indexToDomPosition(
  index: number,
  segments: Segment[]
): { node: Text; offset: number } | null {
  let currentIndex = 0;
  for (const segment of segments) {
    const length = segment.text.length;
    if (index <= currentIndex + length) {
      if (segment.node) {
        const offset = Math.max(0, index - currentIndex);
        return { node: segment.node, offset };
      }
      return findNextTextNode(segments, currentIndex + length);
    }
    currentIndex += length;
  }
  return null;
}

function findNextTextNode(
  segments: Segment[],
  startIndex: number
): { node: Text; offset: number } | null {
  let currentIndex = 0;
  for (const segment of segments) {
    const length = segment.text.length;
    if (currentIndex >= startIndex && segment.node) {
      return { node: segment.node, offset: 0 };
    }
    currentIndex += length;
  }
  return null;
}

type StreamPlayParams = {
  response: Response;
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
  audioUrlRef: React.MutableRefObject<string | null>;
  onStart: () => void;
  onStop: () => void;
};

async function playAudioBlob({
  blob,
  audioRef,
  audioUrlRef,
  onStart,
  onStop,
}: {
  blob: Blob;
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
  audioUrlRef: React.MutableRefObject<string | null>;
  onStart: () => void;
  onStop: () => void;
}): Promise<void> {
  const url = URL.createObjectURL(blob);
  audioUrlRef.current = url;
  const audio = audioRef.current ?? new Audio();
  audioRef.current = audio;
  audio.src = url;
  const finish = () => {
    onStop();
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  };
  await new Promise<void>((resolve) => {
    audio.onended = () => {
      finish();
      resolve();
    };
    audio.onerror = () => {
      finish();
      resolve();
    };
    onStart();
    void audio.play();
  });
}

async function playStreamedAudio({
  response,
  audioRef,
  audioUrlRef,
  onStart,
  onStop,
}: StreamPlayParams): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Streaming response body is not available.");
  }

  const chunks: Uint8Array[] = [];
  let receivedLength = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    if (value) {
      chunks.push(value);
      receivedLength += value.length;
    }
  }

  const merged = new Uint8Array(receivedLength);
  let position = 0;
  for (const chunk of chunks) {
    merged.set(chunk, position);
    position += chunk.length;
  }

  const blob = new Blob([merged], { type: "audio/mpeg" });
  await playAudioBlob({
    blob,
    audioRef,
    audioUrlRef,
    onStart,
    onStop,
  });
}

function detectLanguageForText(text: string): "zh" | "en" {
  const trimmed = text.trim();
  if (!trimmed) return "zh";
  const cjkMatches = trimmed.match(/[\u4e00-\u9fff]/g) ?? [];
  const latinMatches = trimmed.match(/[A-Za-z]/g) ?? [];
  if (cjkMatches.length === 0 && latinMatches.length === 0) {
    return "zh";
  }
  if (cjkMatches.length >= latinMatches.length) {
    return "zh";
  }
  return "en";
}

function sanitizeTtsText(text: string): string {
  return text
    .replace(/\*/g, "")
    .replace(/[\u00B9\u00B2\u00B3\u2070-\u207F\u2080-\u208E]/g, "")
    .replace(/(?:\[\d{1,3}\]|\(\d{1,3}\)|\{\d{1,3}\}|<\d{1,3}>)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// 从 note content 中提取纯文本行 - 暂时不用
// function extractTextLines(content: unknown): string[] {
//   const lines: string[] = [];

//   // 辅助函数：从 HTML 字符串中提取纯文本
//   function extractTextFromHtml(html: string): string[] {
//     if (!html || typeof html !== 'string') {
//       return [];
//     }
//     // 如果是浏览器环境，使用 DOMParser
//     if (typeof DOMParser !== 'undefined') {
//       const parser = new DOMParser();
//       const doc = parser.parseFromString(html, 'text/html');
//       const text = doc.body.textContent || '';
//       // 按换行分割，过滤空行
//       return text.split(/\n+/).map(s => s.trim()).filter(s => s.length > 0);
//     }
//     //  fallback: 简单去除 HTML 标签
//     const text = html.replace(/<[^>]*>/g, ' ');
//     return text.split(/\n+/).map(s => s.trim()).filter(s => s.length > 0);
//   }

//   if (!content || typeof content !== 'object') {
//     return [];
//   }

//   const record = content as Record<string, unknown>;

//   // 处理不同类型的 note content
//   // Basic 类型：{ front: string, back: string }
//   if (typeof record.front === 'string') {
//     lines.push(...extractTextFromHtml(record.front as string));
//   }
//   if (typeof record.back === 'string') {
//     lines.push(...extractTextFromHtml(record.back as string));
//   }

//   // DoubleSided 类型：{ field1: string, field2: string }
//   if (typeof record.field1 === 'string') {
//     lines.push(...extractTextFromHtml(record.field1 as string));
//   }
//   if (typeof record.field2 === 'string') {
//     lines.push(...extractTextFromHtml(record.field2 as string));
//   }

//   // Cloze 类型：{ text: string }
//   if (typeof record.text === 'string') {
//     lines.push(...extractTextFromHtml(record.text as string));
//   }

//   return lines;
// }

// // base64 转 Blob - 暂时不用
// function base64ToBlob(base64: string, contentType: string): Blob {
//   const byteCharacters = atob(base64);
//   const byteArrays = [];

//   for (let offset = 0; offset < byteCharacters.length; offset += 512) {
//     const slice = byteCharacters.slice(offset, offset + 512);
//     const byteNumbers = new Array(slice.length);
//     for (let i = 0; i < slice.length; i += 1) {
//       byteNumbers[i] = slice.charCodeAt(i);
//     }
//     const byteArray = new Uint8Array(byteNumbers);
//     byteArrays.push(byteArray);
//   }

//   return new Blob(byteArrays, { type: contentType });
// }
