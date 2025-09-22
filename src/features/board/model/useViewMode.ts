import { useState, useCallback } from 'react';

export type ViewMode = "kanban" | "tree" | "depgraph" | "architecture";

/**
 * StructureBoard のビューモード状態管理フック
 * ビューの切り替えと状態管理を提供
 */
export function useViewMode(initialMode: ViewMode = "kanban") {
  const [viewMode, setViewMode] = useState<ViewMode>(initialMode);

  /**
   * ビューモードを変更する
   * @param mode - 設定するビューモード
   */
  const changeView = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  /**
   * Kanbanビューに切り替える
   */
  const switchToKanban = useCallback(() => {
    setViewMode("kanban");
  }, []);

  /**
   * Treeビューに切り替える
   */
  const switchToTree = useCallback(() => {
    setViewMode("tree");
  }, []);

  /**
   * DepGraphビューに切り替える
   */
  const switchToDepGraph = useCallback(() => {
    setViewMode("depgraph");
  }, []);

  /**
   * Architectureビューに切り替える
   */
  const switchToArchitecture = useCallback(() => {
    setViewMode("architecture");
  }, []);

  /**
   * 指定されたビューモードがアクティブかどうかを判定
   * @param mode - チェックするビューモード
   * @returns アクティブかどうか
   */
  const isActiveView = useCallback((mode: ViewMode) => {
    return viewMode === mode;
  }, [viewMode]);

  /**
   * ビューモードの表示名を取得
   * @param mode - 表示名を取得するビューモード（省略時は現在のモード）
   * @returns 表示名
   */
  const getViewLabel = useCallback((mode?: ViewMode) => {
    const targetMode = mode || viewMode;
    
    switch (targetMode) {
      case "kanban":
        return "Kanban";
      case "tree":
        return "Tree";
      case "depgraph":
        return "DepGraph";
      case "architecture":
        return "Architecture";
      default:
        return "Unknown";
    }
  }, [viewMode]);

  /**
   * 利用可能なすべてのビューモード
   */
  const availableViews: ViewMode[] = ["kanban", "tree", "depgraph", "architecture"];

  return {
    // State
    viewMode,
    currentViewLabel: getViewLabel(),
    
    // Actions
    setViewMode: changeView,
    switchToKanban,
    switchToTree,
    switchToDepGraph,
    switchToArchitecture,
    
    // Utils
    isActiveView,
    getViewLabel,
    availableViews
  };
}