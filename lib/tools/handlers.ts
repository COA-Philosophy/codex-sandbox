// path: lib/tools/handlers.ts
import { createClient } from '@supabase/supabase-js'
import { auditLog, type LogContext } from '@/lib/logging/orchestra'

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

export interface ToolExecutionResult {
  success: boolean
  data?: any
  error?: {
    code: string
    message: string
  }
}

/**
 * archive.create ツールハンドラー
 */
export async function handleArchiveCreate(
  args: Record<string, any>,
  logContext: LogContext
): Promise<ToolExecutionResult> {
  const { title, structureSnapshot } = args ?? {}
  
  if (!title || !structureSnapshot) {
    await auditLog('error', 'archive.create 引数不足', {
      ...logContext,
      hasTitle: !!title,
      hasSnapshot: !!structureSnapshot
    })
    return {
      success: false,
      error: {
        code: 'INVALID_ARGS',
        message: 'title and structureSnapshot are required'
      }
    }
  }
  
  await auditLog('info', 'Archive作成開始', {
    ...logContext,
    title,
    tasksCount: structureSnapshot.tasks?.length || 0
  })

  const { data, error } = await supabase
    .from('v2_project_archives')
    .insert({
      title,
      structure_snapshot: structureSnapshot,
      user_id: null  // TODO: 認証システム実装時に auth.uid() に変更
    })
    .select('id, title, created_at')
    .single()
    
  if (error) {
    await auditLog('error', 'Archive作成失敗', {
      ...logContext,
      error: error.message,
      errorCode: error.code
    })
    return {
      success: false,
      error: {
        code: 'ARCHIVE_CREATE_FAILED',
        message: error.message
      }
    }
  }

  return {
    success: true,
    data: {
      id: data.id,
      title: data.title,
      created_at: data.created_at,
      message: 'Archive created successfully'
    }
  }
}

/**
 * archive.list ツールハンドラー
 */
export async function handleArchiveList(
  args: Record<string, any>,
  logContext: LogContext
): Promise<ToolExecutionResult> {
  const { limit = 10 } = args ?? {}
  
  await auditLog('info', 'Archive一覧取得開始', {
    ...logContext,
    limit
  })

  const { data, error } = await supabase
    .from('v2_project_archives')
    .select('id, title, structure_snapshot, created_at')
    .order('created_at', { ascending: false })
    .limit(Math.min(limit, 100))
    
  if (error) {
    await auditLog('error', 'Archive一覧取得失敗', {
      ...logContext,
      error: error.message
    })
    return {
      success: false,
      error: {
        code: 'ARCHIVE_LIST_FAILED',
        message: error.message
      }
    }
  }

  return {
    success: true,
    data: {
      archives: data || [],
      total: data?.length || 0,
      limit
    }
  }
}

/**
 * board.list ツールハンドラー
 */
export async function handleBoardList(
  args: Record<string, any>,
  logContext: LogContext
): Promise<ToolExecutionResult> {
  await auditLog('info', 'Board一覧取得開始', logContext)

  const { data, error } = await supabase
    .from('v2_project_archives')
    .select('id, title, structure_snapshot, created_at')
    .order('created_at', { ascending: false })
    .limit(10)
    
  if (error) {
    await auditLog('error', 'Board一覧取得失敗', {
      ...logContext,
      error: error.message
    })
    return {
      success: false,
      error: {
        code: 'BOARD_LIST_FAILED',
        message: error.message
      }
    }
  }

  return {
    success: true,
    data: {
      archives: data || [],
      count: data?.length || 0,
      latest: data?.[0] || null
    }
  }
}

/**
 * board.update ツールハンドラー
 */
export async function handleBoardUpdate(
  args: Record<string, any>,
  logContext: LogContext
): Promise<ToolExecutionResult> {
  const { id, patch } = args ?? {}
  
  if (!id || !patch) {
    await auditLog('error', 'board.update 引数不足', {
      ...logContext,
      hasId: !!id,
      hasPatch: !!patch
    })
    return {
      success: false,
      error: {
        code: 'INVALID_ARGS',
        message: 'id and patch are required'
      }
    }
  }

  await auditLog('info', 'Board更新開始', {
    ...logContext,
    id,
    patchKeys: Object.keys(patch).join(',')
  })

  const { data, error } = await supabase
    .from('v2_project_archives')
    .update(patch)
    .eq('id', id)
    .select('id, title, created_at, updated_at')
    .single()

  if (error) {
    await auditLog('error', 'Board更新失敗', {
      ...logContext,
      error: error.message,
      errorCode: error.code
    })
    return {
      success: false,
      error: {
        code: 'BOARD_UPDATE_FAILED',
        message: error.message
      }
    }
  }

  return {
    success: true,
    data: {
      updated: data,
      message: 'Board updated successfully'
    }
  }
}

/**
 * logs.write ツールハンドラー
 */
export async function handleLogsWrite(
  args: Record<string, any>,
  logContext: LogContext
): Promise<ToolExecutionResult> {
  const { level, message, context } = args ?? {}
  
  if (!level || !message) {
    await auditLog('error', 'logs.write 引数不足', {
      ...logContext,
      hasLevel: !!level,
      hasMessage: !!message
    })
    return {
      success: false,
      error: {
        code: 'INVALID_ARGS',
        message: 'level and message are required'
      }
    }
  }

  await auditLog(level, message, {
    ...logContext,
    externalWrite: true,
    ...context
  })

  return {
    success: true,
    data: {
      id: logContext.requestId,
      level,
      message,
      context,
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * ツール実行の統一エントリポイント
 */
export async function executeToolHandler(
  tool: string,
  args: Record<string, any>,
  logContext: LogContext
): Promise<ToolExecutionResult> {
  switch (tool) {
    case 'archive.create':
      return handleArchiveCreate(args, logContext)
    case 'archive.list':
      return handleArchiveList(args, logContext)
    case 'board.list':
      return handleBoardList(args, logContext)
    case 'board.update':
      return handleBoardUpdate(args, logContext)
    case 'logs.write':
      return handleLogsWrite(args, logContext)
    default:
      await auditLog('error', '未知のツール', { ...logContext, tool })
      return {
        success: false,
        error: {
          code: 'UNKNOWN_TOOL',
          message: `Tool '${tool}' is not available`
        }
      }
  }
}