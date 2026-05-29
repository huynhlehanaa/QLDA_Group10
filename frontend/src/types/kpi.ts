export interface KpiBreakdownItem {
  criteria_id: string
  name: string
  weight: number
  score: number
  weighted_score: number
  formula_type: string
}

export interface KpiMonthlyResult {
  user_id: string
  full_name: string
  year: number
  month: number
  total_score: number
  grade: string
  target_score: number
  breakdown: KpiBreakdownItem[]
}

export interface KpiHistoryItem {
  year: number
  month: number
  total_score: number
}

export interface KpiCompareResponse {
  my_score: number
  dept_average: number
  company_average?: number | null
}

export interface KpiTargetUpsertPayload {
  year: number
  month: number
  target_score: number
}

export interface KpiTargetResponse {
  user_id: string
  year: number
  month: number
  target_score: number
}

export interface KpiAppealCreatePayload {
  year: number
  month: number
  criteria_name: string
  current_score: number
  proposed_score: number
  reason: string
}

export interface KpiAppealItem {
  id: string
  year: number
  month: number
  criteria_name: string
  current_score: number
  proposed_score: number
  reason: string
  status: string
  response?: string | null
  adjusted_score?: number | null
  created_at: string
}