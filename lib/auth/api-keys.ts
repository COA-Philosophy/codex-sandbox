// path: lib/auth/api-keys.ts
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

// 型定義
export type Scope = 'archive:write' | 'archive:read' | 'board:read' | 'board:write' | 'logs:write'

export interface ApiKeyConfig {
  [key: string]: Scope[]
}

export interface ApiKeyData {
  id: string
  scopes: string[]
  projects: string[]
  name: string
}

export interface AuthResult {
  valid: boolean
  scopes: Scope[]
  keyId?: string
  projects?: string[]
  source: 'db' | 'env' | 'dev'
}

/**
 * ENV管理型APIキー設定取得
 */
function getApiKeyConfig(): ApiKeyConfig | null {
  const configJson = process.env.MCP_API_KEYS_JSON
  console.log("[debug] MCP_API_KEYS_JSON:", configJson)
  
  if (!configJson) {
    console.log("[debug] MCP_API_KEYS_JSON is empty or undefined")
    return null
  }
  
  try {
    const parsed = JSON.parse(configJson)
    console.log("[debug] ENV API keys parsed successfully:", Object.keys(parsed))
    return parsed
  } catch (error) {
    console.error('[orchestra] Invalid MCP_API_KEYS_JSON format:', error)
    return null
  }
}

/**
 * DB管理型APIキー検証
 */
async function lookupApiKey(presentedKey: string | null): Promise<ApiKeyData | null> {
  if (!presentedKey) return null
  
  const pepper = process.env.MCP_API_PEPPER
  if (!pepper) {
    console.error('[orchestra] MCP_API_PEPPER not configured for DB keys')
    return null
  }
  
  try {
    const keyHash = crypto
      .createHmac('sha256', pepper)
      .update(presentedKey)
      .digest('base64')
    
    const { data, error } = await supabase
      .from('mcp_api_keys')
      .select('id, scopes, projects, name, last_used_at, expires_at')
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .single()
      
    if (error || !data) {
      console.debug('[orchestra] DB API key lookup failed:', error?.message || 'not found')
      return null
    }
    
    // 有効期限チェック
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      console.warn('[orchestra] DB API key expired:', data.name)
      return null
    }
    
    // 最終使用日時更新（非同期・エラー無視）
    supabase
      .from('mcp_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id)
      .then(({ error }) => {
        if (error) {
          console.debug('[orchestra] Failed to update last_used_at:', error.message)
        }
      })
    
    console.debug('[orchestra] DB API key validated:', { 
      id: data.id, 
      name: data.name,
      scopeCount: data.scopes?.length || 0 
    })
    
    return {
      id: data.id,
      scopes: data.scopes || [],
      projects: data.projects || [],
      name: data.name
    }
  } catch (error: any) {
    console.error('[orchestra] DB API key lookup error:', error.message)
    return null
  }
}

/**
 * APIキー検証（ENV優先・DB fallback）
 */
export async function validateApiKey(apiKey: string | null): Promise<AuthResult> {
  const requireApiKey = process.env.MCP_REQUIRE_API_KEY === 'true'
  const dbKeysEnabled = process.env.MCP_DB_KEYS_ENABLED === 'true'
  
  console.log("[debug] API key validation started:", {
    hasApiKey: !!apiKey,
    requireApiKey,
    dbKeysEnabled
  })
  
  // 開発モード：APIキー要求無効時は全権限
  if (!requireApiKey) {
    console.log("[debug] Development mode: API key not required")
    return { 
      valid: true, 
      scopes: ['archive:write', 'archive:read', 'board:read', 'board:write', 'logs:write'],
      projects: ['default'],
      source: 'dev'
    }
  }
  
  // APIキー未提供
  if (!apiKey) {
    console.log("[debug] No API key provided")
    return { valid: false, scopes: [], source: 'env' }
  }
  
  // ENV管理型APIキー優先チェック
  const config = getApiKeyConfig()
  if (config && config[apiKey]) {
    console.log("[debug] ENV API key found:", { 
      key: apiKey,
      scopeCount: config[apiKey].length 
    })
    
    return { 
      valid: true, 
      scopes: config[apiKey],
      projects: ['default'],
      source: 'env'
    }
  }
  
  console.log("[debug] ENV key not found, trying DB lookup")
  
  // DB管理型APIキー fallback
  if (dbKeysEnabled) {
    const keyData = await lookupApiKey(apiKey)
    if (keyData) {
      return {
        valid: true,
        scopes: keyData.scopes as Scope[],
        keyId: keyData.id,
        projects: keyData.projects,
        source: 'db'
      }
    }
  }
  
  console.log("[debug] No valid API key found")
  return { valid: false, scopes: [], source: 'env' }
}

/**
 * スコープ権限チェック
 */
export function hasRequiredScope(scopes: Scope[], requiredScope: Scope): boolean {
  return scopes.includes(requiredScope)
}

/**
 * ツール別必要スコープ取得
 */
export function getRequiredScope(tool: string): Scope | null {
  switch (tool) {
    case 'archive.create':
      return 'archive:write'
    case 'archive.list':
      return 'archive:read'
    case 'board.list':
      return 'board:read'
    case 'board.update':
      return 'board:write'
    case 'logs.write':
      return 'logs:write'
    default:
      return null
  }
}