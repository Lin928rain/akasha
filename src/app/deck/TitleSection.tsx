import { genericFail } from "@/components/Notification/Notification";
import { renameDeck } from "@/logic/deck/renameDeck";
import { Button, Group, Kbd, TextInput, Title, Tooltip } from "@mantine/core";
import { getHotkeyHandler } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { DeckSummary } from "../../logic/deck/deck";

type TitleSectionProps = {
  deck: DeckSummary | undefined;
};

export default function TitleSection({ deck }: TitleSectionProps) {
  const [t] = useTranslation();
  const navigate = useNavigate();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState<string>("");

  useEffect(() => {
    if (deck) setNewTitle(deck?.name);
  }, [deck]);

  useEffect(() => {
    if (!isEditingTitle && newTitle !== "" && deck) {
      renameDeck(deck.id, newTitle).catch(() => {
        genericFail();
      });
    }
  }, [isEditingTitle]);

  return (
    <Group justify="space-between" align="center" w="100%">
      {!isEditingTitle ? (
        <Title
          order={3}
          lineClamp={1}
          onDoubleClick={() => setIsEditingTitle(true)}
        >
          {deck?.name}
        </Title>
      ) : (
        <TextInput
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.currentTarget.value)}
          onKeyDown={getHotkeyHandler([
            ["Enter", () => setIsEditingTitle(false)],
            [
              "Escape",
              () => {
                setNewTitle(deck?.name || "");
                setIsEditingTitle(false);
              },
            ],
          ])}
          onBlur={() => setIsEditingTitle(false)}
          autoFocus
        />
      )}
      <Tooltip
        label={
          <>
            {t("deck.add-cards-tooltip")}
            <Kbd>n</Kbd>
          </>
        }
      >
        <Button
          leftSection={<IconPlus />}
          variant="default"
          onClick={() => navigate("/new/" + deck?.id)}
        >
          {t("deck.add-cards")}
        </Button>
      </Tooltip>
    </Group>
  );
}
