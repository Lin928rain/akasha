import { Alert, Button, Select, Stack, Text } from "@mantine/core";
import { IconChevronRight, IconInfoCircle } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DeckSummary } from "../../../logic/deck/deck";
import FileImport from "./FileImport";
import ImportButton from "./ImportButton";
import { ImportFromSourceProps, ImportStatus } from "./ImportModal";

interface ImportFromJSONProps extends ImportFromSourceProps {}
export default function ImportFromJSON({
  file,
  setFile,
  fileText,
  setFileText,
  importStatus,
  setImportStatus,
  deck,
}: ImportFromJSONProps) {
  const [t] = useTranslation();
  const [step, setStep] = useState<"selectFile" | "options">("selectFile");
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(
    null
  );
  return (
    <Stack align="start">
      {step === "selectFile" || !file ? (
        <>
          <Alert color="gray" icon={<IconInfoCircle />}>
            {t("import-export.json-import-info")}
          </Alert>

          <FileImport
            file={file}
            setFile={setFile}
            setFileText={setFileText}
            acceptedFormats={".json"}
          />
          <Button
            rightSection={<IconChevronRight />}
            onClick={async () => {
              let ed: ExtractedData | null = null;
              try {
                ed = await parseFile(fileText);
              } catch {
                setImportStatus("error");
                return;
              } finally {
                if (ed) {
                  setExtractedData(ed);
                  setStep("options");
                  setImportStatus("passive");
                } else {
                  setImportStatus("error");
                }
              }
            }}
            style={{ alignSelf: "end" }}
            disabled={!file}
          >
            {t("import-export.parse-and-continue")}
          </Button>
        </>
      ) : (
        <ImportOptions
          extractedData={extractedData}
          importStatus={importStatus}
          setImportStatus={setImportStatus}
          deck={deck}
        />
      )}
    </Stack>
  );
}

interface ExtractedData {
  description: string;
  name: string;
  fields: { label: string; value: string }[];
  cards: { fields: string[] }[];
  warnMessages: string[];
}

async function parseFile(fileText: string | null): Promise<ExtractedData> {
  if (!fileText) {
    throw new Error("This file has no contents.");
  }
  const jsonObject = JSON.parse(fileText);
  const warnMessages: string[] = [];
  if (jsonObject.__type__ !== "Deck") {
    throw new Error("At the moment only decks can be imported from JSON");
  }
  const noteModels = jsonObject.note_models;
  if (!noteModels || noteModels.length === 0) {
    throw new Error("No note models found");
  } else if (noteModels.length > 1) {
    warnMessages.push(
      "Multiple note models found, only cards of the first one will be used"
    );
  }
  const firstNoteModel = noteModels[0];
  const cards = jsonObject.notes.map((note: any) => {
    return {
      fields: note.fields,
    };
  });
  return {
    description: jsonObject.desc,
    name: jsonObject.name,
    fields: firstNoteModel.flds.map((field: any) => ({
      label: field.name,
      value: field.ord.toString(),
    })),
    cards,
    warnMessages,
  };
}

function ImportOptions({
  extractedData,
  importStatus,
  setImportStatus,
  //deck,
}: {
  extractedData: ExtractedData | null;
  importStatus: ImportStatus;
  setImportStatus: (status: ImportStatus) => void;
  deck?: DeckSummary;
}) {
  const [t] = useTranslation();
  const [frontField, setFrontField] = useState<string | null>(null);
  const [backField, setBackField] = useState<string | null>(null);
  console.log(extractedData?.fields);
  if (!extractedData) {
    return null;
  }
  return (
    <Stack align="start">
      <Text fz="sm">
        {t("import-export.deck-name")}: {extractedData.name}
      </Text>
      <Text fz="sm">
        {t("import-export.deck-description")}: {extractedData.description}
      </Text>
      <Text fz="sm">
        {t("import-export.card-number")}: {extractedData.cards.length}
      </Text>
      <Select
        label={t("import-export.front")}
        data={extractedData.fields}
        value={frontField}
        onChange={(value) => setFrontField(value)}
      ></Select>
      <Select
        label={t("import-export.back")}
        data={extractedData.fields}
        value={backField}
        onChange={(value) => setBackField(value)}
      ></Select>
      <ImportButton
        importFunction={async () => console.log("not supported right now")}
        importStatus={importStatus}
        setImportStatus={setImportStatus}
        disabled={!frontField || !backField}
      />
    </Stack>
  );
}
