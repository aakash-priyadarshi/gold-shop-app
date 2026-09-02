import { act, renderHook, waitFor } from "@testing-library/react";

import { useQueuedAutoSave } from "./use-auto-save";

describe("useQueuedAutoSave", () => {
  it("saves queued changes in order and reports the latest result", async () => {
    const resolvers: Array<() => void> = [];
    const save = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolvers.push(resolve);
        }),
    );
    const { result } = renderHook(() => useQueuedAutoSave(save));

    act(() => {
      void result.current.enqueue("first");
      void result.current.enqueue("second");
    });

    expect(result.current.status).toBe("saving");
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenLastCalledWith("first");

    await act(async () => {
      resolvers.shift()?.();
      await Promise.resolve();
    });
    expect(save).toHaveBeenLastCalledWith("second");

    await act(async () => {
      resolvers.shift()?.();
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.status).toBe("saved"));
    expect(save.mock.calls.map(([value]) => value)).toEqual([
      "first",
      "second",
    ]);
  });

  it("continues with later changes after a failed save", async () => {
    let rejectFirst!: (error: Error) => void;
    const save = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((_, reject) => {
            rejectFirst = reject;
          }),
      )
      .mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useQueuedAutoSave(save));

    let first: Promise<void>;
    act(() => {
      first = result.current.enqueue("first");
      void result.current.enqueue("second");
    });

    await waitFor(() => expect(rejectFirst).toBeTypeOf("function"));
    await act(async () => {
      rejectFirst(new Error("offline"));
      await expect(first!).rejects.toThrow("offline");
      await Promise.resolve();
    });

    await waitFor(() => expect(save).toHaveBeenLastCalledWith("second"));
    await waitFor(() => expect(result.current.status).toBe("saved"));
  });
});
