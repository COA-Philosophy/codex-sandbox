// path: src/features/board/ui/components/Header.tsx
import React from 'react';

/**
 * StructureBoardの上部ヘッダーコンポーネント
 * プロジェクトタイトルとバージョン情報を表示
 */
export function Header() {
  return (
    <div className="flex items-center justify-between">
      <div className="text-xl font-semibold tracking-wide">
        StructureBoard — Hybrid View
      </div>
      <div className="text-sm opacity-70">
        v2 · CodeBaton
      </div>
    </div>
  );
}