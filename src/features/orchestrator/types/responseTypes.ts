// path: src/features/orchestrator/types/responseTypes.ts

/**
 * V1→V2移植: AIレスポンス統一管理型定義
 * V1のStreamingResponse → V2のエージェント協奏レスポンスに再設計
 */

import { OrchestrationPhase } from './orchestrationTypes';

/**
 * V2: AI応答状態（V1のStreamingResponseを拡張）
 */
export type AIResponseStatus = 'streaming' | 'complete' | 'error' | 'success' | 'timeout';

/**
 * V2: AIレスポンス（V1のStreamingResponseを基に拡張）
 */
export interface AIResponse {
  // V1継承: 基本レスポンス情報
  id: string;                              // レスポンス識別子
  role: 'assistant' | 'user' | 'system';   // 発言者役割（V1継承）
  text: string;                            // レスポンス本文（V1継承）
  status: AIResponseStatus; 
  content: string;                // 応答状態（V1のisCompleteを拡張）
  
  // V2: エージェント協奏情報
  agentId: 'gpt4o' | 'claude' | 'gemini';  // 応答エージェント
  agentName: string;                       // エージェント表示名（V1のnameから継承）
  phase: OrchestrationPhase;               // 実行フェーズ
  
  // V1継承: 技術情報
  tokenCount?: number;                     // トークン数（V1継承）
  duration?: number;                       // 応答時間（ms）
  
  // V1継承: エラー管理（V1のerrorから継承）
  error?: {
    code: string;                          // エラーコード
    message: string;                       // エラーメッセージ
    recoverable: boolean;                  // 回復可能性
  };
  
  // V2: メタデータ
  timestamp: Date;                         // 応答時刻
  sessionId: string;                       // セッション識別子
}

export default AIResponse;