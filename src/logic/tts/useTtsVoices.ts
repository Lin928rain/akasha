import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api";

export type TtsVoice = {
  name: string;
  friendly_name?: string;
  locale?: string;
  gender?: string;
};

type VoicesResponse = {
  code?: number;
  message?: string;
  data?: {
    voices?: TtsVoice[];
  };
};

export function useTtsVoices(localePrefix?: string) {
  const [voices, setVoices] = useState<TtsVoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchVoices = async () => {
      setLoading(true);
      setError(null);
      try {
        const query = localePrefix
          ? `?locale_prefix=${encodeURIComponent(localePrefix)}`
          : "";
        const payload = await apiRequest<VoicesResponse>(`/tts/voices${query}`);
        const list = payload.data?.voices ?? [];
        if (active) {
          setVoices(list);
        }
      } catch (err) {
        if (active) {
          setError((err as Error).message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    fetchVoices();
    return () => {
      active = false;
    };
  }, [localePrefix]);

  return useMemo(
    () => ({
      voices,
      loading,
      error,
    }),
    [voices, loading, error]
  );
}
