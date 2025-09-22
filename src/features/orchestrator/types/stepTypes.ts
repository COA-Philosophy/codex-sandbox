// path: src/features/orchestrator/types/stepTypes.ts

/**
 * V1→V2移植: ステップ実行履歴型定義
 * V1の6段階ステップ追跡 → V2の2段階フロー追跡に再設計
 */

import { OrchestrationPhase } from './orchestrationTypes';

/**
 * V2: ステップ実行結果（V1のOrchestrationResult.stepsを基に再設計）
 */
export interface OrchestrationStep {
  id: string;                          // ステップ識別子
  stepNumber: number;                  // ステップ番号（V1継承）
  phase: OrchestrationPhase;           // 実行フェーズ（V1のphaseを2段階フローに適応）
  
  // V1継承: エージェント実行情報
  agentId: 'gpt4o' | 'claude' | 'gemini';  // 実行エージェント（V1のspeakerから変更）
  role: string;                        // エージェント役割（V1継承）
  
  // V1継承: 実行結果
  startTime: Date;                     // 開始時刻
  endTime?: Date;                      // 終了時刻
  duration?: number;                   // 実行時間（ms）（V1継承）
  result?: string;                     // 実行結果（V1継承）
  
  // V1継承: AI特性・品質情報（V1のtraitから継承）
  trait?: {
    name: string;                      // 特性名（例: "創造性", "精密性"）
    value: number;                     // 0-1の値
  };
  
  // V2: 実行状態
  status: 'pending' | 'running' | 'completed' | 'error';
  error?: string;                      // エラー情報
}

export default OrchestrationStep;