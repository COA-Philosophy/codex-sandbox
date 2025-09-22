// path: src/features/orchestrator/adapters/claudeAdapter.ts
// CodeBaton V2 - Claude API Adapter (AIResponse型完全対応版)
// V1移植: Claude Craftsman/Refiner → V2 要件定義+レビューAI

import { AIResponse, OrchestrationPhase, SystemEvent } from '@/features/orchestrator/types';

/**
 * Claude実行オプション
 */
export interface ClaudeAdapterOptions {
  sessionId?: string;
  phase: OrchestrationPhase;
  mockMode?: boolean;
  maxRetries?: number;
  timeoutMs?: number;
  model?: string;
}

/**
 * Claude API レスポンス型（実装準備）
 */
interface ClaudeAPIResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Claude実行結果
 */
export interface ClaudeExecutionResult {
  success: boolean;
  response: AIResponse;
  error?: SystemEvent;
  retryCount?: number;
  duration: number;
}

/**
 * リトライ設定
 */
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

/**
 * Claude アダプターメインクラス
 * V2の要件定義+レビューAIとしてのClaude統合管理
 */
export class ClaudeAdapter {
  private readonly defaultOptions: Required<Omit<ClaudeAdapterOptions, 'sessionId' | 'phase'>>;
  private readonly retryConfig: RetryConfig;

  constructor() {
    this.defaultOptions = {
      mockMode: process.env.CLAUDE_MOCK === 'true',
      maxRetries: 3,
      timeoutMs: 30000, // 30秒
      model: 'claude-3-sonnet-20240229',
    };

    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000, // 1秒
      maxDelay: 8000,  // 8秒
      backoffMultiplier: 2,
    };
  }

  /**
   * Claude実行メイン関数
   * V1のrunClaudeCraftsman/runClaudeRefiner統合版
   */
  async execute(
    prompt: string,
    options: ClaudeAdapterOptions
  ): Promise<ClaudeExecutionResult> {
    const startTime = Date.now();
    const config = { 
      ...this.defaultOptions, 
      ...options,
      sessionId: options.sessionId || `claude_${Date.now()}`
    };

    console.log(`[ClaudeAdapter] 実行開始: ${config.phase} (mock: ${config.mockMode})`);

    try {
      // モックモード判定
      if (config.mockMode) {
        return await this.executeMockMode(prompt, options, startTime);
      }

      // 実API実行（リトライ機構付き）
      const result = await this.executeWithRetry(prompt, config as Required<ClaudeAdapterOptions>, startTime);
      
      console.log(`[ClaudeAdapter] 実行完了: ${config.phase} (${Date.now() - startTime}ms)`);
      return result;

    } catch (error) {
      console.error('[ClaudeAdapter] 実行エラー:', error);
      
      const errorEvent: SystemEvent = {
        id: `claude_error_${Date.now()}`,
        type: 'system_error',
        timestamp: new Date(),
        sessionId: config.sessionId,
        message: error instanceof Error ? error.message : 'Claude execution failed',
        data: { phase: config.phase, prompt: prompt.slice(0, 100) },
      };

      return {
        success: false,
        response: this.createErrorResponse(errorEvent),
        error: errorEvent,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * モック実行モード
   * V1のモックパターン継承・V2フェーズ対応
   */
  private async executeMockMode(
    prompt: string,
    options: ClaudeAdapterOptions,
    startTime: number
  ): Promise<ClaudeExecutionResult> {
    console.log(`[ClaudeAdapter] モック実行: ${options.phase}`);

    // フェーズ別モックレスポンス生成
    const mockContent = this.generateMockResponse(prompt, options.phase);
    
    // リアリティのための遅延
    const mockDelay = 800 + Math.random() * 400; // 800-1200ms
    await new Promise(resolve => setTimeout(resolve, mockDelay));

    const response: AIResponse = {
      id: `claude_mock_${Date.now()}`,
      role: 'assistant',
      text: mockContent,
      content: mockContent,
      agentId: 'claude',
      sessionId: options.sessionId || `claude_${Date.now()}`,
      status: 'complete',
      timestamp: new Date(),
      agentName: 'Claude',
      phase: options.phase,
    };

    return {
      success: true,
      response,
      duration: Date.now() - startTime,
    };
  }

  /**
   * リトライ機構付き実行
   * V1のexecuteWithFallback参考・指数バックオフ実装
   */
  private async executeWithRetry(
    prompt: string,
    config: Required<ClaudeAdapterOptions>,
    startTime: number
  ): Promise<ClaudeExecutionResult> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = Math.min(
            this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
            this.retryConfig.maxDelay
          );
          console.log(`[ClaudeAdapter] リトライ ${attempt}/${config.maxRetries} (${delay}ms後)`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        // 実API呼び出し（準備段階ではモック）
        const result = await this.callClaudeAPI(prompt, config);
        
        return {
          success: true,
          response: result,
          retryCount: attempt,
          duration: Date.now() - startTime,
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown API error');
        console.warn(`[ClaudeAdapter] 試行 ${attempt + 1} 失敗:`, lastError.message);
        
        // 最後の試行で失敗した場合はエラーを投げる
        if (attempt === config.maxRetries) {
          throw lastError;
        }
      }
    }

    // 理論上到達不可能だが、TypeScript対応
    throw lastError || new Error('Retry exceeded');
  }

  /**
   * Claude API実際の呼び出し（現在はモック実装）
   * 本格実装時にAnthropic Claude APIに置き換え予定
   */
  private async callClaudeAPI(
    prompt: string,
    config: Required<ClaudeAdapterOptions>
  ): Promise<AIResponse> {
    // 実API実装準備中のため、詳細モック実行
    console.log('[ClaudeAdapter] 準備中: 実API呼び出し → 詳細モック実行');
    
    // API呼び出しシミュレーション遅延
    const apiDelay = 1200 + Math.random() * 800; // 1.2-2.0秒
    await new Promise(resolve => setTimeout(resolve, apiDelay));

    // 実APIレスポンス形式を模倣
    const mockApiResponse: ClaudeAPIResponse = {
      id: `msg_${Date.now()}`,
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: this.generateMockResponse(prompt, config.phase),
        }
      ],
      model: config.model,
      usage: {
        input_tokens: Math.floor(prompt.length / 4),
        output_tokens: Math.floor(300 / 4), // 概算
      },
    };

    // AIResponse型に変換
    return this.transformAPIResponse(mockApiResponse, config);
  }

  /**
   * Claude APIレスポンスをAIResponse型に変換
   */
  private transformAPIResponse(
    apiResponse: ClaudeAPIResponse,
    config: Required<ClaudeAdapterOptions>
  ): AIResponse {
    const text = apiResponse.content[0]?.text || '';
    
    return {
      id: apiResponse.id,
      role: 'assistant',
      text,
      content: text,
      agentId: 'claude',
      sessionId: config.sessionId,
      status: 'complete',
      timestamp: new Date(),
      agentName: 'Claude',
      phase: config.phase,
    };
  }

  /**
   * フェーズ別モックレスポンス生成
   * V2の要件定義+レビューAI役割に対応
   */
  private generateMockResponse(prompt: string, phase: OrchestrationPhase): string {
    const promptPreview = prompt.slice(0, 50);
    
    switch (phase) {
      case 'requirements':
        return `## 要件定義結果

**入力**: ${promptPreview}...

### 機能要件
1. ユーザーインターフェース設計
2. データ処理ロジック実装
3. レスポンシブ対応

### 非機能要件
- パフォーマンス: 2秒以内の応答時間
- セキュリティ: 入力検証・XSS防止
- アクセシビリティ: WCAG 2.1 AA準拠

### 技術仕様
- Framework: Next.js + TypeScript
- Styling: Tailwind CSS
- State Management: Zustand

### 実装優先度
1. 高: コア機能実装
2. 中: パフォーマンス最適化
3. 低: 追加機能・改善`;

      case 'implementation':
        return `## 実装レビュー結果

**対象**: ${promptPreview}...

### コード品質評価
- **可読性**: 8/10 - 変数名・関数名が適切
- **保守性**: 7/10 - コンポーネント分割を改善推奨
- **テスタビリティ**: 6/10 - ユニットテスト追加要

### 改善提案
1. **型安全性強化**: strict mode対応確認
2. **エラーハンドリング**: try-catch追加
3. **パフォーマンス**: useMemo/useCallback活用

### セキュリティチェック
- XSS対策: 適切
- 入力検証: 部分的 → 強化推奨
- 認証・認可: 確認要

### 次のアクション
- [ ] テストケース追加
- [ ] TypeScript strict対応
- [ ] エラーハンドリング強化`;

      case 'approval':
        return `## 承認フェーズ処理

**対象**: ${promptPreview}...

承認フェーズでの Claude による品質確認を完了しました。
要件定義内容を精査し、実装に進める準備が整っています。`;

      default:
        return `## Claude処理結果

**フェーズ**: ${phase}
**入力**: ${promptPreview}...

処理を完了しました。詳細な分析結果と改善提案を含んだレスポンスです。`;
    }
  }

  /**
   * エラー時のAIResponse生成
   */
  private createErrorResponse(error: SystemEvent): AIResponse {
    const errorMessage = `Claude実行エラー: ${error.message}`;
    
    return {
      id: `claude_error_${Date.now()}`,
      role: 'assistant',
      text: errorMessage,
      content: errorMessage,
      agentId: 'claude',
      sessionId: error.sessionId,
      status: 'error',
      timestamp: new Date(),
      agentName: 'Claude',
      phase: 'requirements',
    };
  }
}

/**
 * ClaudeAdapter シングルトンインスタンス
 */
const claudeAdapter = new ClaudeAdapter();

/**
 * 便利関数: Requirements フェーズ専用
 */
export async function executeRequirements(
  prompt: string,
  sessionId?: string
): Promise<ClaudeExecutionResult> {
  return claudeAdapter.execute(prompt, {
    sessionId,
    phase: 'requirements',
    mockMode: process.env.CLAUDE_MOCK === 'true',
  });
}

/**
 * 便利関数: Implementation レビュー専用
 */
export async function executeImplementationReview(
  code: string,
  sessionId?: string
): Promise<ClaudeExecutionResult> {
  return claudeAdapter.execute(`実装レビュー対象:\n\n${code}`, {
    sessionId,
    phase: 'implementation',
    mockMode: process.env.CLAUDE_MOCK === 'true',
  });
}

/**
 * Claude Adapter テスト実行
 */
export async function testClaudeAdapter(): Promise<boolean> {
  try {
    console.log('[ClaudeAdapter Test] テスト開始');
    
    // Requirements テスト
    const reqResult = await executeRequirements('テスト要件: ユーザー管理画面作成');
    if (!reqResult.success) return false;

    // Implementation レビューテスト  
    const reviewResult = await executeImplementationReview('function TestComponent() { return <div>Test</div>; }');
    if (!reviewResult.success) return false;

    console.log('[ClaudeAdapter Test] 全テスト成功');
    return true;

  } catch (error) {
    console.error('[ClaudeAdapter Test] テスト失敗:', error);
    return false;
  }
}

export { claudeAdapter };
export default claudeAdapter;