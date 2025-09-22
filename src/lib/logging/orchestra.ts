import { createClient } from '@supabase/supabase-js'

// Service Role接続（ログ書き込み専用）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
  tool?: string
  requestId?: string
  agentId?: string
  sessionId?: string
  duration?: number
  error?: string
  args?: Record<string, any>
  result?: any
  [key: string]: any
}

/**
 * requestId生成（追跡可能な一意ID）
 */
export function generateRequestId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `req_${timestamp}_${random}`
}

/**
 * 統一監査ログ書き込み
 */
export async function auditLog(
  level: LogLevel,
  message: string,
  context: LogContext = {}
): Promise<void> {
  try {
    // コンソールログ（即座の確認用）
    const logPrefix = '[orchestra]'
    const logMessage = `${logPrefix} ${message}`
    const logData = { ...context }
    
    switch (level) {
      case 'debug':
        console.debug(logMessage, logData)
        break
      case 'info':
        console.info(logMessage, logData)
        break
      case 'warn':
        console.warn(logMessage, logData)
        break
      case 'error':
        console.error(logMessage, logData)
        break
    }

    // データベース記録（非同期・エラー無視）
    const { error } = await supabase
      .from('orchestra_logs')
      .insert({
        request_id: context.requestId,
        agent_id: context.agentId,
        session_id: context.sessionId,
        tool: context.tool,
        level,
        message,
        context: context
      })

    if (error) {
      // ログ記録失敗はコンソールのみで記録（無限ループ防止）
      console.warn('[orchestra] 監査ログ記録失敗:', error.message)
    }
  } catch (error) {
    // 完全に失敗してもメイン処理は継続
    console.warn('[orchestra] 監査ログ処理エラー:', error)
  }
}

/**
 * 冪等性キー検証・キャッシュ取得
 */
export async function checkIdempotency(
  tool: string,
  idempotencyKey: string
): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('orchestra_idempotency')
      .select('response')
      .eq('tool', tool)
      .eq('key', idempotencyKey)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error || !data) {
      return null // キャッシュなし
    }

    return data.response
  } catch (error) {
    console.warn('[orchestra] 冪等性チェックエラー:', error)
    return null
  }
}

/**
 * 冪等性レスポンス保存
 */
export async function saveIdempotencyResponse(
  tool: string,
  idempotencyKey: string,
  response: any
): Promise<void> {
  try {
    await supabase
      .from('orchestra_idempotency')
      .upsert({
        tool,
        key: idempotencyKey,
        response,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
  } catch (error) {
    console.warn('[orchestra] 冪等性レスポンス保存エラー:', error)
    // 保存失敗してもメイン処理は継続
  }
}