import { useEffect, useRef, useState } from "react";
import { subscribeDbChanges } from "./db";

export function useDbQuery<T>(
  query: () => Promise<T>,
  dependencies: unknown[],
  initialValue: T
): T {
  const [value, setValue] = useState<T>(initialValue);
  const [version, setVersion] = useState<number>(0);
  const prevDepsRef = useRef<unknown[]>([]);

  useEffect(() => {
    return subscribeDbChanges(() => setVersion((v) => v + 1));
  }, []);

  useEffect(() => {
    // 检查依赖是否变化（浅比较）
    const depsChanged =
      prevDepsRef.current.length !== dependencies.length ||
      prevDepsRef.current.some((dep, index) => dep !== dependencies[index]);

    if (depsChanged) {
      // 依赖变化时立即重置为初始值，避免显示旧数据
      setValue(initialValue);
      prevDepsRef.current = dependencies;
    }

    let active = true;
    query().then((result) => {
      if (active) {
        setValue(result);
      }
    });
    return () => {
      active = false;
    };
  }, [...dependencies, version]);

  return value;
}
