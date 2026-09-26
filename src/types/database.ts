export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at' | 'referral_code'> & {
          referral_code?: string;
        };
        Update: Partial<Profile>;
      };
      tasks: {
        Row: Task;
        Insert: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'slots_filled'>;
        Update: Partial<Task>;
      };
      user_tasks: {
        Row: UserTask;
        Insert: Omit<UserTask, 'id' | 'started_at'>;
        Update: Partial<UserTask>;
      };
      wallets: {
        Row: Wallet;
        Insert: Omit<Wallet, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Wallet>;
      };
      withdrawals: {
        Row: Withdrawal;
        Insert: Omit<Withdrawal, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Withdrawal>;
      };
      skills: {
        Row: Skill;
        Insert: Omit<Skill, 'id' | 'created_at'>;
        Update: Partial<Skill>;
      };
      user_skills: {
        Row: UserSkill;
        Insert: Omit<UserSkill, 'id' | 'started_at'>;
        Update: Partial<UserSkill>;
      };
      referrals: {
        Row: Referral;
        Insert: Omit<Referral, 'id' | 'created_at'>;
        Update: Partial<Referral>;
      };
      activity_logs: {
        Row: ActivityLog;
        Insert: Omit<ActivityLog, 'id' | 'created_at'>;
        Update: Partial<ActivityLog>;
      };
      courses: {
        Row: Course;
        Insert: Omit<Course, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Course>;
      };
      course_modules: {
        Row: CourseModule;
        Insert: Omit<CourseModule, 'id' | 'created_at'>;
        Update: Partial<CourseModule>;
      };
      course_lessons: {
        Row: CourseLesson;
        Insert: Omit<CourseLesson, 'id' | 'created_at'>;
        Update: Partial<CourseLesson>;
      };
      course_enrollments: {
        Row: CourseEnrollment;
        Insert: Omit<CourseEnrollment, 'id' | 'started_at'>;
        Update: Partial<CourseEnrollment>;
      };
      quizzes: {
        Row: Quiz;
        Insert: Omit<Quiz, 'id' | 'created_at'>;
        Update: Partial<Quiz>;
      };
      quiz_attempts: {
        Row: QuizAttempt;
        Insert: Omit<QuizAttempt, 'id' | 'attempted_at'>;
        Update: Partial<QuizAttempt>;
      };
      certificates: {
        Row: Certificate;
        Insert: Omit<Certificate, 'id' | 'issued_at'>;
        Update: Partial<Certificate>;
      };
      skill_badges: {
        Row: SkillBadge;
        Insert: Omit<SkillBadge, 'id' | 'earned_at'>;
        Update: Partial<SkillBadge>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_type: 'worker' | 'client' | 'admin';
      task_type: 'annotation' | 'moderation' | 'coding' | 'survey' | 'testing' | 'transcription' | 'translation';
      task_status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
      difficulty: 'beginner' | 'intermediate' | 'advanced';
      user_task_status: 'assigned' | 'in_progress' | 'submitted' | 'approved' | 'rejected' | 'disputed';
      withdrawal_status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
      referral_status: 'pending' | 'qualified' | 'rewarded' | 'cancelled';
      reward_status: 'pending' | 'paid' | 'cancelled';
    };
  };
}

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  user_type: 'worker' | 'client' | 'admin';
  phone: string | null;
  country: string | null;
  city: string | null;
  bio: string | null;
  skills: string[];
  profile_completed: boolean;
  email_verified: boolean;
  onboarding_completed: boolean;
  referral_code: string;
  referred_by: string | null;
  is_activated: boolean;
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  task_type: 'annotation' | 'moderation' | 'coding' | 'survey' | 'testing' | 'transcription' | 'translation';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  payout_amount: number;
  payout_currency: string;
  unlock_fee: number;
  estimated_time_minutes: number;
  instructions: string | null;
  requirements: Json;
  skills_required: string[];
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  total_slots: number;
  slots_filled: number;
  quality_threshold: number;
  created_by: string | null;
  poster_name: string | null;
  poster_location: string | null;
  poster_avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type UserTask = {
  id: string;
  user_id: string;
  task_id: string;
  status: 'assigned' | 'in_progress' | 'submitted' | 'approved' | 'rejected' | 'disputed';
  payment_status: 'pending' | 'processing' | 'waiting_payment' | 'paid' | null;
  started_at: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  accepted_at: string | null;
  payment_processed_at: string | null;
  paid_at: string | null;
  completed_at: string | null;
  quality_score: number | null;
  earnings: number | null;
  feedback: string | null;
  submission_data: Json;
  reviewed_by: string | null;
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
  mpesa_phone: string | null;
  locked_earnings: number;
  last_earning_time: string | null;
  created_at: string;
  updated_at: string;
};

export type Withdrawal = {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  mpesa_phone: string | null;
  mpesa_destination_type: 'phone' | 'till';
  mpesa_till_number: string | null;
  withdrawal_method: 'mpesa' | 'bank';
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_branch_code: string | null;
  mpesa_transaction_id: string | null;
  failure_reason: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Skill = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  icon: string | null;
  difficulty: string;
  learner_count: number;
  growth_rate: number;
  created_at: string;
};

export type UserSkill = {
  id: string;
  user_id: string;
  skill_id: string;
  proficiency_level: number;
  progress: number;
  started_at: string;
  completed_at: string | null;
  certificate_url: string | null;
};

export type Referral = {
  id: string;
  referrer_id: string;
  referee_id: string;
  status: 'pending' | 'qualified' | 'rewarded' | 'cancelled';
  reward_amount: number;
  reward_status: 'pending' | 'paid' | 'cancelled';
  qualified_at: string | null;
  rewarded_at: string | null;
  created_at: string;
};

export type ActivityLog = {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Json;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

// Course types
export type Course = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: 'AI Prompt Engineering' | 'Data Entry' | 'Virtual Assistance' | 'Content Writing' | 'Social Media Management' | 'Translation';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  thumbnail_url: string | null;
  duration_hours: number;
  lessons_count: number;
  enrolled_count: number;
  rating: number;
  rating_count: number;
  skills: string[];
  prerequisites: string[];
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type CourseModule = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  created_at: string;
};

export type CourseLesson = {
  id: string;
  module_id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  duration_minutes: number;
  order_index: number;
  has_quiz: boolean;
  created_at: string;
};

export type CourseEnrollment = {
  id: string;
  user_id: string;
  course_id: string;
  progress: number;
  completed_lessons: string[];
  started_at: string;
  completed_at: string | null;
  certificate_id: string | null;
};

export type Quiz = {
  id: string;
  lesson_id: string;
  question: string;
  options: Json;
  correct_answer: number;
  explanation: string | null;
  created_at: string;
};

export type QuizAttempt = {
  id: string;
  user_id: string;
  quiz_id: string;
  selected_answer: number | null;
  is_correct: boolean | null;
  attempted_at: string;
};

export type Certificate = {
  id: string;
  user_id: string;
  course_id: string;
  certificate_number: string;
  issued_at: string;
  downloadable_url: string | null;
};

export type SkillBadge = {
  id: string;
  user_id: string;
  skill_name: string;
  level: number;
  earned_at: string;
  icon: string | null;
  color: string | null;
};
