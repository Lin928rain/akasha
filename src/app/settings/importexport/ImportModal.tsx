import { Modal, Tabs } from "@mantine/core";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import ModalProps from "../../../components/ModalProps";
import { DeckSummary } from "../../../logic/deck/deck";

import { IconClipboardText, IconJson, IconTxt } from "@tabler/icons-react";
import ImportFromJSON from "./ImportFromJSON";
import ImportFromPaste from "./ImportFromPaste";
import ImportFromPlainText from "./ImportFromPlainText";

interface ImportModalProps extends ModalProps {
  deck?: DeckSummary;
}

export interface ImportFromSourceProps {
  file: File | null;
  setFile: (file: File | null) => void;
  fileText: string | null;
  setFileText: (fileText: string | null) => void;
  importStatus: ImportStatus;
  setImportStatus: (status: ImportStatus) => void;
  deck?: DeckSummary;
}

export type ImportStatus = "passive" | "importing" | "success" | "error";

export default function ImportModal({
  opened,
  setOpened,
  deck,
}: ImportModalProps) {
  const [t] = useTranslation();
  const [tab, setTab] = useState("cardsfrompaste");
  const [file, setFile] = useState<File | null>(null);
  const [fileText, setFileText] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<ImportStatus>("passive");

  return (
    <Modal
      opened={opened}
      onClose={() => {
        setOpened(false);
        setFile(null);
        setFileText(null);
      }}
      title={t("import-export.import.title")}
    >
      {(importStatus === "passive" || importStatus === "importing") && (
        <Tabs
          orientation="horizontal"
          defaultValue="General"
          variant="pills"
          value={tab}
        >
          <Tabs.List>
            <Tabs.Tab
              value="cardsfrompaste"
              leftSection={<IconClipboardText />}
              onClick={() => setTab("cardsfrompaste")}
            >
              {t("import-export.import.from-paste")}
            </Tabs.Tab>
            <Tabs.Tab
              value="cardsfromplaintext"
              leftSection={<IconTxt />}
              onClick={() => setTab("cardsfromplaintext")}
            >
              {t("import-export.import.from-plain-text")}
            </Tabs.Tab>
            <Tabs.Tab
              value="deckfromjson"
              leftSection={<IconJson />}
              onClick={() => setTab("deckfromjson")}
            >
              {t("import-export.import.from-json")}
            </Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="cardsfrompaste">
            <ImportFromPaste
              file={file}
              setFile={setFile}
              fileText={fileText}
              setFileText={setFileText}
              deck={deck}
              importStatus={importStatus}
              setImportStatus={setImportStatus}
            />
          </Tabs.Panel>
          <Tabs.Panel value="cardsfromplaintext">
            <ImportFromPlainText
              file={file}
              setFile={setFile}
              fileText={fileText}
              setFileText={setFileText}
              deck={deck}
              importStatus={importStatus}
              setImportStatus={setImportStatus}
            />
          </Tabs.Panel>
          <Tabs.Panel value="deckfromjson">
            <ImportFromJSON
              file={file}
              setFile={setFile}
              fileText={fileText}
              setFileText={setFileText}
              deck={deck}
              importStatus={importStatus}
              setImportStatus={setImportStatus}
            />
          </Tabs.Panel>
        </Tabs>
      )}
      {importStatus !== "passive" && importStatus}
    </Modal>
  );
}
