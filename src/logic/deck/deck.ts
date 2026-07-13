export interface Deck {
  id: string;
  name: string;
  userId?: string;
  subDecks: string[];
  superDecks?: string[];
  cards: Array<string>;
  notes: Array<string>;
  description?: string;
  options: DeckOptions;
}

export type DeckSummary = Pick<
  Deck,
  "id" | "name" | "subDecks" | "superDecks" | "description" | "options"
>;

export interface DeckOptions {
  newToReviewRatio: number;
  dailyNewCards: number;
  autoReadOnCard: boolean;
  autoSentence?: boolean; // 自动词汇造句开关
  shuffleCards?: boolean; // 随机顺序学习卡片
  // 分批学习配置
  enableCardBatching?: boolean; // 是否启用分批功能
  cardGroups?: CardGroup[]; // 卡片分组配置
  groupLearningRespectLimits?: boolean; // 分组学习是否受常规限制约束（默认 false）
}

export interface CardGroup {
  id: string; // 分组 ID
  name: string; // 分组名称
  cardIds: string[]; // 该分组包含的卡片 ID
  order?: number; // 分组顺序
  createdAt?: Date; // 创建时间
}
