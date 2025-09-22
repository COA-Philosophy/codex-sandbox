// path: src/lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 配列から重複を除去するユーティリティ関数
 * 既存コード互換のためuniq名を使用
 */
export function uniq<T>(array: T[]): T[] {
  const seen = new Set<T>();
  const result: T[] = [];
  for (const item of array) {
    if (!seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
}

/**
 * 配列から重複を除去するユーティリティ関数（別名）
 */
export function unique<T>(array: T[]): T[] {
  return uniq(array);
}

/**
 * テキストをクリップボードにコピーする関数
 * モダンブラウザのClipboard API + フォールバック対応
 * 
 * @param text - コピーするテキスト
 * @returns Promise<boolean> - 成功時true、失敗時false
 */
export async function copy(text: string): Promise<boolean> {
  if (!text) {
    console.warn('[copy] Empty text provided');
    return false;
  }

  try {
    // モダンブラウザ: Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // フォールバック: document.execCommand
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const result = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    return result;
  } catch (error) {
    console.warn('[copy] Failed to copy text:', error);
    return false;
  }
}

/**
 * 日付を読みやすい形式でフォーマットする関数
 * StructureBoardのhandoff表示用
 */
export function formatTimestamp(timestamp?: number): string {
  if (!timestamp) return "(never)";
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}