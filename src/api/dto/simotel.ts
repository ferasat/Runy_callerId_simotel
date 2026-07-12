/** DTOs mirror Simotel v4 request/response payloads. */

export interface OriginateDto {
  caller: string
  callee: string
  context?: string
  caller_id?: string
  trunk_name?: string
  timeout?: string
}

export interface PaginationDto {
  start: number
  count: number
  sorting?: Record<string, 'asc' | 'desc' | string>
}

export interface CdrSearchDto {
  conditions?: Record<string, string>
  date_range?: { from: string; to: string }
  pagination?: PaginationDto
  alike?: string
}

export interface QueueSearchDto {
  alike?: string
  conditions?: { name?: string; number?: string }
}

export interface UserSearchDto {
  status?: string
  alike?: number | string
  conditions?: { name?: string; number?: string; mapped?: string }
}

export interface QueueAgentDto {
  queue: string
  agent: string
}

export interface RecordingDownloadDto {
  file: string
}

export interface SimotelListResponseDto<T = unknown> {
  success?: number | boolean
  message?: string
  data?: T[]
  total?: number
}
