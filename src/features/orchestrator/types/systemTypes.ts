// path: src/features/orchestrator/types/systemTypes.ts

/**
 * V1→V2移植: システムイベント・エラー管理型定義
 * V1の協奏エラー処理 + イベント管理 → V2の統合システム監視
 */

/**
 * V2: システムイベント種別（V1のAIConversationEventを拡張）
 */
export type SystemEventType = 
  | 'orchestration_start'     // 協奏開始
  | 'phase_transition'        // フェーズ遷移
  | 'agent_execution'         // エージェント実行
  | 'agent_error'             // エージェントエラー
  | 'fallback_triggered'      // フォールバック発動
  | 'orchestration_complete'  // 協奏完了
  | 'user_approval'           // ユーザー承認
  | 'system_error';           // システムエラー
   'ai_error'   

/**
 * V2: システムイベント（V1のエラー管理 + AIイベントを統合）
 */
export interface SystemEvent {
  id: string;                          // イベント識別子
  type: SystemEventType;               // イベント種別
  timestamp: Date;                     // 発生時刻
  sessionId: string;                   // セッション識別子
  
  // V1継承: エージェント情報（V1のAISpeakerから継承）
  agentId?: string;                    // 関連エージェント
  phase?: string;                      // 関連フェーズ
  
  // V2: イベント詳細
  message: string;                     // 人間可読メッセージ
  data?: Record<string, any>;          // 構造化データ
  
  // V1継承: エラー情報（V1のOrchestrationResultエラーから継承）
  error?: {
    code: string;                      // エラーコード
    details: string;                   // エラー詳細
    recoverable: boolean;              // 回復可能性
  };
}

export default SystemEvent;