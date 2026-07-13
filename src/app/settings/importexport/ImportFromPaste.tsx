import { getDeck } from "@/logic/deck/getDeck";
import { Stack, TextInput, Textarea } from "@mantine/core";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ImportButton from "./ImportButton";
import { ImportFromSourceProps } from "./ImportModal";
import { importCards } from "./importLogic";

interface ImportFromPasteProps extends ImportFromSourceProps {}

export default function ImportFromPaste({
  importStatus,
  setImportStatus,
  deck,
}: ImportFromPasteProps) {
  const [t] = useTranslation();
  const [pastedText, setPastedText] = useState<string>("");
  const [cardSeparator] = useState<string>("\n");
  const [questionAnswerSeperator, setQuestionAnswerSeperator] =
    useState<string>("\t");

  // Clear textarea after successful import
  useEffect(() => {
    if (importStatus === "success") {
      setPastedText("");
    }
  }, [importStatus]);

  return (
    <Stack align="start">
      <Textarea
        label={t("import-export.paste-label")}
        placeholder={t("import-export.paste-placeholder")}
        value={pastedText}
        onChange={(e) => setPastedText(e.currentTarget.value)}
        minRows={8}
        autosize
        style={{ width: "100%" }}
      />
      <TextInput
        label={t("import-export.separator-label")}
        value={questionAnswerSeperator}
        onChange={(e) => setQuestionAnswerSeperator(e.currentTarget.value)}
        description={t("import-export.separator-description")}
      />
      <ImportButton
        importFunction={async () => {
          const fullDeck = deck ? await getDeck(deck.id) : undefined;
          await importCards(
            pastedText,
            fullDeck,
            cardSeparator,
            questionAnswerSeperator
          );
        }}
        importStatus={importStatus}
        setImportStatus={setImportStatus}
        disabled={!pastedText.trim() || !deck}
      />
    </Stack>
  );
}
