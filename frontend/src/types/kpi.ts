// KPI-related types aligned with backend API contract

export interface KPICriteria {
  id: string;
  org_id: string;
  name: string;
  description?: string | null;
  weight: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface KPIScore {
  id: string;
  user_id: string;
  criteria_id: string;
  month: number;
  year: number;
  score: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface KPISummary {
  user_id: string;
  current_month: number;
  current_year: number;
  total_score: number;
  average_score: number;
  target_score: number;
  status: 'on_track' | 'at_risk' | 'below_target';
  scores: KPIScore[];
  criteria: KPICriteria[];
}

export interface KPIBreakdown {
  criteria_id: string;
  criteria_name: string;
  weight: number;
  current_score: number;
  previous_score?: number;
  trend: 'up' | 'down' | 'stable';
  change_percent: number;
}

export interface KPIDashboard {
  summary: KPISummary;
  breakdown: KPIBreakdown[];
  historical_scores?: {
    month: number;
    year: number;
    total_score: number;
  }[];
}
