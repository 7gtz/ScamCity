/** FIFO modal ownership: siblings can request opening, but only one is active. */
const requests: string[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
export const activeDialog = () => requests[0] ?? null;
export const subscribeDialogs = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function requestDialog(id: string) {
  if (!requests.includes(id)) { requests.push(id); emit(); }
  return () => { const index = requests.indexOf(id); if (index >= 0) { requests.splice(index, 1); emit(); } };
}
