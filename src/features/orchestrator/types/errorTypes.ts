// path: src/features/orchestrator/types/errorTypes.ts

/**
 * V1→V2移植: エラー分類・管理統一型定義
 * V1の協奏エラー処理 → V2の2段階フロー + エージェント協奏エラー管理
 */

/**
 * V2: エラー分類（V1のprovider-manager + orchestratorエラーを統合）
 */
export type ErrorCategory = 
  | 'orchestration'          // 協奏フロー制御エラー（V1継承）
  | 'agent_execution'        // エージェント実行エラー（V1のproviderエラー継承）
  | 'phase_transition'       // フェーズ遷移エラー（V2新規）
  | 'approval_timeout'       // 承認タイムアウト（V2新規）
  | 'fallback_exhausted'     // フォールバック枯渇（V1継承）
  | 'communication'          // エージェント間通信エラー（V2新規）
  | 'validation'             // 入力バリデーションエラー
  | 'system';                // システムレベルエラー

/**
 * V2: エラー重要度（V1のエラー処理を参考に定義）
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * V2: 統合エラー情報（V1のOrchestrationResultエラー + SystemEventエラーを統合）
 */
export interface OrchestrationError {
  id: string;                            // エラー識別子
  category: ErrorCategory;               // エラー分類
  severity: ErrorSeverity;               // 重要度
  code: string;                          // エラーコード（例: "ORCH_001", "AGENT_TIMEOUT"）
  message: string;                       // 人間可読メッセージ
  
  // V1継承: 技術詳細（V1のerror管理から継承）
  details?: Record<string, any>;         // 構造化詳細情報
  stackTrace?: string;                   // スタックトレース
  
  // V2: コンテキスト情報
  agentId?: string;                      // 関連エージェント
  phase?: string;                        // 発生フェーズ
  sessionId: string;                     // セッション識別子
  timestamp: Date;                       // 発生時刻
  
  // V1継承: 回復情報（V1のfallback機構から継承）
  recoverable: boolean;                  // 回復可能性
  retryCount?: number;                   // 再試行回数
  fallbackAttempted?: boolean;           // フォールバック試行済み
}

export default OrchestrationError;