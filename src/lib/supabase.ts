import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export type User = {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  user_type: 'worker' | 'client' | 'admin';
  phone?: string;
  country?: string;
  city?: string;
  bio?: string;
  skills: string[];
  profile_completed: boolean;
  email_verified: boolean;
  onboarding_completed: boolean;
  referral_code: string;
  referred_by?: string;
  is_activated: boolean;
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: string;
  title: string;
  description?: string;
  category: string;
  task_type: 'annotation' | 'moderation' | 'coding' | 'survey' | 'testing' | 'transcription' | 'translation';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  payout_amount: number;
  payout_currency: string;
  unlock_fee: number;
  estimated_time_minutes: number;
  instructions?: string;
  requirements: Record<string, unknown>;
  skills_required: string[];
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  total_slots: number;
  slots_filled: number;
  quality_threshold: number;
  created_by?: string;
  poster_name?: string;
  poster_location?: string;
  created_at: string;
  updated_at: string;
};

export type UserTask = {
  id: string;
  user_id: string;
  task_id: string;
  task: Task;
  status: 'assigned' | 'in_progress' | 'submitted' | 'approved' | 'rejected' | 'disputed';
  started_at: string;
  submitted_at?: string;
  reviewed_at?: string;
  completed_at?: string;
  quality_score?: number;
  earnings?: number;
  feedback?: string;
  submission_data: Record<string, unknown>;
};

export type Wallet = {
  id: string;
  user_id: string;
  total_earnings: number;
  pending_earnings: number;
  available_balance: number;
  total_withdrawn: number;
  withdrawal_count: number;
  currency: string;
  mpesa_phone?: string;
  created_at: string;
  updated_at: string;
};

export type Withdrawal = {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  mpesa_phone: string;
  mpesa_transaction_id?: string;
  failure_reason?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
};

export type Skill = {
  id: string;
  name: string;
  category: string;
  description?: string;
  icon?: string;
  difficulty: string;
  learner_count: number;
  growth_rate: number;
};

export type UserSkill = {
  id: string;
  user_id: string;
  skill_id: string;
  skill: Skill;
  proficiency_level: number;
  progress: number;
  started_at: string;
  completed_at?: string;
  certificate_url?: string;
};

export type Referral = {
  id: string;
  referrer_id: string;
  referee_id: string;
  referee?: User;
  status: 'pending' | 'qualified' | 'rewarded' | 'cancelled';
  reward_amount: number;
  reward_status: 'pending' | 'paid' | 'cancelled';
  qualified_at?: string;
  rewarded_at?: string;
  created_at: string;
};

export type ActivityLog = {
  id: string;
  user_id?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  metadata: Record<string, unknown>;
  created_at: string;
};
