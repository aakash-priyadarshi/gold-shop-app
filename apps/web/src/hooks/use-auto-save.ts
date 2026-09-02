import { useCallback, useRef, useState } from "react";

export type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

type SaveFunction<T> = (value: T) => Promise<unknown>;

/**
 * Serializes small settings updates so a fast sequence of toggles is applied
 * in the same order it was made. Only the latest update controls the status.
 */
export function useQueuedAutoSave<T>(save: SaveFunction<T>) {
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const latestRequestRef = useRef(0);
  const [status, setStatus] = useState<AutoSaveStatus>("idle");

  const enqueue = useCallback(
    (value: T) => {
      const requestId = ++latestRequestRef.current;
      setStatus("saving");

      const task: Promise<void> = queueRef.current.then(async () => {
        try {
          await save(value);
          if (latestRequestRef.current === requestId) {
            setStatus("saved");
          }
        } catch (error) {
          if (latestRequestRef.current === requestId) {
            setStatus("error");
          }
          throw error;
        }
      });

      // Keep later updates moving after a failed request while preserving the
      // rejection on the task returned to the caller for rollback handling.
      queueRef.current = task.catch(() => {});
      return task;
    },
    [save],
  );

  const waitForPending = useCallback(() => queueRef.current, []);
  return { status, enqueue, waitForPending };
}
