import { Button, Card, FileButton, Group, Text } from "@mantine/core";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";

interface FileImportProps {
  file: File | null;
  setFile: Function;
  setFileText: Function;
  acceptedFormats: string;
}
function readFile(file: File, setFileText: Function) {
  if (!file) {
    return;
  }
  const reader = new FileReader();
  reader.onload = (event) => {
    if (event.target) {
      setFileText(event.target.result as string);
    }
  };
  reader.readAsText(file);
}
export default function FileImport({
  file,
  setFile,
  setFileText,
  acceptedFormats,
}: FileImportProps) {
  const [t] = useTranslation();
  useEffect(() => {
    file && readFile(file, setFileText);
  }, [file]);

  return (
    <Card
      withBorder
      shadow="xs"
      w="100%"
      style={{ display: "flex", placeContent: "center" }}
    >
      {!file ? (
        <FileButton
          onChange={(f) => {
            setFile(f);
          }}
          accept={acceptedFormats}
        >
          {(props) => (
            <Button {...props}>{t("import-export.choose-file")}</Button>
          )}
        </FileButton>
      ) : (
        <Group justify="space-between" align="center" w="100%">
          <Text fz="sm" fw={500}>
            {file.name}
          </Text>{" "}
          <Button variant="default" onClick={() => setFile(null)}>
            {t("import-export.remove-file")}
          </Button>
        </Group>
      )}
    </Card>
  );
}
