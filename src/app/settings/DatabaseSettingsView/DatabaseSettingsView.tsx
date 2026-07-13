import DangerousConfirmModal from "@/components/DangerousConfirmModal";
import { getImportJob, startImportJobWithFile } from "@/logic/importJob";
import {
  Button,
  Card,
  FileButton,
  Progress,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconDatabaseExport,
  IconDatabaseImport,
  IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { db, exportDatabase, serializeDatabaseExport } from "../../../logic/db";
import classes from "./DatabaseSettingsView.module.css";
import StorageSection from "./StorageSection";

export default function DatabaseSettingsView() {
  const [t] = useTranslation();
  const navigate = useNavigate();
  const [deleteAllDataModalOpened, setDeleteAllDataModalOpened] =
    useState<boolean>(false);
  const [importing, setImporting] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [importStatusText, setImportStatusText] = useState<string>("");

  function notifyImportFailed(reason?: string): void {
    notifications.show({
      title: t("notification.error"),
      message: reason || t("notification.generic-fail"),
      color: "red",
    });
  }

  function notifyImportSuccess(total: number): void {
    notifications.show({
      title: t("notification.success"),
      message: `Imported ${total} records.`,
      color: "green",
    });
  }

  async function wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  async function handleImportFile(file: File): Promise<void> {
    setImporting(true);
    setUploadProgress(0);
    setImportProgress(0);
    setImportStatusText("Uploading file...");

    try {
      const jobId = await startImportJobWithFile(file, setUploadProgress);
      setImportStatusText("Import started...");

      while (true) {
        const job = await getImportJob(jobId);
        const percent =
          job.totalItems > 0
            ? Math.min(
                100,
                Math.round((job.processedItems / job.totalItems) * 100)
              )
            : 0;
        setImportProgress(percent);
        setImportStatusText(job.message || job.stage);

        if (job.status === "completed") {
          notifyImportSuccess(job.totalItems);
          break;
        }
        if (job.status === "failed") {
          throw new Error(job.error || "Import failed.");
        }
        await wait(1000);
      }
    } catch (error) {
      console.error(error);
      notifyImportFailed(
        error instanceof Error ? error.message : t("notification.generic-fail")
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <Stack gap="xl" align="start">
        <StorageSection />
        <Button
          leftSection={<IconDatabaseExport />}
          onClick={async () => {
            const now = new Date(Date.now());
            const exportData = await exportDatabase();
            const blob = new Blob([serializeDatabaseExport(exportData)], {
              type: "application/json",
            });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            const timestamp = now.toISOString().replace(/[:.]/g, "-");
            a.download = `akasha-export-${timestamp}.json`;
            a.click();
          }}
        >
          {t("database.export-all")}
        </Button>
        <Card withBorder className={classes.dangerZone}>
          <Stack gap="md" align="start">
            <Title order={6}>{t("database.danger-zone")}</Title>
            <Text size="sm">{t("database.danger-zone-description")}</Text>
            <FileButton
              onChange={(file) => {
                if (file) {
                  void handleImportFile(file);
                }
              }}
              accept=".json"
            >
              {(props) => (
                <Button
                  leftSection={<IconDatabaseImport />}
                  color="red"
                  loading={importing}
                  {...props}
                >
                  {t("database.import-database")}
                </Button>
              )}
            </FileButton>
            {importing ? (
              <Stack gap={6} w="100%">
                <Text size="sm">Upload {uploadProgress}%</Text>
                <Progress value={uploadProgress} />
                <Text size="sm">Import {importProgress}%</Text>
                <Progress value={importProgress} />
                <Text size="xs" c="dimmed">
                  {importStatusText}
                </Text>
              </Stack>
            ) : null}
            <Button
              leftSection={<IconTrash />}
              variant="filled"
              color="red"
              onClick={() => setDeleteAllDataModalOpened(true)}
            >
              {t("database.delete-all")}
            </Button>
          </Stack>
        </Card>
      </Stack>
      <DangerousConfirmModal
        dangerousAction={async () => {
          await db.delete();
          navigate("/home");
          window.location.reload();
        }}
        dangerousDependencies={[]}
        dangerousTitle={t("database.delete-all")}
        dangerousDescription={t("database.delete-all-warning")}
        opened={deleteAllDataModalOpened}
        setOpened={setDeleteAllDataModalOpened}
      />
    </>
  );
}
