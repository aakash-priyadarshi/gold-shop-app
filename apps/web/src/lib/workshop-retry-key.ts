/** Keep the same ledger request key until a changed payload or confirmed success. */
export type WorkshopRetryKey = { fingerprint: string; key: string };

export function workshopRetryKey(
  previous: WorkshopRetryKey | null,
  payload: unknown,
  createKey: () => string,
): WorkshopRetryKey {
  const fingerprint = JSON.stringify(payload);
  return previous?.fingerprint === fingerprint
    ? previous
    : { fingerprint, key: createKey() };
}
