import { useSyncExternalStore } from "react";

// localStorage バックの id 集合ストア（既読・お気に入り）。
// useSyncExternalStore でリアクティブに。getSnapshot は version（安定）を返す。
function createSetStore(key: string) {
  let set = load();
  let version = 0;
  const listeners = new Set<() => void>();

  function load(): Set<string> {
    try {
      const raw = localStorage.getItem(key);
      return new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set<string>();
    }
  }
  function save() {
    try {
      localStorage.setItem(key, JSON.stringify([...set]));
    } catch {
      /* ストレージ不可環境は無視 */
    }
  }
  function bump() {
    version++;
    listeners.forEach((l) => l());
  }

  return {
    has: (id: string) => set.has(id),
    add(id: string) {
      if (!set.has(id)) {
        set.add(id);
        save();
        bump();
      }
    },
    toggle(id: string) {
      if (set.has(id)) set.delete(id);
      else set.add(id);
      save();
      bump();
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getVersion: () => version,
  };
}

const readStore = createSetStore("pr-turbo:read");
const favStore = createSetStore("pr-turbo:fav");

// version を購読して再レンダリングを促す（値自体は store.has() で都度参照）
function useStore(store: ReturnType<typeof createSetStore>) {
  useSyncExternalStore(store.subscribe, store.getVersion, store.getVersion);
}

export function useRead() {
  useStore(readStore);
  return {
    isRead: (id: string) => readStore.has(id),
    markRead: (id: string) => readStore.add(id),
  };
}

export function useFavorites() {
  useStore(favStore);
  return {
    isFav: (id: string) => favStore.has(id),
    toggleFav: (id: string) => favStore.toggle(id),
  };
}
