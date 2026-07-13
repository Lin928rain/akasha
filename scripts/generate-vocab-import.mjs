/**
 * 高考词汇导入脚本 - 生成 Akasha 兼容的导入格式
 *
 * 使用方法：
 * 1. 运行脚本：node scripts/generate-vocab-import.mjs
 *
 * 2. 打开 Akasha 应用，进入"英语"卡组（或创建新卡组）
 *
 * 3. 在设置中找到导入功能，选择生成的文件：
 *    - 卡片分隔符：---CARD---
 *    - 正反面分隔符：---QA---
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 词汇条目接口
// word: 词汇
// definitions: 词性和中文解释 { "n.": "名词解释", "v.": "动词解释" }
// examples: 例句 { "英文例句": "中文翻译" }
// phrases: 词组 { "词组": "解释" }
// extension: 扩展解释文本

// 解析 JSON 字段
function parseJsonField(str) {
  if (!str || str === "无" || str.trim() === "") {
    return {};
  }
  let cleaned = str.trim();
  if (cleaned.startsWith("`")) cleaned = cleaned.slice(1);
  if (cleaned.endsWith("`")) cleaned = cleaned.slice(0, -1);
  try {
    return JSON.parse(cleaned);
  } catch (_e) {
    return {};
  }
}

// 解析 Markdown 表格
function parseVocabFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const entries = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || trimmed.includes(":---")) continue;

    const columns = trimmed
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    if (columns.length < 6) continue;

    const id = Number.parseInt(columns[0], 10);
    if (Number.isNaN(id)) continue;

    const word = columns[1];
    const definitions = parseJsonField(columns[2]);
    const examples = parseJsonField(columns[3]);
    const phrases = parseJsonField(columns[4]);
    const extension = columns[5];

    if (!word) continue;

    entries.push({ word, definitions, examples, phrases, extension });
  }

  return entries;
}

// 生成正面内容
function generateFront(entry) {
  const lines = [entry.word];
  const hasExtras =
    Object.keys(entry.examples).length > 0 ||
    Object.keys(entry.phrases).length > 0;

  if (hasExtras) {
    lines.push("{{");
    for (const en of Object.keys(entry.examples)) {
      lines.push(en);
    }
    for (const phrase of Object.keys(entry.phrases)) {
      lines.push(phrase);
    }
    lines.push("}}");
  }

  return lines.join("\n");
}

// 生成反面内容
function generateBack(entry) {
  const lines = [];

  for (const [pos, def] of Object.entries(entry.definitions)) {
    lines.push(`${pos} ${def}`);
  }

  for (const [, cn] of Object.entries(entry.examples)) {
    lines.push(cn);
  }

  for (const [, meaning] of Object.entries(entry.phrases)) {
    lines.push(meaning);
  }

  if (entry.extension && entry.extension !== "无") {
    lines.push(entry.extension);
  }

  return lines.join("\n");
}

// 主函数
function main() {
  const vocabFile = path.resolve(__dirname, "../merged_vocab.md");
  const outputFile = path.resolve(__dirname, "../gaokao_vocab_for_import.txt");
  const browserScriptFile = path.resolve(
    __dirname,
    "../gaokao_vocab_browser_import.js"
  );

  console.log("解析词汇文件...");
  const entries = parseVocabFile(vocabFile);
  console.log(`找到 ${entries.length} 个词汇`);

  // 使用特殊分隔符
  const CARD_SEPARATOR = "\n---CARD---\n";
  const QA_SEPARATOR = "\n---QA---\n";

  const cards = [];

  for (const entry of entries) {
    const front = generateFront(entry);
    const back = generateBack(entry);
    cards.push(front + QA_SEPARATOR + back);
  }

  const output = cards.join(CARD_SEPARATOR);
  fs.writeFileSync(outputFile, output, "utf-8");

  console.log(`\n✅ 导入文件已生成: ${outputFile}`);
  console.log(`共 ${entries.length} 张卡片`);
  console.log("\n导入说明：");
  console.log('1. 在 Akasha 中创建或选择"英语"卡组');
  console.log("2. 进入设置 -> 导入/导出");
  console.log("3. 选择生成的文件");
  console.log("4. 卡片分隔符输入: ---CARD---");
  console.log("5. 正反面分隔符输入: ---QA---");
  console.log("6. 点击导入");

  // 生成浏览器控制台脚本
  const browserScript = generateBrowserConsoleScript(entries);
  fs.writeFileSync(browserScriptFile, browserScript, "utf-8");
  console.log(`\n🌐 浏览器控制台脚本已生成: ${browserScriptFile}`);
}

// 生成浏览器控制台脚本
function generateBrowserConsoleScript(entries) {
  const entriesJson = JSON.stringify(entries, null, 2);

  return `// 高考词汇导入脚本 - 浏览器控制台版本
// 使用方法：在 Akasha 应用控制台中粘贴并运行（约需2-3分钟）

(async function() {
  console.log('=== 高考词汇导入工具 ===');
  console.log('共 ${entries.length} 个词汇待导入');
  
  // 等待 fsrs.js 加载
  while (typeof fsrs === 'undefined' || !fsrs.Card) {
    console.log('等待 fsrs.js 加载...');
    await new Promise(r => setTimeout(r, 500));
  }
  
  // 获取或创建英语卡组
  let englishDeck = await db.decks.where('name').equals('英语').first();
  
  if (!englishDeck) {
    console.log('未找到"英语"卡组，正在创建...');
    const deckId = crypto.randomUUID();
    englishDeck = {
      id: deckId,
      name: '英语',
      subDecks: [],
      superDecks: [],
      cards: [],
      notes: [],
      options: { newToReviewRatio: 0.2, dailyNewCards: 20 },
    };
    await db.decks.add(englishDeck);
    console.log('已创建"英语"卡组，ID:', deckId);
  } else {
    console.log('找到"英语"卡组，ID:', englishDeck.id);
  }
  
  const entries = ${entriesJson};
  
  function generateFront(entry) {
    const lines = [entry.word];
    const hasExtras = Object.keys(entry.examples).length > 0 || Object.keys(entry.phrases).length > 0;
    if (hasExtras) {
      lines.push('{{');
      for (const en of Object.keys(entry.examples)) lines.push(en);
      for (const phrase of Object.keys(entry.phrases)) lines.push(phrase);
      lines.push('}}');
    }
    return lines.join('\\n');
  }
  
  function generateBack(entry) {
    const lines = [];
    for (const [pos, def] of Object.entries(entry.definitions)) lines.push(pos + ' ' + def);
    for (const [, cn] of Object.entries(entry.examples)) lines.push(cn);
    for (const [, meaning] of Object.entries(entry.phrases)) lines.push(meaning);
    if (entry.extension && entry.extension !== '无') lines.push(entry.extension);
    return lines.join('\\n');
  }
  
  let imported = 0;
  const batchSize = 50;
  
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    
    await db.transaction('rw', db.notes, db.cards, db.decks, async () => {
      for (const entry of batch) {
        const noteId = crypto.randomUUID();
        const front = generateFront(entry);
        const back = generateBack(entry);
        
        await db.notes.add({
          id: noteId,
          deck: englishDeck.id,
          creationDate: new Date(),
          content: { type: 'normal', front, back },
          sortField: entry.word.replace(/\\*\\*/g, '').trim(),
        });
        englishDeck.notes.push(noteId);
        
        const cardId = crypto.randomUUID();
        await db.cards.add({
          id: cardId,
          note: noteId,
          deck: englishDeck.id,
          content: { type: 'normal' },
          history: [],
          model: new fsrs.Card(),
          creationDate: new Date(),
        });
        englishDeck.cards.push(cardId);
      }
      
      await db.decks.update(englishDeck.id, {
        notes: englishDeck.notes,
        cards: englishDeck.cards,
      });
    });
    
    imported += batch.length;
    const percent = Math.round((imported / entries.length) * 100);
    console.log(\`已导入 \${imported}/\${entries.length} (\${percent}%)\`);
  }
  
  console.log('\\n✅ 导入完成！共导入', entries.length, '个词汇');
  console.log('请刷新页面查看导入的卡片');
})();
`;
}

main();
