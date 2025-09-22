// path: app/api/tools/call/route.ts
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { 
  auditLog, 
  generateRequestId, 
  checkIdempotency, 
  saveIdempotencyResponse,
  type LogContext 
} from '@/lib/logging/orchestra'
import { validateApiKey, hasRequiredScope, getRequiredScope, type Scope } from '@/lib/auth/api-keys'
import { checkRateLimit, createRateLimitResponse, addRateLimitHeaders } from '@/lib/rate-limit/checker'
import { executeToolHandler } from '@/lib/tools/handlers'

interface ToolCallRequest {
  tool: string
  args?: Record<string, any>
  projectId: string // 必須化
}

/**
 * 統一エラーレスポンス作成
 */
function createErrorResponse(
  code: string, 
  message: string, 
  requestId: string,
  status: number = 500
): NextResponse {
  return NextResponse.json({
    error: {
      code,
      message,
      requestId,
      timestamp: new Date().toISOString()
    }
  }, { status })
}

/**
 * 統一成功レスポンス作成
 */
function createSuccessResponse(
  tool: string,
  result: any,
  requestId: string
): NextResponse {
  return NextResponse.json({
    success: true,
    tool,
    result,
    requestId,
    metadata: {
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  }, { status: 200 })
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId()
  const startTime = Date.now()
  
  // ヘッダー抽出
  const apiKey = req.headers.get('x-api-key')
  const agentId = req.headers.get('x-agent-id') ?? 'unknown'
  const sessionId = req.headers.get('x-session-id') ?? 'unknown'
  const idempotencyKey = req.headers.get('x-idempotency-key')

  const logContext: LogContext = {
    requestId,
    agentId,
    sessionId
  }

  try {
    await auditLog('info', 'MCP Tools実行開始', {
      ...logContext,
      hasApiKey: !!apiKey,
      hasIdempotencyKey: !!idempotencyKey,
      stage: 5
    })

    // Step 1: APIキー検証
    const { valid, scopes, keyId, projects, source } = await validateApiKey(apiKey)
    
    if (!valid) {
      await auditLog('error', 'APIキー認証失敗', {
        ...logContext,
        hasApiKey: !!apiKey,
        requireApiKey: process.env.MCP_REQUIRE_API_KEY === 'true',
        dbKeysEnabled: process.env.MCP_DB_KEYS_ENABLED === 'true'
      })
      return createErrorResponse('UNAUTHORIZED', 'Invalid or missing API key', requestId, 401)
    }

    await auditLog('info', 'APIキー認証成功', {
      ...logContext,
      scopeCount: scopes.length,
      scopes: scopes.join(','),
      keySource: source,
      keyId: keyId || 'env-managed',
      projectCount: projects?.length || 0
    })

    // Step 2: リクエストボディ解析
    const { tool, args, projectId }: ToolCallRequest = await req.json()
    
    if (!tool) {
      await auditLog('error', 'ツール名未指定', logContext)
      return createErrorResponse('MISSING_TOOL', 'Tool name is required', requestId, 400)
    }

    if (!projectId) {
      await auditLog('error', 'プロジェクトID未指定', logContext)
      return createErrorResponse('MISSING_PROJECT_ID', 'Project ID is required', requestId, 400)
    }

    logContext.tool = tool
    logContext.args = args
    logContext.projectId = projectId

    // Step 3: スコープ権限チェック
    const requiredScope = getRequiredScope(tool)
    
    if (!requiredScope) {
      await auditLog('error', '未知のツール', { ...logContext, tool })
      return createErrorResponse('UNKNOWN_TOOL', `Tool '${tool}' is not available`, requestId, 400)
    }

    if (!hasRequiredScope(scopes, requiredScope)) {
      await auditLog('error', 'スコープ権限不足', {
        ...logContext,
        requiredScope,
        availableScopes: scopes.join(','),
        keySource: source
      })
      return createErrorResponse('FORBIDDEN', `Insufficient scope for tool '${tool}'. Required: ${requiredScope}`, requestId, 403)
    }

    // Step 4: プロジェクト権限チェック（全認証方式で必須）
    if (!projects || !projects.includes(projectId)) {
      await auditLog('error', 'プロジェクト権限不足', {
        ...logContext,
        requestedProject: projectId,
        allowedProjects: projects?.join(',') || 'none',
        keySource: source
      })
      return createErrorResponse('FORBIDDEN_PROJECT', `Access denied for project ${projectId}`, requestId, 403)
    }

    // Step 5: レート制限チェック
    // ENV管理型キー用のUUID形式識別子生成
    const generateEnvUUID = (key: string): string => {
      const hash = crypto.createHash('sha256').update(key).digest('hex')
      return [
        hash.substring(0, 8),
        hash.substring(8, 12),
        '4' + hash.substring(13, 16), // version 4
        '8' + hash.substring(17, 20), // variant bits
        hash.substring(20, 32)
      ].join('-')
    }

    const rateLimitKeyId = keyId || generateEnvUUID(apiKey || 'anonymous')
    
    const rateLimitResult = await checkRateLimit(rateLimitKeyId, tool, valid)
    
    if (!rateLimitResult.allowed) {
      await auditLog('warn', 'レート制限超過', {
        ...logContext,
        rateLimitExceeded: true,
        remaining: rateLimitResult.remaining,
        limit: rateLimitResult.limit,
        resetTime: rateLimitResult.resetTime.toISOString(),
        keySource: source
      })
      return createRateLimitResponse(requestId, rateLimitResult)
    }

    await auditLog('info', `ツール実行準備: ${tool}`, {
      ...logContext,
      requiredScope,
      keySource: source,
      rateLimitRemaining: rateLimitResult.remaining,
      rateLimitLimit: rateLimitResult.limit
    })

    // Step 6: 冪等性チェック
    if (idempotencyKey) {
      const cachedResponse = await checkIdempotency(tool, idempotencyKey)
      
      if (cachedResponse) {
        await auditLog('info', '冪等性キャッシュヒット', {
          ...logContext,
          idempotencyKey,
          cached: true
        })
        
        return NextResponse.json({
          ...cachedResponse,
          requestId,
          metadata: {
            ...cachedResponse.metadata,
            cached: true,
            originalTimestamp: cachedResponse.metadata?.timestamp,
            timestamp: new Date().toISOString()
          }
        }, { status: 200 })
      }
    }

    // Step 7: ツール実行（argsにprojectIdを注入）
    const enhancedArgs = { ...args, projectId }
    const executionResult = await executeToolHandler(tool, enhancedArgs, logContext)
    
    if (!executionResult.success) {
      return createErrorResponse(
        executionResult.error!.code,
        executionResult.error!.message,
        requestId,
        executionResult.error!.code === 'INVALID_ARGS' ? 400 : 500
      )
    }
    
    const duration = Date.now() - startTime
    
    await auditLog('info', 'ツール実行成功', {
      ...logContext,
      duration,
      resultType: typeof executionResult.data,
      keySource: source,
      rateLimitRemaining: rateLimitResult.remaining
    })

    const response = createSuccessResponse(tool, executionResult.data, requestId)
    
    // レート制限ヘッダー追加
    addRateLimitHeaders(response, rateLimitResult)
    
    // 冪等性レスポンス保存
    if (idempotencyKey) {
      const responseData = await response.clone().json()
      await saveIdempotencyResponse(tool, idempotencyKey, responseData)
      
      await auditLog('debug', '冪等性レスポンス保存', {
        ...logContext,
        idempotencyKey
      })
    }
    
    return response
    
  } catch (error: any) {
    const duration = Date.now() - startTime
    
    await auditLog('error', 'ツール実行エラー', {
      ...logContext,
      error: error.message,
      duration
    })
    
    return createErrorResponse('TOOL_EXECUTION_FAILED', error.message || 'Unknown error occurred', requestId)
  }
}