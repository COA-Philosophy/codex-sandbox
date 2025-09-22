// path: app/api/tools/list/route.ts
import { NextResponse } from 'next/server'

interface MCPTool {
  name: string
  description: string
  args_schema: {
    type: 'object'
    required?: string[]
    properties: Record<string, any>
  }
}

export async function GET() {
  console.debug('[orchestra] GET /api/tools/list - MCP Tools一覧取得')

  const tools: MCPTool[] = [
    {
      name: 'archive.create',
      description: 'Create a new project archive snapshot with tasks and handoffs',
      args_schema: {
        type: 'object',
        required: ['title', 'structureSnapshot'],
        properties: {
          title: {
            type: 'string',
            description: 'Archive title/name'
          },
          structureSnapshot: {
            type: 'object',
            description: 'Board structure with tasks and handoffs',
            properties: {
              tasks: {
                type: 'array',
                description: 'List of tasks in the board'
              },
              handoffs: {
                type: 'array',
                description: 'List of handoffs between team members'
              }
            }
          }
        }
      }
    },
    {
      name: 'archive.list',
      description: 'Get list of project archives with optional filtering',
      args_schema: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of archives to return (default: 10, max: 100)',
            default: 10
          },
          projectId: {
            type: 'string',
            description: 'Filter archives by project ID'
          }
        }
      }
    },
    {
      name: 'board.list',
      description: 'Get current board state and task list',
      args_schema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'board.update',
      description: 'Update board item properties',
      args_schema: {
        type: 'object',
        required: ['id', 'patch'],
        properties: {
          id: {
            type: 'string',
            description: 'Board item ID to update'
          },
          patch: {
            type: 'object',
            description: 'Partial update object with fields to modify',
            properties: {
              title: {
                type: 'string',
                description: 'Updated title'
              },
              phase: {
                type: 'string',
                description: 'Updated phase'
              },
              owner: {
                type: 'string',
                description: 'Updated owner'
              },
              tags: {
                type: 'array',
                description: 'Updated tags'
              }
            }
          }
        }
      }
    },
    {
      name: 'logs.write',
      description: 'Write log entry for AI decision tracking and quality audit',
      args_schema: {
        type: 'object',
        required: ['level', 'message'],
        properties: {
          level: {
            type: 'string',
            enum: ['debug', 'info', 'warn', 'error'],
            description: 'Log level'
          },
          message: {
            type: 'string',
            description: 'Log message'
          },
          context: {
            type: 'object',
            description: 'Additional context data'
          }
        }
      }
    }
  ]
 
  const response = {
    object: 'tool_list',
    created: Math.floor(Date.now() / 1000),
    data: tools,
    metadata: {
      version: '1.0.0',
      environment: 'v2',
      provider: 'StructureBoard',
      stage: 4,
      features: ['api_key_auth', 'scope_control', 'idempotency', 'audit_logs']
    }
  }

  console.debug('[orchestra] Tools一覧レスポンス:', {
    toolCount: tools.length,
    version: response.metadata.version,
    stage: response.metadata.stage
  })

  return NextResponse.json(response, { status: 200 })
}