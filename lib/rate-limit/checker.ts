// path: lib/rate-limit/checker.ts
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

// Service Roleクライアント
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

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: Date
  limit: number
}

/**
 * ENV管理型キー用の一意識別子生成
 */
function generateEnvKeyIdentifier(apiKey: string): string {
  const hash = crypto.createHash('sha256').update(apiKey).digest('hex')
  return `env-${hash.substring(0, 32)}`
}

/**
 * レート制限チェック
 */
export async function checkRateLimit(
  keyId: string,
  tool: string,
  isAuthenticated: boolean
): Promise<RateLimitResult> {
  const enabled = process.env.MCP_RATE_LIMIT_ENABLED === 'true'
  const perMinute = Number(process.env.MCP_RATE_LIMIT_PER_MIN || 60)
  const anonPerMinute = Number(process.env.MCP_RATE_LIMIT_ANON_PER_MIN || 10)
  
  console.log('[DEBUG] Rate limit environment:', {
    enabled,
    keyId,
    tool,
    isAuthenticated
  })

  if (!enabled) {
    console.log('[DEBUG] Rate limiting disabled')
    return {
      allowed: true,
      remaining: perMinute,
      resetTime: new Date(Date.now() + 60000),
      limit: perMinute
    }
  }

  const limit = isAuthenticated ? perMinute : anonPerMinute
  
  console.log('[DEBUG] Rate limit params:', {
    keyId,
    tool,
    limit,
    isAuthenticated
  })

  const resetTime = new Date()
  resetTime.setSeconds(0, 0)
  resetTime.setMinutes(resetTime.getMinutes() + 1)

  try {
    const { data, error } = await supabase.rpc('increment_rate_limit', {
      p_key_id: keyId,
      p_tool: tool,
      p_limit: limit
    })

    console.log('[DEBUG] SQL RPC raw response:', {
      data,
      error,
      isArray: Array.isArray(data),
      arrayLength: Array.isArray(data) ? data.length : 'not-array',
      firstElement: Array.isArray(data) && data.length > 0 ? data[0] : 'no-first-element'
    })

    if (error) {
      console.error('[orchestra] Rate limit check failed:', error.message)
      console.error('[orchestra] Rate limit error details:', error)
      
      // フェイルオープン: エラー時は通す
      return {
        allowed: true,
        remaining: limit,
        resetTime,
        limit
      }
    }

    // 配列形式の戻り値から最初の要素を取得
    const result = Array.isArray(data) && data.length > 0 ? data[0] : null

    if (!result) {
      console.error('[orchestra] Unexpected SQL RPC response format:', data)
      // フェイルオープン: 予期しない形式の場合は通す
      return { allowed: true, remaining: limit, resetTime, limit }
    }

    const allowedFromSql = Boolean(result.allowed)
    const currentCount = Number(result.current_count || 0)
    const remaining = Math.max(0, limit - currentCount)

    console.log('[DEBUG] Rate limit calculated result:', {
      allowedFromSql,
      allowedRaw: result.allowed,
      currentCount,
      currentCountRaw: result.current_count,
      remaining,
      limit,
      resetTime: resetTime.toISOString()
    })

    console.log('[DEBUG] Final rate limit decision:', {
      will_allow: allowedFromSql,
      will_remaining: remaining
    })

    return {
      allowed: allowedFromSql,
      remaining,
      resetTime,
      limit
    }

  } catch (error: any) {
    console.error('[orchestra] Rate limit check error:', error.message)
    
    // フェイルオープン: 例外時は通す
    return {
      allowed: true,
      remaining: limit,
      resetTime,
      limit
    }
  }
}

/**
 * レート制限エラーレスポンス作成
 */
export function createRateLimitResponse(requestId: string, rateLimitResult: RateLimitResult) {
  return new Response(JSON.stringify({
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Rate limit exceeded. Please try again later.',
      requestId,
      timestamp: new Date().toISOString(),
      rateLimit: {
        limit: rateLimitResult.limit,
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime.toISOString()
      }
    }
  }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'X-RateLimit-Limit': rateLimitResult.limit.toString(),
      'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      'X-RateLimit-Reset': Math.floor(rateLimitResult.resetTime.getTime() / 1000).toString()
    }
  })
}

/**
 * レート制限ヘッダー追加
 */
export function addRateLimitHeaders(response: Response, rateLimitResult: RateLimitResult): void {
  response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString())
  response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
  response.headers.set('X-RateLimit-Reset', Math.floor(rateLimitResult.resetTime.getTime() / 1000).toString())
}