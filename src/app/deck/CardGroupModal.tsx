import { getAdapter } from "@/logic/NoteTypeAdapter";
import { db } from "@/logic/db";
import type { CardGroup } from "@/logic/deck/deck";
import type { NoteType } from "@/logic/note/note";
import { Note } from "@/logic/note/note";
import {
  Badge,
  Button,
  Group,
  Modal,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconCheck, IconSearch } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Card } from "../../logic/card/card";
import classes from "./CardGroupModal.module.css";

interface CardGroupModalProps {
  opened: boolean;
  setOpened: (opened: boolean) => void;
  deckId: string;
  cardIds: string[];
  group: CardGroup | null;
  onSave: (group: CardGroup) => Promise<void>;
}

function generateGroupId(): string {
  return `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface CardWithNote {
  card: Card<NoteType>;
  note?: Note<NoteType>;
  sortField: string;
}

function CardGroupModal({
  opened,
  setOpened,
  deckId,
  cardIds,
  group,
  onSave,
}: CardGroupModalProps) {
  const [t] = useTranslation();
  const [groupName, setGroupName] = useState("");
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(
    new Set()
  );
  const [cardsWithNotes, setCardsWithNotes] = useState<CardWithNote[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch] = useDebouncedValue(searchQuery, 300);

  // 拖动选择相关状态
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [dragEnd, setDragEnd] = useState<{ x: number; y: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (opened) {
      if (group) {
        setGroupName(group.name);
        setSelectedCardIds(new Set(group.cardIds));
      } else {
        setGroupName("");
        setSelectedCardIds(new Set());
      }

      // 加载卡组中的所有卡片及其对应的笔记
      const loadCardsWithNotes = async () => {
        const result: CardWithNote[] = [];

        for (let i = 0; i < cardIds.length; i += 200) {
          const chunk = cardIds.slice(i, i + 200);
          const cards = (await db.cards.bulkGet(chunk)).filter(
            (card): card is Card<NoteType> => card !== undefined
          );

          // 批量获取所有 note
          const noteIdsSet = new Set<string>();
          cards.forEach((card) => noteIdsSet.add(card.note));
          const noteIds = Array.from(noteIdsSet);
          const notes = new Map<string, Note<NoteType>>();

          for (let j = 0; j < noteIds.length; j += 100) {
            const noteChunk = noteIds.slice(j, j + 100);
            const fetchedNotes = (await db.notes.bulkGet(noteChunk)).filter(
              (note): note is Note<NoteType> => note !== undefined
            );
            fetchedNotes.forEach((note) => notes.set(note.id, note));
          }

          // 组合 card 和 note
          cards.forEach((card) => {
            const note = notes.get(card.note);
            const adapter = note ? getAdapter(note) : null;
            const sortField = note
              ? adapter?.getSortFieldFromNoteContent(note.content) ||
                `卡片 #${card.id.slice(0, 8)}`
              : `卡片 #${card.id.slice(0, 8)}`;

            result.push({
              card,
              note,
              sortField,
            });
          });
        }

        setCardsWithNotes(result);
      };

      void loadCardsWithNotes();
    }
  }, [opened, group, cardIds]);

  const filteredCards = cardsWithNotes.filter((item) => {
    if (!debouncedSearch) return true;
    const searchLower = debouncedSearch.toLowerCase();
    return item.sortField.toLowerCase().includes(searchLower);
  });

  const handleToggleCard = (cardId: string) => {
    setSelectedCardIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedCardIds.size === filteredCards.length) {
      // 取消全选
      const cardIdsToRemove = new Set(filteredCards.map((c) => c.card.id));
      setSelectedCardIds((prev) => {
        const newSet = new Set(prev);
        cardIdsToRemove.forEach((id) => newSet.delete(id));
        return newSet;
      });
    } else {
      // 全选
      setSelectedCardIds((prev) => {
        const newSet = new Set(prev);
        filteredCards.forEach((item) => newSet.add(item.card.id));
        return newSet;
      });
    }
  };

  const handleSave = async () => {
    if (!groupName.trim()) return;

    const groupData: CardGroup = {
      id: group?.id || generateGroupId(),
      name: groupName.trim(),
      cardIds: Array.from(selectedCardIds),
      order: group?.order,
      createdAt: group?.createdAt,
    };

    await onSave(groupData);
    setOpened(false);
  };

  // 拖动选择相关处理
  const getGridOffset = () => {
    if (!gridRef.current) return { x: 0, y: 0 };
    const rect = gridRef.current.getBoundingClientRect();
    const scrollArea = gridRef.current.closest("[data-scroll-area]");
    return {
      x: rect.left + (scrollArea?.scrollLeft || 0),
      y: rect.top + (scrollArea?.scrollTop || 0),
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // 只在非卡片区域按下时才启动拖动选择
    if ((e.target as HTMLElement).closest(`.${classes.cardItem}`)) return;

    setIsDragging(true);
    const offset = getGridOffset();
    setDragStart({
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
    });
    setDragEnd({
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return;
    const offset = getGridOffset();
    setDragEnd({
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
    });
  };

  const handleMouseUp = () => {
    if (!isDragging || !dragStart || !dragEnd || !gridRef.current) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    // 计算选择矩形
    const left = Math.min(dragStart.x, dragEnd.x);
    const right = Math.max(dragStart.x, dragEnd.x);
    const top = Math.min(dragStart.y, dragEnd.y);
    const bottom = Math.max(dragStart.y, dragEnd.y);

    // 如果拖动距离太小，视为点击
    if (right - left < 5 && bottom - top < 5) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    // 找出所有在选择矩形内的卡片
    const cardElements = gridRef.current.querySelectorAll(
      `.${classes.cardItem}`
    );
    const newlySelectedIds = new Set<string>();

    cardElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const gridRect = gridRef.current!.getBoundingClientRect();

      const cardLeft = rect.left - gridRect.left;
      const cardRight = cardLeft + rect.width;
      const cardTop = rect.top - gridRect.top;
      const cardBottom = cardTop + rect.height;

      // 检查卡片是否在选择矩形内（部分重叠就算）
      const isOverlapping = !(
        cardRight < left ||
        cardLeft > right ||
        cardBottom < top ||
        cardTop > bottom
      );

      if (isOverlapping) {
        const cardId = el.getAttribute("data-card-id");
        if (cardId) {
          newlySelectedIds.add(cardId);
        }
      }
    });

    // 添加选中的卡片
    setSelectedCardIds((prev) => {
      const newSet = new Set(prev);
      newlySelectedIds.forEach((id) => newSet.add(id));
      return newSet;
    });

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const isAllSelected =
    filteredCards.length > 0 &&
    filteredCards.every((item) => selectedCardIds.has(item.card.id));

  return (
    <Modal
      opened={opened}
      onClose={() => setOpened(false)}
      title={group ? t("deck.group.edit-title") : t("deck.group.create-title")}
      size="100%"
      centered
      closeOnClickOutside={false}
      fullScreen
      classNames={{ body: classes.modalBody }}
    >
      <Stack
        gap="md"
        style={{ height: "80vh", display: "flex", flexDirection: "column" }}
      >
        {/* 头部：分组名称和搜索 */}
        <Group gap="md" wrap="nowrap">
          <TextInput
            label={t("deck.group.name-label")}
            placeholder={t("deck.group.name-placeholder")}
            value={groupName}
            onChange={(e) => setGroupName(e.currentTarget.value)}
            style={{ flex: "0 0 300px" }}
          />
          <TextInput
            placeholder={t("deck.group.search-placeholder")}
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Button
            variant={isAllSelected ? "filled" : "outline"}
            size="lg"
            onClick={handleSelectAll}
            style={{ marginTop: "1.8rem" }}
          >
            {isAllSelected
              ? t("deck.group.deselect-all")
              : t("deck.group.select-all")}
          </Button>
        </Group>

        {/* 统计信息和使用说明 */}
        <Group gap="xs" justify="space-between">
          <Group gap="xs">
            <Text size="sm" c="dimmed">
              {t("deck.group.selected-count", { count: selectedCardIds.size })}{" "}
              / {filteredCards.length} / {cardsWithNotes.length}
            </Text>
            {selectedCardIds.size > 0 && (
              <Badge color="green" variant="light" size="lg">
                <IconCheck size={14} style={{ marginRight: 4 }} />
                已选择 {selectedCardIds.size} 张
              </Badge>
            )}
          </Group>
          <Text size="xs" c="blue">
            💡 提示：拖动鼠标框选多张卡片，或点击单个卡片选择
          </Text>
        </Group>

        {/* 卡片网格 */}
        <ScrollArea.Autosize mah={550} style={{ flex: 1 }} scrollbars="y">
          {filteredCards.length === 0 ? (
            <Text c="dimmed" size="sm" ta="center" py="xl">
              {t("deck.group.no-cards")}
            </Text>
          ) : (
            <div
              ref={gridRef}
              className={classes.cardGrid}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {filteredCards.map((item) => {
                const isSelected = selectedCardIds.has(item.card.id);

                return (
                  <div
                    key={item.card.id}
                    data-card-id={item.card.id}
                    className={`${classes.cardItem} ${isSelected ? classes.selected : ""}`}
                    onClick={() => handleToggleCard(item.card.id)}
                  >
                    <div className={classes.cardContent}>
                      <Text
                        size="sm"
                        fw={500}
                        lineClamp={3}
                        style={{ wordBreak: "break-word" }}
                      >
                        {item.sortField}
                      </Text>
                    </div>
                    <ThemeIcon
                      className={classes.checkIndicator}
                      color="green"
                      radius="xl"
                      size="md"
                      variant="filled"
                    >
                      <IconCheck size={14} />
                    </ThemeIcon>
                  </div>
                );
              })}

              {/* 拖动选择框 */}
              {isDragging && dragStart && dragEnd && (
                <div
                  className={classes.dragSelection}
                  style={{
                    left: Math.min(dragStart.x, dragEnd.x),
                    top: Math.min(dragStart.y, dragEnd.y),
                    width: Math.abs(dragEnd.x - dragStart.x),
                    height: Math.abs(dragEnd.y - dragStart.y),
                  }}
                />
              )}
            </div>
          )}
        </ScrollArea.Autosize>

        {/* 底部按钮 */}
        <Group justify="flex-end" gap="md">
          <Button variant="default" size="lg" onClick={() => setOpened(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            size="lg"
            onClick={handleSave}
            disabled={!groupName.trim() || selectedCardIds.size === 0}
          >
            {t("common.save")}
            {selectedCardIds.size > 0 && ` (${selectedCardIds.size} 张卡片)`}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default CardGroupModal;
