import ModalProps from "@/components/ModalProps";
import { db } from "@/logic/db";
import type { CardGroup, DeckSummary } from "@/logic/deck/deck";
import {
  ActionIcon,
  Button,
  Group,
  Modal,
  Stack,
  Switch,
  Text,
  Title,
} from "@mantine/core";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import CardGroupModal from "./CardGroupModal";

interface DeckOptionsModalProps extends ModalProps {
  deck: DeckSummary;
}

function DeckOptionsModal({ opened, setOpened, deck }: DeckOptionsModalProps) {
  const [t] = useTranslation();
  const [autoReadOnCard, setAutoReadOnCard] = useState<boolean>(
    deck.options?.autoReadOnCard ?? false
  );
  const [autoSentence, setAutoSentence] = useState<boolean>(
    deck.options?.autoSentence ?? false
  );
  const [shuffleCards, setShuffleCards] = useState<boolean>(
    deck.options?.shuffleCards ?? false
  );
  const [enableCardBatching, setEnableCardBatching] = useState<boolean>(
    deck.options?.enableCardBatching ?? false
  );
  const [cardGroups, setCardGroups] = useState<CardGroup[]>(
    deck.options?.cardGroups ?? []
  );
  const [groupLearningRespectLimits, setGroupLearningRespectLimits] =
    useState<boolean>(deck.options?.groupLearningRespectLimits ?? false);
  const [deckCardIds, setDeckCardIds] = useState<string[]>([]);

  const [groupModalOpened, setGroupModalOpened] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CardGroup | null>(null);

  useEffect(() => {
    setAutoReadOnCard(deck.options?.autoReadOnCard ?? false);
    setAutoSentence(deck.options?.autoSentence ?? false);
    setShuffleCards(deck.options?.shuffleCards ?? false);
    setEnableCardBatching(deck.options?.enableCardBatching ?? false);
    setCardGroups(deck.options?.cardGroups ?? []);
    setGroupLearningRespectLimits(
      deck.options?.groupLearningRespectLimits ?? false
    );

    // 加载卡组卡片 ID
    const loadDeckCards = async () => {
      const fullDeck = await db.decks.get(deck.id);
      if (fullDeck) {
        setDeckCardIds(fullDeck.cards || []);
      }
    };
    void loadDeckCards();
  }, [deck.id]);

  const updateAutoRead = async (value: boolean) => {
    setAutoReadOnCard(value);
    await db.decks.update(deck.id, {
      options: {
        ...deck.options,
        autoReadOnCard: value,
      },
    });
  };

  const updateAutoSentence = async (value: boolean) => {
    setAutoSentence(value);
    await db.decks.update(deck.id, {
      options: {
        ...deck.options,
        autoSentence: value,
      },
    });
  };

  const updateShuffleCards = async (value: boolean) => {
    setShuffleCards(value);
    await db.decks.update(deck.id, {
      options: {
        ...deck.options,
        shuffleCards: value,
      },
    });
  };

  const updateCardBatching = async (value: boolean) => {
    setEnableCardBatching(value);
    await db.decks.update(deck.id, {
      options: {
        ...deck.options,
        enableCardBatching: value,
      },
    });
  };

  const updateGroupLearningRespectLimits = async (value: boolean) => {
    setGroupLearningRespectLimits(value);
    await db.decks.update(deck.id, {
      options: {
        ...deck.options,
        groupLearningRespectLimits: value,
      },
    });
  };

  const updateCardGroups = async (groups: CardGroup[]) => {
    setCardGroups(groups);
    await db.decks.update(deck.id, {
      options: {
        ...deck.options,
        cardGroups: groups,
      },
    });
  };

  const handleCreateGroup = () => {
    setEditingGroup(null);
    setGroupModalOpened(true);
  };

  const handleEditGroup = (group: CardGroup) => {
    setEditingGroup(group);
    setGroupModalOpened(true);
  };

  const handleDeleteGroup = async (groupId: string) => {
    const newGroups = cardGroups.filter((g) => g.id !== groupId);
    await updateCardGroups(newGroups);
  };

  const handleSaveGroup = async (group: CardGroup) => {
    let newGroups: CardGroup[];
    const existingIndex = cardGroups.findIndex((g) => g.id === group.id);

    if (existingIndex >= 0) {
      // 编辑现有分组
      newGroups = [...cardGroups];
      newGroups[existingIndex] = group;
    } else {
      // 创建新分组
      newGroups = [
        ...cardGroups,
        {
          ...group,
          createdAt: new Date(),
        },
      ];
    }

    await updateCardGroups(newGroups);
  };

  return (
    <>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={t("deck.menu.options")}
      >
        <Stack gap="xs">
          <Switch
            checked={autoReadOnCard}
            label={t("deck.options.auto-read-label")}
            description={t("deck.options.auto-read-description")}
            onChange={(event) => updateAutoRead(event.currentTarget.checked)}
          />
          <Text c="dimmed" size="xs">
            {t("deck.options.auto-read-note")}
          </Text>

          <Switch
            checked={autoSentence}
            label={t("deck.options.auto-sentence-label")}
            description={t("deck.options.auto-sentence-description")}
            onChange={(event) =>
              updateAutoSentence(event.currentTarget.checked)
            }
          />

          <Switch
            checked={shuffleCards}
            label="随机顺序学习"
            description="启用后，卡片将以随机顺序显示，而不是按创建时间排序"
            onChange={(event) =>
              updateShuffleCards(event.currentTarget.checked)
            }
          />

          <Switch
            checked={enableCardBatching}
            label={t("deck.options.enable-batching-label")}
            description={t("deck.options.enable-batching-description")}
            onChange={(event) =>
              updateCardBatching(event.currentTarget.checked)
            }
          />

          {enableCardBatching && (
            <>
              <Switch
                checked={groupLearningRespectLimits}
                label={t("deck.options.group-learning-respect-limits-label")}
                description={t(
                  "deck.options.group-learning-respect-limits-description"
                )}
                onChange={(event) =>
                  updateGroupLearningRespectLimits(event.currentTarget.checked)
                }
              />
              <Stack gap="xs" mt="sm">
                <Group justify="space-between">
                  <Title order={6}>{t("deck.options.card-groups-title")}</Title>
                  <Button size="xs" onClick={handleCreateGroup}>
                    {t("deck.options.create-group")}
                  </Button>
                </Group>

                {cardGroups.length === 0 ? (
                  <Text c="dimmed" size="sm" ta="center">
                    {t("deck.options.no-groups")}
                  </Text>
                ) : (
                  <Stack gap="xs">
                    {cardGroups.map((group) => (
                      <Group
                        key={group.id}
                        justify="space-between"
                        p="xs"
                        bg="gray.0"
                        wrap="nowrap"
                      >
                        <Stack gap={2} style={{ flex: 1 }} miw={0}>
                          <Text fw={500} truncate>
                            {group.name}
                          </Text>
                          <Text c="dimmed" size="xs" truncate>
                            {t("deck.options.group-card-count", {
                              count: group.cardIds.length,
                            })}
                          </Text>
                        </Stack>
                        <Group gap="xs" wrap="nowrap">
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            onClick={() => handleEditGroup(group)}
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="red"
                            onClick={() => handleDeleteGroup(group.id)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Group>
                    ))}
                  </Stack>
                )}
              </Stack>
            </>
          )}
        </Stack>
      </Modal>

      <CardGroupModal
        opened={groupModalOpened}
        setOpened={setGroupModalOpened}
        deckId={deck.id}
        cardIds={deckCardIds}
        group={editingGroup}
        onSave={handleSaveGroup}
      />
    </>
  );
}

export default DeckOptionsModal;
