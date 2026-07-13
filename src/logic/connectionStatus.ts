export type ConnectionLevel = "stable" | "fair" | "poor" | "offline";

export type ConnectionSnapshot = {
  online: boolean;
  level: ConnectionLevel;
  successRate: number;
  avgLatencyMs: number;
  avgRetries: number;
  sampleCount: number;
  updatedAt: number;
};

type RequestSample = {
  ok: boolean;
  latencyMs: number;
  retries: number;
};

const MAX_SAMPLES = 20;
const LATENCY_CAP_MS = 5000;
const EMIT_INTERVAL_MS = 1000;
const listeners = new Set<() => void>();
const samples: RequestSample[] = [];
let lastEmitAt = 0;
let pendingEmitTimeout: ReturnType<typeof setTimeout> | null = null;

let snapshot: ConnectionSnapshot = {
  online: typeof window === "undefined" ? true : window.navigator.onLine,
  level:
    typeof window === "undefined" || window.navigator.onLine
      ? "stable"
      : "offline",
  successRate: 1,
  avgLatencyMs: 0,
  avgRetries: 0,
  sampleCount: 0,
  updatedAt: Date.now(),
};

function emit(): void {
  lastEmitAt = Date.now();
  listeners.forEach((listener) => listener());
}

function emitThrottled(): void {
  const now = Date.now();
  const delay = Math.max(0, EMIT_INTERVAL_MS - (now - lastEmitAt));
  if (delay === 0) {
    emit();
    return;
  }
  if (pendingEmitTimeout !== null) {
    return;
  }
  pendingEmitTimeout = setTimeout(() => {
    pendingEmitTimeout = null;
    emit();
  }, delay);
}

function computeLevel(
  next: Omit<ConnectionSnapshot, "level">
): ConnectionLevel {
  if (!next.online) {
    return "offline";
  }
  if (next.sampleCount < 3) {
    return "stable";
  }
  if (
    next.successRate < 0.6 ||
    next.avgLatencyMs > 3000 ||
    next.avgRetries >= 2
  ) {
    return "poor";
  }
  if (
    next.successRate < 0.85 ||
    next.avgLatencyMs > 1500 ||
    next.avgRetries >= 1
  ) {
    return "fair";
  }
  return "stable";
}

function recomputeAndEmit(): void {
  const online =
    typeof window === "undefined" ? snapshot.online : window.navigator.onLine;

  const sampleCount = samples.length;
  const successSamples = samples.filter((sample) => sample.ok);
  const successCount = successSamples.length;
  const successRate = sampleCount === 0 ? 1 : successCount / sampleCount;
  const avgLatencyMs =
    successCount === 0
      ? snapshot.avgLatencyMs
      : successSamples.reduce((sum, sample) => sum + sample.latencyMs, 0) /
        successCount;
  const avgRetries =
    sampleCount === 0
      ? 0
      : samples.reduce((sum, sample) => sum + sample.retries, 0) / sampleCount;

  const base = {
    online,
    successRate,
    avgLatencyMs,
    avgRetries,
    sampleCount,
    updatedAt: Date.now(),
  };
  snapshot = {
    ...base,
    level: computeLevel(base),
  };
  emitThrottled();
}

export function recordRequestResult(sample: {
  ok: boolean;
  latencyMs: number;
  retries: number;
}): void {
  samples.push({
    ok: sample.ok,
    latencyMs: Math.min(sample.latencyMs, LATENCY_CAP_MS),
    retries: sample.retries,
  });
  if (samples.length > MAX_SAMPLES) {
    samples.splice(0, samples.length - MAX_SAMPLES);
  }
  recomputeAndEmit();
}

export function getConnectionSnapshot(): ConnectionSnapshot {
  return snapshot;
}

export function subscribeConnectionStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

if (typeof window !== "undefined") {
  window.addEventListener("online", recomputeAndEmit);
  window.addEventListener("offline", recomputeAndEmit);
}
