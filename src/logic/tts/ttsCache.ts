/**
 * TTS 音频缓存模块
 * 使用 IndexedDB 存储 TTS 音频，避免重复请求
 */

const DB_NAME = "akasha-tts-cache";
const DB_VERSION = 1;
const STORE_NAME = "audio-cache";

export interface TtsCacheKey {
  text: string;
  voice: string;
  rate: string;
}

export interface TtsCacheEntry {
  key: string;
  audioBlob: Blob;
  createdAt: number;
  expiresAt: number;
}

// 缓存过期时间：7 天
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// 生成缓存键
export function createCacheKey(params: TtsCacheKey): string {
  return `${params.text}|||${params.voice}|||${params.rate}`;
}

// 解析缓存键
export function parseCacheKey(key: string): TtsCacheKey {
  const parts = key.split("|||");
  return {
    text: parts[0] || "",
    voice: parts[1] || "",
    rate: parts[2] || "",
  };
}

// 获取 IndexedDB 连接
function getDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
  });
}

// 清理过期缓存
export async function cleanupExpiredCache(): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const now = Date.now();

    const getAllRequest = store.getAll();

    await new Promise<void>((resolve, reject) => {
      getAllRequest.onsuccess = () => {
        const entries = getAllRequest.result as TtsCacheEntry[];
        const expiredKeys: string[] = [];

        entries.forEach((entry) => {
          if (entry.expiresAt < now) {
            expiredKeys.push(entry.key);
          }
        });

        if (expiredKeys.length > 0) {
          expiredKeys.forEach((key) => store.delete(key));
        }

        resolve();
      };
      getAllRequest.onerror = () => reject(getAllRequest.error);
    });

    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
    });
  } catch (error) {
    console.warn("TTS cache cleanup failed:", error);
  }
}

// 获取缓存的音频
export async function getCachedAudio(
  params: TtsCacheKey
): Promise<Blob | null> {
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const key = createCacheKey(params);

    return new Promise((resolve, reject) => {
      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result as TtsCacheEntry | undefined;
        if (!entry) {
          resolve(null);
          return;
        }

        // 检查是否过期
        if (entry.expiresAt < Date.now()) {
          // 异步删除过期条目
          cleanupExpiredCache().catch(console.warn);
          resolve(null);
          return;
        }

        resolve(entry.audioBlob);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn("TTS cache get failed:", error);
    return null;
  }
}

// 缓存音频
export async function cacheAudio(
  params: TtsCacheKey,
  audioBlob: Blob
): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const key = createCacheKey(params);
    const now = Date.now();

    const entry: TtsCacheEntry = {
      key,
      audioBlob,
      createdAt: now,
      expiresAt: now + CACHE_TTL_MS,
    };

    return new Promise((resolve, reject) => {
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);

      tx.oncomplete = () => resolve();
    });
  } catch (error) {
    console.warn("TTS cache set failed:", error);
  }
}

// 批量缓存音频
export async function cacheAudioBatch(
  items: Array<{ params: TtsCacheKey; audioBlob: Blob }>
): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const now = Date.now();

    for (const { params, audioBlob } of items) {
      const key = createCacheKey(params);
      const entry: TtsCacheEntry = {
        key,
        audioBlob,
        createdAt: now,
        expiresAt: now + CACHE_TTL_MS,
      };
      store.put(entry);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.warn("TTS batch cache failed:", error);
  }
}

// 清除所有缓存
export async function clearAllCache(): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);

      tx.oncomplete = () => resolve();
    });
  } catch (error) {
    console.warn("TTS clear cache failed:", error);
  }
}

// 获取缓存统计
export async function getCacheStats(): Promise<{
  count: number;
  size: number;
}> {
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    const count = await new Promise<number>((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // 估算大小（简单实现）
    const entries = await new Promise<TtsCacheEntry[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const size = entries.reduce((acc, entry) => {
      return acc + entry.audioBlob.size;
    }, 0);

    return { count, size };
  } catch (error) {
    console.warn("TTS cache stats failed:", error);
    return { count: 0, size: 0 };
  }
}
