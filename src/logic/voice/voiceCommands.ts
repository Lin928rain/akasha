/**
 * 语音命令解析模块
 * 将识别的语音文本映射到具体的学习操作
 */

import { Rating } from 'fsrs.js';
import { pinyin } from 'pinyin-pro';

export interface VoiceCommand {
  type: 'showAnswer' | 'answer' | 'stopTts' | 'replayTts';
  rating?: Rating;
  confidence?: number;
}

export interface VoiceCommandMatch {
  command: VoiceCommand;
  score: number;
}

/**
 * 中文命令词映射 - 只保留按钮上显示的文字
 */
const ZH_COMMANDS: Record<string, string[]> = {
  showAnswer: ['显示答案'],
  answerAgain: ['重来'],
  answerHard: ['困难'],
  answerGood: ['良好'],
  answerEasy: ['简单'],
  answerSlash: ['斩'],
  stopTts: ['停止'],
  replayTts: ['重听'],
};

/**
 * 英文命令词映射 - 只保留按钮上显示的文字
 */
const EN_COMMANDS: Record<string, string[]> = {
  showAnswer: ['Show Answer'],
  answerAgain: ['Again'],
  answerHard: ['Hard'],
  answerGood: ['Good'],
  answerEasy: ['Easy'],
  answerSlash: ['Slash'],
  stopTts: ['Stop'],
  replayTts: ['Replay'],
};

/**
 * 将中文文本转换为拼音（不带声调）
 */
function toPinyin(text: string): string {
  return pinyin(text, { toneType: 'none' }).replace(/\s+/g, '');
}

/**
 * 计算文本与命令的匹配分数 - 支持拼音匹配
 */
function matchCommand(text: string, commands: Record<string, string[]>): VoiceCommandMatch | null {
  let bestMatch: VoiceCommandMatch | null = null;

  // 将输入文本转换为拼音（用于中文同音字匹配）
  const textPinyin = toPinyin(text);

  for (const [commandType, keywords] of Object.entries(commands)) {
    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      const keywordPinyin = toPinyin(keyword);

      // 1. 精确匹配：识别的文本包含关键词
      if (text.includes(keywordLower)) {
        const score = keyword.length / 2;
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = {
            command: commandTypeToCommand(commandType),
            score,
          };
        }
      }
      // 2. 拼音匹配：识别的文本的拼音包含关键词的拼音
      else if (textPinyin.includes(keywordPinyin)) {
        const score = keywordPinyin.length / 2;
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = {
            command: commandTypeToCommand(commandType),
            score,
          };
        }
      }
    }
  }

  return bestMatch;
}

/**
 * 将命令类型字符串转换为 VoiceCommand 对象
 */
function commandTypeToCommand(commandType: string): VoiceCommand {
  switch (commandType) {
    case 'showAnswer':
      return { type: 'showAnswer' };
    case 'answerAgain':
      return { type: 'answer', rating: Rating.Again };
    case 'answerHard':
      return { type: 'answer', rating: Rating.Hard };
    case 'answerGood':
      return { type: 'answer', rating: Rating.Good };
    case 'answerEasy':
      return { type: 'answer', rating: Rating.Easy };
    case 'answerSlash':
      return { type: 'answer', rating: Rating.Easy }; // Slash 逻辑在 LearnView 中单独处理
    case 'stopTts':
      return { type: 'stopTts' };
    case 'replayTts':
      return { type: 'replayTts' };
    default:
      return { type: 'showAnswer' };
  }
}

/**
 * 解析语音命令
 * @param transcript - 识别的语音文本
 * @param language - 语言类型 'zh' | 'en'
 */
export function parseVoiceCommand(
  transcript: string,
  language: 'zh' | 'en' = 'zh'
): VoiceCommand | null {
  // 清理文本：去除标点符号和特殊字符，只保留文字和数字
  const cleanedText = transcript
    .replace(/[.,.!?!,.?()\[\]{}""''\-—…、；：？！…]/g, '')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase();

  if (!cleanedText) return null;

  const commands = language === 'zh' ? ZH_COMMANDS : EN_COMMANDS;
  const match = matchCommand(cleanedText, commands);

  if (!match) return null;

  return {
    ...match.command,
    confidence: match.score,
  };
}

/**
 * 获取所有可用的命令关键词（用于帮助提示）
 */
export function getAvailableCommands(language: 'zh' | 'en'): Record<string, string[]> {
  return language === 'zh' ? ZH_COMMANDS : EN_COMMANDS;
}
