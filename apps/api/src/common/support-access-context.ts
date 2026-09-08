import { AsyncLocalStorage } from "async_hooks";

export const supportAccessContext = new AsyncLocalStorage<{
  readOnly: boolean;
  actorId: string;
}>();
