// path: src/features/orchestrator/types/flowTypes.ts

/**
 * V1→V2移植: フロー制御状態型定義
 * V1の6段階フロー → V2の2段階フロー制御に再設計
 */

import { OrchestrationPhase } from './orchestrationTypes';

/**
 * V2: フロー制御状態（V1の複雑な6段階 → V2の明確な2段階）
 */
export interface FlowState {
  // V2: 基本フロー情報
  currentPhase: OrchestrationPhase;        // 現在のフェーズ
  canProceed: boolean;                     // 次フェーズへの進行可能性
  
  // V2: 各フェーズの完了状態（V1の6段階を3段階に集約）
  requirementsCompleted: boolean;          // 要件定義完了（V1のAdvisor/Conductor段階）
  approvalReceived: boolean;               // ユーザー承認受領（V2新規）
  implementationInProgress: boolean;       // 実装進行中（V1のCraftsman/Checker/Refiner/Auditor段階）
  
  // V2: 承認・意思決定管理（V1にはなかった機能）
  pendingApproval: {
    required: boolean;                     // 承認必要性
    requestedAt?: Date;                    // 承認依頼時刻
    timeoutAt?: Date;                      // 承認タイムアウト時刻
  };
  
  // V1継承: 進捗情報（V1のステップ管理から継承）
  progress: {
    totalSteps: number;                    // 総ステップ数（V2では3段階）
    completedSteps: number;                // 完了ステップ数
    estimatedTimeRemaining?: number;       // 推定残り時間（ms）
  };
}

export default FlowState;