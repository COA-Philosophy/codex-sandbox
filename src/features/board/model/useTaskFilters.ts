// path: src/features/board/model/useTaskFilters.ts
import { useState, useMemo, useCallback } from 'react';
import { Task, PhaseId, Owner } from '@/types/structure';
import { uniq } from '@/lib/utils';

/**
 * StructureBoard のフィルタリング状態管理フック
 * 検索・フィルター機能とフィルタリング済みタスクを提供
 */
export function useTaskFilters(tasks: Task[]) {
  // フィルター状態
  const [query, setQuery] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<Owner | "ALL">("ALL");
  const [phaseFilter, setPhaseFilter] = useState<PhaseId | "ALL">("ALL");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  /**
   * 全タスクから抽出されたユニークなタグリスト
   */
  const tagUniverse = useMemo(() => {
    return uniq(tasks.flatMap((t) => t.tags)).sort();
  }, [tasks]);

  /**
   * フィルタリング済みタスクリスト
   */
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // オーナーフィルター
      if (ownerFilter !== "ALL" && task.owner !== ownerFilter) {
        return false;
      }

      // フェーズフィルター
      if (phaseFilter !== "ALL" && task.phase !== phaseFilter) {
        return false;
      }

      // タグフィルター（選択されたタグがすべて含まれているかチェック）
      if (selectedTags.length > 0 && !selectedTags.every((tag) => task.tags.includes(tag))) {
        return false;
      }

      // テキスト検索（AND検索：スペース区切りですべてのトークンが含まれるかチェック）
      if (query.trim()) {
        const searchText = `${task.id} ${task.title} ${task.tags.join(" ")} ${task.files_out.join(" ")} ${task.desc ?? ""}`.toLowerCase();
        const searchTokens = query.toLowerCase().split(/\s+/);
        
        return searchTokens.every((token) => searchText.includes(token));
      }

      return true;
    });
  }, [tasks, ownerFilter, phaseFilter, selectedTags, query]);

  /**
   * タグの選択/選択解除をトグルする
   * @param tag - トグルするタグ名
   */
  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  }, []);

  /**
   * すべてのフィルターをリセットする
   */
  const resetFilters = useCallback(() => {
    setQuery("");
    setOwnerFilter("ALL");
    setPhaseFilter("ALL");
    setSelectedTags([]);
  }, []);

  /**
   * アクティブなフィルター数を計算
   */
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (query.trim()) count++;
    if (ownerFilter !== "ALL") count++;
    if (phaseFilter !== "ALL") count++;
    if (selectedTags.length > 0) count++;
    return count;
  }, [query, ownerFilter, phaseFilter, selectedTags]);

  return {
    // Filter State
    query,
    ownerFilter,
    phaseFilter,
    selectedTags,
    
    // Computed
    tagUniverse,
    filteredTasks,
    activeFilterCount,
    
    // Actions
    setQuery,
    setOwnerFilter,
    setPhaseFilter,
    setSelectedTags,
    toggleTag,
    resetFilters,
    
    // Stats
    totalTasks: tasks.length,
    filteredCount: filteredTasks.length
  };
}