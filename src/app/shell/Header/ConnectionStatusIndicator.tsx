import { getApiPrefix } from "@/logic/api";
import {
  ConnectionSnapshot,
  getConnectionSnapshot,
  recordRequestResult,
  subscribeConnectionStatus,
} from "@/logic/connectionStatus";
import { Badge, Tooltip, useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useEffect, useState } from "react";

const PROBE_INTERVAL_MS = 1000;
const PROBE_TIMEOUT_MS = 4000;

function levelMeta(snapshot: ConnectionSnapshot): {
  color: string;
} {
  if (!snapshot.online || snapshot.level === "offline") {
    return { color: "red" };
  }
  if (snapshot.level === "poor") {
    return { color: "orange" };
  }
  if (snapshot.level === "fair") {
    return { color: "yellow" };
  }
  return { color: "green" };
}

export default function ConnectionStatusIndicator() {
  const [snapshot, setSnapshot] = useState<ConnectionSnapshot>(() =>
    getConnectionSnapshot()
  );
  const theme = useMantineTheme();
  const compact = !!useMediaQuery(
    `(max-width: ${theme.breakpoints.sm}) and (min-width: ${theme.breakpoints.xs})`
  );
  const meta = levelMeta(snapshot);
  const details = `Success ${Math.round(snapshot.successRate * 100)}% | Latency ${Math.round(snapshot.avgLatencyMs)}ms | Samples ${snapshot.sampleCount}`;
  const latencyText = snapshot.online
    ? `${Math.round(snapshot.avgLatencyMs)}ms`
    : "--ms";

  useEffect(() => {
    return subscribeConnectionStatus(() => {
      setSnapshot(getConnectionSnapshot());
    });
  }, []);

  useEffect(() => {
    let active = true;

    const runProbe = async () => {
      const startedAt = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        controller.abort();
      }, PROBE_TIMEOUT_MS);

      try {
        const response = await fetch(`${getApiPrefix()}/health`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!active) {
          return;
        }
        recordRequestResult({
          ok: response.ok,
          latencyMs: Date.now() - startedAt,
          retries: 0,
        });
      } catch {
        if (!active) {
          return;
        }
        recordRequestResult({
          ok: false,
          latencyMs: PROBE_TIMEOUT_MS,
          retries: 0,
        });
      } finally {
        clearTimeout(timeout);
      }
    };

    runProbe();
    const timer = setInterval(runProbe, PROBE_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <Tooltip label={details} disabled={!compact} position="bottom-end">
      <Badge variant="light" color={meta.color}>
        {latencyText}
      </Badge>
    </Tooltip>
  );
}
