import { apiRequest } from "../api";

export interface SentenceGenerationRequest {
  word: string;
  language?: string;
}

export interface SentenceGenerationResponse {
  sentence: string;
  translation?: string;
}

/**
 * 调用后端 AI 代理 API 生成造句
 * 后端统一管理 AI API Key，前端无需配置
 */
export async function generateSentence(
  request: SentenceGenerationRequest
): Promise<SentenceGenerationResponse> {
  const { word, language = "zh" } = request;

  const response = await apiRequest<SentenceGenerationResponse>(
    "/ai/generate-sentence",
    {
      method: "POST",
      body: JSON.stringify({ word, language }),
    }
  );

  return response;
}

/**
 * 从卡片内容中提取词汇
 * 提取未遮挡部分的文本作为造句的词语
 */
export function extractWordsFromCard(cardContent: unknown): {
  word: string;
  language: string;
}[] {
  // 辅助函数：从 HTML 字符串中提取纯文本
  function extractTextFromHtml(html: string): string {
    if (!html || typeof html !== "string") {
      return "";
    }
    // 去除 HTML 标签
    return html.replace(/<[^>]*>/g, " ");
  }

  const results: { word: string; language: string }[] = [];

  if (!cardContent || typeof cardContent !== "object") {
    return results;
  }

  const record = cardContent as Record<string, unknown>;

  // 收集所有文本内容
  const texts: string[] = [];

  // Basic 类型：{ front: string, back: string }
  if (typeof record.front === "string") {
    texts.push(extractTextFromHtml(record.front));
  }
  // DoubleSided 类型：{ field1: string, field2: string }
  if (typeof record.field1 === "string") {
    texts.push(extractTextFromHtml(record.field1));
  }
  // Cloze 类型：{ text: string }
  if (typeof record.text === "string") {
    texts.push(extractTextFromHtml(record.text));
  }

  // 从收集的文本中提取词语
  for (const text of texts) {
    // 中文：提取连续的中文字符（2-4 个字作为词语）
    const chineseWords = text.match(/[\u4e00-\u9fff]{2,4}/g) || [];
    // 英文：提取单词（4 个字母以上）
    const englishWords = text.match(/\b[A-Za-z]{4,}\b/g) || [];

    // 添加中文词语
    for (const word of chineseWords) {
      if (!results.some((r) => r.word === word)) {
        results.push({ word, language: "zh" });
      }
    }

    // 添加英文词语
    for (const word of englishWords) {
      if (!results.some((r) => r.word === word)) {
        results.push({ word, language: "en" });
      }
    }
  }

  // 优先返回英文词语（如果是英文学习），否则返回第一个词语
  return results.slice(0, 5);
}
