import { getApiPrefix } from "./api";
import { getAccessToken } from "./auth";

export type ImportJob = {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  stage: string;
  message: string;
  error: string | null;
  totalItems: number;
  processedItems: number;
};

type UploadResponse = {
  jobId: string;
};

export async function startImportJobWithFile(
  file: File,
  onProgress: (progress: number) => void
): Promise<string> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error("Authentication required.");
  }
  const payload = await file.text();
  const url = `${getApiPrefix()}/import/jobs`;

  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("Content-Type", "text/plain;charset=UTF-8");

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }
      const progress = Math.min(
        100,
        Math.round((event.loaded / event.total) * 100)
      );
      onProgress(progress);
    };

    xhr.onerror = () => {
      reject(new Error("Failed to upload import file."));
    };

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        try {
          const payloadObj = JSON.parse(xhr.responseText) as { error?: string };
          reject(
            new Error(payloadObj.error || `Upload failed (${xhr.status}).`)
          );
          return;
        } catch {
          reject(new Error(`Upload failed (${xhr.status}).`));
          return;
        }
      }
      try {
        const body = JSON.parse(xhr.responseText) as UploadResponse;
        if (!body?.jobId) {
          reject(new Error("Invalid import job response."));
          return;
        }
        onProgress(100);
        resolve(body.jobId);
      } catch {
        reject(new Error("Invalid import job response."));
      }
    };

    xhr.send(payload);
  });
}

export async function getImportJob(jobId: string): Promise<ImportJob> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error("Authentication required.");
  }
  const response = await fetch(`${getApiPrefix()}/import/jobs/${jobId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const body = (await response.json()) as { job?: ImportJob; error?: string };
  if (!response.ok) {
    throw new Error(
      body.error || `Failed to get import job (${response.status}).`
    );
  }
  if (!body.job) {
    throw new Error("Import job response is invalid.");
  }
  return body.job;
}
