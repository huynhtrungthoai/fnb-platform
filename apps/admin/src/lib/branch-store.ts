import { useSyncExternalStore } from 'react';

/** Where the branch the user works in is remembered on this device (CORE-03). */
const STORAGE_KEY = 'fnb.admin.branch';

function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage can be blocked; the first branch the user can reach is used instead.
    return null;
  }
}

let selectedBranchId: string | null = readStored();
const listeners = new Set<() => void>();

/** The branch sent as `X-Branch-Id` with every request; null until the user has one. */
export function getSelectedBranchId(): string | null {
  return selectedBranchId;
}

/** Switches the working branch and remembers it on this device. */
export function setSelectedBranchId(branchId: string | null): void {
  if (branchId === selectedBranchId) {
    return;
  }
  selectedBranchId = branchId;
  try {
    if (branchId) {
      window.localStorage.setItem(STORAGE_KEY, branchId);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // The choice still applies until the tab is closed.
  }
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The working branch, re-rendering when it changes. */
export function useSelectedBranchId(): string | null {
  return useSyncExternalStore(subscribe, getSelectedBranchId, getSelectedBranchId);
}
