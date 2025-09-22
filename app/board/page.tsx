// path: app/structureboard/page.tsx
"use client";

import React from "react";
import { StructureBoardPane } from "@/features/board/ui/StructureBoardPane";
import { DetailPanel } from "@/features/board/ui/components/DetailPanel";
import { DepGraphView } from "@/features/board/ui/components/DepGraphView";
import { TreeView } from "@/features/board/ui/components/TreeView";
import { KanbanBoard } from "@/features/board/ui/components/KanbanBoard";
import { Toolbar } from "@/features/board/ui/components/Toolbar";
import { HandoffBar } from "@/features/board/ui/components/HandoffBar";
import { ArchitectureView } from "@/features/board/ui/components/ArchitectureView";

/**
 * StructureBoard メインページ
 * 新しいアーキテクチャ: 状態管理は専用フックに分離、UIは StructureBoardPane に委譲
 */
export default function StructureBoardPage() {
  return (
    <StructureBoardPane
      Header={Header}
      HandoffBar={HandoffBar}
      Toolbar={Toolbar}
      KanbanBoard={KanbanBoard}
      TreeView={TreeView}
      DepGraphView={DepGraphView}
      ArchitecturePlaceholder={ArchitectureView}
      DetailPanel={DetailPanel}
    />
  );
}

// === シンプルコンポーネント定義 ===

/**
 * アプリケーションヘッダー
 */
function Header() {
  return (
    <div className="flex items-center justify-between">
      <div className="text-xl font-semibold tracking-wide">StructureBoard — Hybrid View</div>
      <div className="text-sm opacity-70">v2 · integrated</div>
    </div>
  );
}