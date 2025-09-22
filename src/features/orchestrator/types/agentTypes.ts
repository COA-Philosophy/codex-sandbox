// path: src/features/orchestrator/types/agentTypes.ts

/**
 * V1→V2移植: AIエージェント状態管理型定義
 * V1のAISpeaker + プロバイダ管理 → V2のエージェント状態に統合
 */

/**
 * V2: AIエージェント実行状態（V1のAISpeaker概念を拡張）
 */
export type AgentExecutionStatus = 'idle' | 'running' | 'completed' | 'error' | 'fallback';

/**
 * V2: 各AIエージェントの状態（V1プロバイダ管理を統合）
 */
export interface AgentStatus {
  id: string;                           // エージェント識別子
  name: string;                         // 表示名（例: "GPT-4o Orchestra", "Claude Constructor"）
  status: AgentExecutionStatus;         // 現在の実行状態
  lastActive: Date | null;              // 最終活動時刻
  
  // V1継承: AI特性情報（V1のAITraitから継承）
  currentTask?: string;                 // 現在実行中のタスク
  performance: {
    successRate: number;                // 成功率（0-1）
    avgResponseTime: number;            // 平均応答時間（ms）
  };
  
  // V2: エラー・フォールバック管理（V1のフォールバック機構を統合）
  errorCount: number;                   // エラー回数
  fallbackAvailable: boolean;           // フォールバック利用可能
}

export default AgentStatus;