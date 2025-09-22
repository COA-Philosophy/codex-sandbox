// path: src/hooks/useLocalStorage.ts
import { useState, useEffect, useCallback } from 'react';

/**
 * localStorage にデータを永続化する型安全なReactフック
 * 
 * @param key - localStorage のキー
 * @param initialValue - 初期値
 * @returns [value, setValue, removeValue] タプル
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prevValue: T) => T)) => void, () => void] {
  // 初期値の取得（SSR対応）
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // 値を設定する関数
  const setValue = useCallback(
    (value: T | ((prevValue: T) => T)) => {
      try {
        // 関数の場合は現在の値を渡して実行
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        
        setStoredValue(valueToStore);
        
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  // 値を削除する関数
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  // storage イベントを監視して他のタブとの同期を行う
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.warn(`Error parsing localStorage event for key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue, removeValue];
}

/**
 * 配列データに特化したlocalStorageフック
 * pushItem, removeItem等の便利メソッドを提供
 */
export function useLocalStorageArray<T>(
  key: string,
  initialValue: T[] = []
): {
  items: T[];
  setItems: (items: T[] | ((prev: T[]) => T[])) => void;
  pushItem: (item: T) => void;
  removeItem: (predicate: (item: T) => boolean) => void;
  clearItems: () => void;
} {
  const [items, setItems, clearItems] = useLocalStorage<T[]>(key, initialValue);

  const pushItem = useCallback(
    (item: T) => {
      setItems((prev) => [...prev, item]);
    },
    [setItems]
  );

  const removeItem = useCallback(
    (predicate: (item: T) => boolean) => {
      setItems((prev) => prev.filter((item) => !predicate(item)));
    },
    [setItems]
  );

  return {
    items,
    setItems,
    pushItem,
    removeItem,
    clearItems
  };
}