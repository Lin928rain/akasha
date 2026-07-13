import { getDeck } from "@/logic/deck/getDeck";
import { Stack, TextInput } from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import FileImport from "./FileImport";
import ImportButton from "./ImportButton";
import { ImportFromSourceProps } from "./ImportModal";
import { importCards } from "./importLogic";

interface ImportFromPlainTextProps extends ImportFromSourceProps {}

export default function ImportFromPlainText({
  file,
  setFile,
  fileText,
  setFileText,
  importStatus,
  setImportStatus,
  deck,
}: ImportFromPlainTextProps) {
  const [t] = useTranslation();
  const [cardSeparator, setCardSeparator] = useState<string>("---CARD---");
  const [questionAnswerSeperator, setQuestionAnswerSeperator] =
    useState<string>("---QA---");
  return (
    <Stack align="start" w="100%">
      <FileImport
        file={file}
        setFile={setFile}
        setFileText={setFileText}
        acceptedFormats={".csv, .txt, .md"}
      />
      <TextInput
        label={t("import-export.card-separator-label", "卡片分隔符")}
        description={t(
          "import-export.card-separator-description",
          "用于分隔不同卡片的标记"
        )}
        value={cardSeparator}
        onChange={(e) => setCardSeparator(e.currentTarget.value)}
        w="100%"
      />
      <TextInput
        label={t("import-export.separator-label")}
        description={t(
          "import-export.qa-separator-description",
          "用于分隔正面和反面的标记"
        )}
        value={questionAnswerSeperator}
        onChange={(e) => setQuestionAnswerSeperator(e.currentTarget.value)}
        w="100%"
      />
      <ImportButton
        importFunction={async () => {
          const fullDeck = deck ? await getDeck(deck.id) : undefined;
          await importCards(
            fileText,
            fullDeck,
            cardSeparator,
            questionAnswerSeperator
          );
        }}
        importStatus={importStatus}
        setImportStatus={setImportStatus}
        disabled={!file || !fileText || !deck}
      />
    </Stack>
  );
}
