import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Task } from '../../types/database';
import TaskAgentChat from './TaskAgentChat';
import {
  Search,
  Filter,
  Briefcase,
  Clock,
  DollarSign,
  Star,
  X,
  Brain,
  FileText,
  Globe,
  BarChart3,
  BookOpen,
  MessageSquare,
  Users,
  CheckCircle2,
  AlertCircle,
  Zap,
  Lock,
  MapPin,
  Loader2,
  Smartphone,
  ShieldCheck,
  Receipt,
  Calendar,
  User,
  Building2,
  Hash,
  PartyPopper,
} from 'lucide-react';

const categoryMeta: Record<string, { icon: React.ReactElement; color: string; gradient: string }> = {
  'AI Training': { icon: <Brain className="w-5 h-5" />, color: 'text-purple-600', gradient: 'from-purple-500 to-indigo-600', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800' },
  'Data Entry': { icon: <FileText className="w-5 h-5" />, color: 'text-green-600', gradient: 'from-green-500 to-emerald-600', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800' },
  'Translation': { icon: <Globe className="w-5 h-5" />, color: 'text-teal-600', gradient: 'from-teal-500 to-cyan-600', bg: 'bg-teal-50 dark:bg-teal-900/20', border: 'border-teal-200 dark:border-teal-800' },
  'Research': { icon: <BarChart3 className="w-5 h-5" />, color: 'text-blue-600', gradient: 'from-blue-500 to-sky-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
  'Writing': { icon: <BookOpen className="w-5 h-5" />, color: 'text-amber-600', gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' },
  'Social Media': { icon: <MessageSquare className="w-5 h-5" />, color: 'text-pink-600', gradient: 'from-pink-500 to-rose-600', bg: 'bg-pink-50 dark:bg-pink-900/20', border: 'border-pink-200 dark:border-pink-800' },
};

const difficultyColors: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  intermediate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  advanced: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const countryFlags: Record<string, string> = {
  'Canada': '🇨🇦',
  'United States': '🇺🇸',
  'United Kingdom': '🇬🇧',
  'Germany': '🇩🇪',
  'Australia': '🇦🇺',
  'Netherlands': '🇳🇱',
  'France': '🇫🇷',
  'Singapore': '🇸🇬',
  'Japan': '🇯🇵',
  'South Korea': '🇰🇷',
  'Kenya': '🇰🇪',
  'Global': '🌍',
};

const getUnlockFeeForPayout = (payoutAmount: number) =>
  Math.min(250, Math.max(100, 100 + Math.round(Math.min(150, Math.max(0, payoutAmount)))));

export default function TaskMarketplace() {
  const { profile, wallet } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [budgetRange, setBudgetRange] = useState<[number, number] | null>(null);
  const [sortBy, setSortBy] = useState<'payout' | 'time' | 'difficulty'>('payout');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);
  const [unlockedTaskIds, setUnlockedTaskIds] = useState<Set<string>>(new Set());
  const [unlockingTaskId, setUnlockingTaskId] = useState<string | null>(null);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockPhone, setUnlockPhone] = useState('');
  const [unlockStatus, setUnlockStatus] = useState<'idle' | 'prompting' | 'waiting' | 'success' | 'failed'>('idle');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlockReceipt, setUnlockReceipt] = useState<{
    transactionCode: string;
    amount: number;
    userName: string;
    phone: string;
    paidAt: string;
  } | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    description: '',
    category: 'Writing',
    payout: '',
    deadline: '',
    requirements: '',
  });
  const [assignmentPosting, setAssignmentPosting] = useState(false);
  const [assignmentSuccess, setAssignmentSuccess] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getUnlockFee = (task: Task) => getUnlockFeeForPayout(Number(task.payout_amount));

  useEffect(() => {
    if (!profile?.id) {
      setUnlockedTaskIds(new Set());
      return;
    }
    loadUnlockedTasks();
  }, [profile?.id]);

  useEffect(() => {
    loadTasks();
  }, [selectedCategory, selectedDifficulty, budgetRange, sortBy]);

  const loadUnlockedTasks = async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from('unlocked_tasks')
      .select('task_id, mpesa_payments!inner(status)')
      .eq('user_id', profile.id);
    const confirmedUnlocks = (data || []).filter((row: { mpesa_payments: { status: string } }) => row.mpesa_payments.status === 'success');
    setUnlockedTaskIds(new Set(confirmedUnlocks.map((row: { task_id: string }) => row.task_id)));
  };

  const loadTasks = async () => {
    setLoading(true);

    let query = supabase
      .from('tasks')
      .select('*')
      .eq('status', 'active');

    if (selectedCategory) {
      query = query.eq('category', selectedCategory);
    }

    if (selectedDifficulty) {
      query = query.eq('difficulty', selectedDifficulty);
    }

    if (budgetRange) {
      query = query.gte('payout_amount', budgetRange[0]).lte('payout_amount', budgetRange[1]);
    }

    if (sortBy === 'payout') {
      query = query.order('payout_amount', { ascending: false });
    } else if (sortBy === 'time') {
      query = query.order('estimated_time_minutes', { ascending: true });
    } else {
      query = query.order('difficulty', { ascending: true });
    }

    const { data, error } = await query.limit(50);

    if (!error && data) {
      setTasks(data);
    }

    setLoading(false);
  };

  const filteredTasks = searchQuery
    ? tasks.filter(task =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tasks;

  const handleApplyTask = async (taskId: string) => {
    if (!profile?.id) {
      setApplyError('Please log in to apply for tasks');
      return;
    }

    if (!unlockedTaskIds.has(taskId)) {
      setUnlockingTaskId(taskId);
      setUnlockPhone(wallet?.mpesa_phone || '');
      setUnlockError(null);
      setUnlockStatus('idle');
      setShowUnlockModal(true);
      return;
    }

    setApplying(true);
    setApplyError(null);
    setApplySuccess(null);

    const { data: existing } = await supabase
      .from('user_tasks')
      .select('id')
      .eq('user_id', profile.id)
      .eq('task_id', taskId)
      .maybeSingle();

    if (existing) {
      setApplyError('You have already applied for this task');
      setApplying(false);
      return;
    }

    const { error } = await supabase.from('user_tasks').insert({
      user_id: profile.id,
      task_id: taskId,
      status: 'in_progress',
    });

    if (error) {
      if (error.code === '23505') {
        setApplyError('You have already applied for this task');
      } else {
        setApplyError('Failed to apply for task. Please try again.');
      }
    } else {
      setApplySuccess('Successfully applied! Check My Tasks to start working.');
      setSelectedTask(null);
      loadTasks();
      setTimeout(() => setApplySuccess(null), 5000);
    }

    setApplying(false);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const pollUnlockPayment = (id: string, taskId: string) => {
    stopPolling();
    setUnlockStatus('waiting');

    pollRef.current = setInterval(async () => {
      const { data, error } = await supabase
        .from('mpesa_payments')
        .select('status, result_desc, mpesa_receipt_no, amount, phone, created_at, user_id')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) return;

      if (data.status === 'success') {
        stopPolling();
        setUnlockStatus('success');

        setUnlockedTaskIds(prev => new Set(prev).add(taskId));

        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', data.user_id)
          .maybeSingle();

        setUnlockReceipt({
          transactionCode: data.mpesa_receipt_no || 'N/A',
          amount: Number(data.amount),
          userName: profileData?.full_name || 'User',
          phone: data.phone,
          paidAt: data.created_at,
        });
      } else if (data.status === 'failed') {
        stopPolling();
        setUnlockStatus('failed');
        setUnlockError(data.result_desc || 'Payment was not completed.');
      }
    }, 3000);
  };

  useEffect(() => {
    return () => stopPolling();
  }, []);

  const handleUnlockPay = async () => {
    if (!unlockPhone.trim()) {
      setUnlockError('Please enter your M-Pesa phone number.');
      return;
    }

    const phoneRegex = /^(0[17]\d{8}|254[17]\d{8}|\+254[17]\d{8})$/;
    const cleanPhone = unlockPhone.replace(/\s/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      setUnlockError('Please enter a valid Safaricom number (e.g., 0712345678).');
      return;
    }

    setUnlockStatus('prompting');
    setUnlockError(null);

    try {
      const task = tasks.find(item => item.id === unlockingTaskId);
      if (!task) {
        setUnlockStatus('failed');
        setUnlockError('This task is no longer available. Please refresh and try again.');
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setUnlockStatus('failed');
        setUnlockError('Your session has expired. Please log in again.');
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mpesa-stk-push`;
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          taskId: task.id,
          phone: cleanPhone,
          amount: getUnlockFee(task),
          accountReference: 'EarnIQ Task Unlock',
          transactionDesc: 'EarnIQ Task Unlock',
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        setUnlockStatus('failed');
        setUnlockError(data.error || 'Failed to send M-Pesa prompt. Please try again.');
        return;
      }

      // Poll until Safaricom confirms or rejects the Till payment.
      if (!data.paymentId || !unlockingTaskId) {
        setUnlockStatus('failed');
        setUnlockError('The payment request could not be tracked. Please try again.');
        return;
      }
      pollUnlockPayment(data.paymentId, unlockingTaskId);
    } catch {
      setUnlockStatus('failed');
      setUnlockError('Unable to reach the payment service. Please try again.');
    }
  };

  const categories = Object.keys(categoryMeta);
  const unlockingTask = tasks.find(task => task.id === unlockingTaskId);
  const unlockFee = unlockingTask ? getUnlockFee(unlockingTask) : 100;
  const assignmentPayoutAmount = Number(assignmentForm.payout);
  const assignmentUnlockFee = Number.isFinite(assignmentPayoutAmount) && assignmentPayoutAmount > 0
    ? getUnlockFeeForPayout(assignmentPayoutAmount)
    : 100;

  const budgetOptions = [
    { label: 'All Budgets', value: null },
    { label: 'Under $5', value: [0, 5] as [number, number] },
    { label: '$5 - $15', value: [5, 15] as [number, number] },
    { label: '$15 - $25', value: [15, 25] as [number, number] },
    { label: 'Over $25', value: [25, 1000] as [number, number] },
  ];

  const taskStats = {
    total: tasks.length,
    totalValue: tasks.reduce((sum, t) => sum + t.payout_amount, 0),
    categories: [...new Set(tasks.map(t => t.category))].length,
  };

  const getPosterInfo = (task: Task) => {
    const posterName = task.poster_name || 'EarnIQ Team';
    const location = task.poster_location || 'Global';
    const avatarUrl = task.poster_avatar_url || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(posterName)}&backgroundColor=0f766e,2563eb,f59e0b`;
    return { name: posterName, location, avatarUrl };
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Success Message */}
      {applySuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
          <p className="text-green-700 dark:text-green-300">{applySuccess}</p>
          <button onClick={() => setApplySuccess(null)} className="ml-auto text-green-600 dark:text-green-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-teal-900 to-blue-950 bg-[length:200%_200%] p-6 text-white shadow-xl animate-gradient-shift md:p-8">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl animate-float" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold mb-1">
            <span className="bg-gradient-to-r from-emerald-200 via-cyan-200 to-blue-200 bg-clip-text text-transparent">Task Marketplace</span>
          </h1>
          <p className="text-emerald-100">Find tasks that match your skills and earn money</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAssignmentModal(true)}
            className="bg-white/95 text-emerald-800 px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-white transition-all shadow-lg shadow-black/20 hover:scale-[1.02] flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Post Assignment
          </button>
          <div className="bg-white/10 rounded-xl border border-white/15 px-4 py-2 backdrop-blur-sm">
            <p className="text-xs text-cyan-100">Available Tasks</p>
            <p className="text-xl font-bold text-white">{taskStats.total}</p>
          </div>
          <div className="bg-white/10 rounded-xl border border-white/15 px-4 py-2 backdrop-blur-sm">
            <p className="text-xs text-emerald-100">Total Value</p>
            <p className="text-xl font-bold text-white">${taskStats.totalValue.toFixed(0)}</p>
          </div>
        </div>
      </div>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 dark:from-amber-900/20 dark:via-orange-900/20 dark:to-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-start gap-3">
        <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Each task is locked individually</p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
            Unlock fees vary with each task's payout from KES 100 to KES 250. Higher-paying tasks have higher fees, and unlocking one task leaves the rest locked.
          </p>
        </div>
      </div>

      <>
          {/* Search and Filters */}
          <div className="bg-white dark:bg-secondary-800 rounded-2xl border border-secondary-200 dark:border-secondary-700 p-4 lg:p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400 dark:text-secondary-500" />
                <input
                  type="search"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-secondary-200 dark:border-secondary-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white transition-all"
                />
              </div>

              <div className="flex gap-3 flex-wrap">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'payout' | 'time' | 'difficulty')}
                  className="px-4 py-2 border border-secondary-200 dark:border-secondary-600 rounded-lg text-sm bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white"
                >
                  <option value="payout">Highest Paying</option>
                  <option value="time">Quickest Tasks</option>
                  <option value="difficulty">Easiest First</option>
                </select>

                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    showFilters || selectedCategory || selectedDifficulty || budgetRange
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border border-primary-300 dark:border-primary-700'
                      : 'bg-secondary-100 dark:bg-secondary-700 text-secondary-700 dark:text-secondary-300 border border-secondary-200 dark:border-secondary-600'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  {(selectedCategory || selectedDifficulty || budgetRange) && (
                    <span className="w-5 h-5 bg-primary-600 text-white rounded-full text-xs flex items-center justify-center">
                      {[selectedCategory, selectedDifficulty, budgetRange].filter(Boolean).length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <div className="border-t border-secondary-200 dark:border-secondary-700 pt-4 space-y-4 animate-fade-in">
                {/* Categories */}
                <div>
                  <p className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">Category</p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          selectedCategory === cat
                            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border border-primary-300 dark:border-primary-700'
                            : 'bg-secondary-50 dark:bg-secondary-700 text-secondary-600 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-600'
                        }`}
                      >
                        {categoryMeta[cat]?.icon}
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Skill Level */}
                <div>
                  <p className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">Skill Level</p>
                  <div className="flex gap-2">
                    {['beginner', 'intermediate', 'advanced'].map(level => (
                      <button
                        key={level}
                        onClick={() => setSelectedDifficulty(selectedDifficulty === level ? null : level)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                          selectedDifficulty === level
                            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border border-primary-300 dark:border-primary-700'
                            : 'bg-secondary-50 dark:bg-secondary-700 text-secondary-600 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-600'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Budget */}
                <div>
                  <p className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">Budget Range</p>
                  <div className="flex gap-2">
                    {budgetOptions.map(opt => (
                      <button
                        key={opt.label}
                        onClick={() => setBudgetRange(opt.value)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          budgetRange === opt.value
                            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border border-primary-300 dark:border-primary-700'
                            : 'bg-secondary-50 dark:bg-secondary-700 text-secondary-600 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-600'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clear Filters */}
                {(selectedCategory || selectedDifficulty || budgetRange) && (
                  <button
                    onClick={() => {
                      setSelectedCategory(null);
                      setSelectedDifficulty(null);
                      setBudgetRange(null);
                    }}
                    className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium flex items-center gap-1"
                  >
                    <X className="w-4 h-4" />
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Active Filters Summary */}
          {(selectedCategory || selectedDifficulty || budgetRange) && !showFilters && (
            <div className="flex flex-wrap gap-2">
              {selectedCategory && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 rounded-full text-sm">
                  {selectedCategory}
                  <button onClick={() => setSelectedCategory(null)}><X className="w-3 h-3" /></button>
                </span>
              )}
              {selectedDifficulty && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 rounded-full text-sm capitalize">
                  {selectedDifficulty}
                  <button onClick={() => setSelectedDifficulty(null)}><X className="w-3 h-3" /></button>
                </span>
              )}
              {budgetRange && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 rounded-full text-sm">
                  ${budgetRange[0]} - ${budgetRange[1]}
                  <button onClick={() => setBudgetRange(null)}><X className="w-3 h-3" /></button>
                </span>
              )}
            </div>
          )}

          {/* Task Cards */}
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-5">
                  <div className="w-12 h-12 bg-secondary-200 dark:bg-secondary-700 rounded-xl mb-4"></div>
                  <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-secondary-200 dark:bg-secondary-700 rounded w-1/2 mb-4"></div>
                  <div className="h-16 bg-secondary-100 dark:bg-secondary-700 rounded mb-4"></div>
                  <div className="h-10 bg-secondary-200 dark:bg-secondary-700 rounded"></div>
                </div>
              ))}
            </div>
          ) : filteredTasks.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTasks.map((task) => {
                const poster = getPosterInfo(task);
                return (
                  <div
                    key={task.id}
                    className="group bg-white dark:bg-secondary-800 rounded-2xl border border-secondary-200 dark:border-secondary-700 p-5 hover:-translate-y-1 hover:shadow-2xl hover:border-primary-300 dark:hover:border-primary-600 transition-all duration-300 cursor-pointer animate-slide-up"
                    onClick={() => {
                      setSelectedTask(task);
                      setApplyError(null);
                    }}
                  >
                    {/* Category Icon */}
                    <div className={`w-12 h-12 bg-gradient-to-br ${categoryMeta[task.category]?.gradient || 'from-gray-500 to-gray-600'} rounded-xl flex items-center justify-center text-white mb-4`}>
                      {categoryMeta[task.category]?.icon || <Briefcase className="w-5 h-5" />}
                    </div>

                    {/* Tags */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${difficultyColors[task.difficulty]}`}>
                        {task.difficulty}
                      </span>
                      <span className="text-xs text-secondary-500 dark:text-secondary-400">{task.category}</span>
                    </div>

                    {/* Title & Description */}
                    <h3 className="font-bold text-secondary-900 dark:text-white mb-2">{task.title}</h3>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-4 line-clamp-2">{task.description}</p>

                    {/* Poster Info */}
                    <div className="flex items-center gap-2 mb-4 text-xs text-secondary-500 dark:text-secondary-400">
                      <span className="relative w-8 h-8 flex-shrink-0 rounded-full bg-gradient-to-br from-cyan-600 to-emerald-600 flex items-center justify-center text-white shadow-sm">
                        <User className="w-4 h-4" />
                        <img
                          src={poster.avatarUrl}
                          alt={`${poster.name} avatar`}
                          onError={(event) => { event.currentTarget.style.display = 'none'; }}
                          className="absolute inset-0 w-full h-full rounded-full object-cover ring-2 ring-white dark:ring-secondary-800 transition-transform duration-300 group-hover:scale-110"
                        />
                      </span>
                      <span className="font-medium text-secondary-700 dark:text-secondary-300">{poster.name}</span>
                      <Building2 className="w-3.5 h-3.5 text-secondary-400" aria-label="Task poster" />
                      <span className="flex items-center gap-1 text-primary-600 dark:text-primary-400">
                        <MapPin className="w-3 h-3" />
                        {countryFlags[poster.location] || '🌍'} {poster.location}
                      </span>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center justify-between text-sm text-secondary-500 dark:text-secondary-400 mb-4">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {task.estimated_time_minutes}m
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {task.total_slots - task.slots_filled} slots
                        </span>
                      </div>
                    </div>

                    {/* Price & Apply */}
                    <div className="flex items-center justify-between pt-4 border-t border-secondary-100 dark:border-secondary-700">
                      <div>
                        <p className="text-xs text-secondary-500 dark:text-secondary-400">Payout</p>
                        <p className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">${task.payout_amount.toFixed(2)}</p>
                      </div>
                      {unlockedTaskIds.has(task.id) ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyTask(task.id);
                          }}
                          className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-emerald-600 hover:to-teal-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                        >
                          Apply Now
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setUnlockingTaskId(task.id);
                            setShowUnlockModal(true);
                            setUnlockStatus('idle');
                            setUnlockError(null);
                            setUnlockPhone('');
                          }}
                          aria-label={`Unlock task for KES ${getUnlockFee(task).toLocaleString()}`}
                          className="min-w-[112px] min-h-[56px] px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors shadow-md flex flex-col items-center justify-center gap-0.5"
                        >
                          <span className="flex items-center gap-1.5">
                            <Lock className="w-4 h-4" />
                            <span>Unlock</span>
                          </span>
                          <span className="text-xs font-medium">KES {getUnlockFee(task).toLocaleString()}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700">
              <Briefcase className="w-16 h-16 text-secondary-300 dark:text-secondary-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">No tasks found</h3>
              <p className="text-secondary-600 dark:text-secondary-400 mb-4">Try adjusting your search or filters</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory(null);
                  setSelectedDifficulty(null);
                  setBudgetRange(null);
                }}
                className="text-primary-600 dark:text-primary-400 font-medium hover:text-primary-700 dark:hover:text-primary-300"
              >
                Clear all filters
              </button>
            </div>
          )}
        </>

      {/* Task Unlock Modal */}
      {showUnlockModal && unlockingTaskId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-secondary-800 rounded-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white text-center relative">
              <button
                onClick={() => {
                  stopPolling();
                  setShowUnlockModal(false);
                  setUnlockStatus('idle');
                  setUnlockError(null);
                  setUnlockPhone('');
                  setUnlockingTaskId(null);
                }}
                className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                {unlockStatus === 'success' ? (
                  <ShieldCheck className="w-8 h-8" />
                ) : (
                  <Lock className="w-8 h-8" />
                )}
              </div>
              <h3 className="text-xl font-bold mb-1">
                {unlockStatus === 'success' ? 'Task Unlocked!' : 'Unlock This Task'}
              </h3>
              <p className="text-primary-100 text-sm">
                {unlockStatus === 'success'
                  ? 'You can now apply for this task'
                  : `Fee: KES ${unlockFee.toLocaleString()} via Safaricom Till 1712962`}
              </p>
            </div>

            <div className="p-6">
              {unlockStatus === 'success' ? (
                <div className="py-2">
                  <div className="text-center mb-5">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-in">
                      <PartyPopper className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-secondary-900 dark:text-white font-bold text-lg mb-1">
                      Task Unlocked Successfully!
                    </p>
                    <p className="text-sm text-secondary-500 dark:text-secondary-400">
                      You can now apply for this task and start earning.
                    </p>
                  </div>

                  {unlockReceipt && (
                    <div className="bg-secondary-50 dark:bg-secondary-700/50 rounded-xl p-4 space-y-3 mb-4">
                      <div className="flex items-center gap-2 pb-3 border-b border-secondary-200 dark:border-secondary-600">
                        <Receipt className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                        <span className="text-sm font-semibold text-secondary-900 dark:text-white">Transaction Receipt</span>
                      </div>
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-secondary-500 dark:text-secondary-400">
                            <User className="w-3.5 h-3.5" /> Name
                          </span>
                          <span className="font-medium text-secondary-900 dark:text-white">{unlockReceipt.userName}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-secondary-500 dark:text-secondary-400">
                            <Hash className="w-3.5 h-3.5" /> Transaction Code
                          </span>
                          <span className="font-mono font-medium text-secondary-900 dark:text-white">{unlockReceipt.transactionCode}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-secondary-500 dark:text-secondary-400">
                            <DollarSign className="w-3.5 h-3.5" /> Amount
                          </span>
                          <span className="font-medium text-green-600 dark:text-green-400">KES {unlockReceipt.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-secondary-500 dark:text-secondary-400">
                            <Smartphone className="w-3.5 h-3.5" /> Phone
                          </span>
                          <span className="font-medium text-secondary-900 dark:text-white">{unlockReceipt.phone}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-secondary-500 dark:text-secondary-400">
                            <Calendar className="w-3.5 h-3.5" /> Date & Time
                          </span>
                          <span className="font-medium text-secondary-900 dark:text-white">
                            {new Date(unlockReceipt.paidAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setShowUnlockModal(false);
                      setUnlockStatus('idle');
                      setUnlockPhone('');
                      setUnlockReceipt(null);
                      setUnlockingTaskId(null);
                    }}
                    className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Apply Now
                  </button>
                </div>
              ) : (
                <>
                  {unlockError && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      {unlockError}
                    </div>
                  )}

                  {unlockStatus === 'waiting' && (
                    <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3">
                      <Smartphone className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5 animate-pulse" />
                      <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-300">
                          Check your phone
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                          Enter your M-Pesa PIN on your phone to pay EarnIQ KES {unlockFee.toLocaleString()} via Till 1712962.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      M-Pesa Phone Number
                    </label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400 dark:text-secondary-500" />
                      <input
                        type="tel"
                        value={unlockPhone}
                        onChange={(e) => {
                          setUnlockPhone(e.target.value);
                          setUnlockError(null);
                        }}
                        disabled={unlockStatus === 'prompting' || unlockStatus === 'waiting'}
                        placeholder="0712345678"
                        className="w-full pl-10 pr-4 py-3 border border-secondary-200 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white disabled:opacity-60"
                      />
                    </div>
                    <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                      You'll receive an M-Pesa prompt on this phone to enter your PIN.
                    </p>
                  </div>

                  <div className="bg-secondary-50 dark:bg-secondary-700/50 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-secondary-600 dark:text-secondary-400">Unlock Fee</span>
                      <span className="font-bold text-secondary-900 dark:text-white">KES {unlockFee.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-secondary-500 dark:text-secondary-400">
                      <ShieldCheck className="w-4 h-4" />
                      Safaricom M-Pesa · Till 1712962 · EarnIQ
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        stopPolling();
                        setShowUnlockModal(false);
                        setUnlockStatus('idle');
                        setUnlockError(null);
                        setUnlockPhone('');
                        setUnlockingTaskId(null);
                      }}
                      disabled={unlockStatus === 'waiting'}
                      className="flex-1 py-3 rounded-lg font-medium text-secondary-600 dark:text-secondary-400 bg-secondary-100 dark:bg-secondary-700 hover:bg-secondary-200 dark:hover:bg-secondary-600 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUnlockPay}
                      disabled={unlockStatus === 'prompting' || unlockStatus === 'waiting' || !unlockPhone.trim()}
                      className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {unlockStatus === 'prompting' || unlockStatus === 'waiting' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {unlockStatus === 'waiting' ? 'Waiting for PIN...' : 'Sending prompt...'}
                        </>
                      ) : (
                        <>
                          <Smartphone className="w-4 h-4" />
                          Pay & Unlock
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-secondary-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className={`bg-gradient-to-r ${categoryMeta[selectedTask.category]?.gradient || 'from-gray-500 to-gray-600'} p-6 text-white`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                    {categoryMeta[selectedTask.category]?.icon || <Briefcase className="w-7 h-7" />}
                  </div>
                  <div>
                    <span className="text-white/80 text-sm">{selectedTask.category}</span>
                    <h2 className="text-xl font-bold">{selectedTask.title}</h2>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Error Message */}
              {applyError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <p className="text-red-700 dark:text-red-300">{applyError}</p>
                </div>
              )}

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
                  <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">${selectedTask.payout_amount.toFixed(2)}</p>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">Payout</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center">
                  <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{selectedTask.estimated_time_minutes}</p>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">Minutes</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-center">
                  <Star className="w-6 h-6 text-amber-600 dark:text-amber-400 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{selectedTask.quality_threshold * 100}%</p>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">Quality Req.</p>
                </div>
              </div>

              {/* Poster Info */}
              <div className="flex items-center gap-3 p-3 bg-secondary-50 dark:bg-secondary-700/50 rounded-lg">
                <span className="relative w-10 h-10 flex-shrink-0 rounded-full bg-gradient-to-br from-cyan-600 to-emerald-600 flex items-center justify-center text-white shadow-sm">
                  <User className="w-5 h-5" />
                  <img
                    src={getPosterInfo(selectedTask).avatarUrl}
                    alt={`${getPosterInfo(selectedTask).name} avatar`}
                    onError={(event) => { event.currentTarget.style.display = 'none'; }}
                    className="absolute inset-0 w-full h-full rounded-full object-cover ring-2 ring-white dark:ring-secondary-700"
                  />
                </span>
                <div>
                  <p className="font-medium text-secondary-900 dark:text-white flex items-center gap-1.5">
                    {getPosterInfo(selectedTask).name}
                    <Building2 className="w-4 h-4 text-secondary-400" aria-label="Task poster" />
                  </p>
                  <p className="text-sm text-secondary-500 dark:text-secondary-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {countryFlags[getPosterInfo(selectedTask).location] || '🌍'} {getPosterInfo(selectedTask).location}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="font-semibold text-secondary-900 dark:text-white mb-2">Description</h3>
                <p className="text-secondary-600 dark:text-secondary-400">{selectedTask.description}</p>
              </div>

              {/* Details */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-secondary-900 dark:text-white mb-3">Task Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 bg-gradient-to-br ${categoryMeta[selectedTask.category]?.gradient} rounded-lg flex items-center justify-center text-white`}>
                        {categoryMeta[selectedTask.category]?.icon}
                      </div>
                      <div>
                        <p className="text-sm text-secondary-500 dark:text-secondary-400">Category</p>
                        <p className="font-medium text-secondary-900 dark:text-white">{selectedTask.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-secondary-100 dark:bg-secondary-700 rounded-lg flex items-center justify-center">
                        <Zap className="w-4 h-4 text-secondary-600 dark:text-secondary-400" />
                      </div>
                      <div>
                        <p className="text-sm text-secondary-500 dark:text-secondary-400">Difficulty</p>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${difficultyColors[selectedTask.difficulty]}`}>
                          {selectedTask.difficulty}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-secondary-100 dark:bg-secondary-700 rounded-lg flex items-center justify-center">
                        <Users className="w-4 h-4 text-secondary-600 dark:text-secondary-400" />
                      </div>
                      <div>
                        <p className="text-sm text-secondary-500 dark:text-secondary-400">Availability</p>
                        <p className="font-medium text-secondary-900 dark:text-white">
                          {selectedTask.total_slots - selectedTask.slots_filled} of {selectedTask.total_slots} slots
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-secondary-900 dark:text-white mb-3">Skills Required</h3>
                  <div className="flex flex-wrap gap-2">
                    {(selectedTask.skills_required || ['Attention to Detail', 'Quick Learning']).map((skill, i) => (
                      <span key={i} className="px-3 py-1 bg-secondary-100 dark:bg-secondary-700 text-secondary-700 dark:text-secondary-300 rounded-full text-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Task Agent Chat */}
              <TaskAgentChat task={selectedTask} />

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-secondary-200 dark:border-secondary-700">
                <button
                  onClick={() => {
                    setSelectedTask(null);
                    setApplyError(null);
                  }}
                  className="flex-1 bg-secondary-100 dark:bg-secondary-700 text-secondary-700 dark:text-secondary-300 py-3 rounded-lg font-medium hover:bg-secondary-200 dark:hover:bg-secondary-600 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => handleApplyTask(selectedTask.id)}
                  disabled={applying}
                  className="flex-1 bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {applying ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Apply for Task
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Post Assignment Modal */}
      {showAssignmentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-secondary-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white relative">
              <button
                onClick={() => {
                  setShowAssignmentModal(false);
                  setAssignmentSuccess(false);
                  setAssignmentForm({ title: '', description: '', category: 'Writing', payout: '', deadline: '', requirements: '' });
                }}
                className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Post an Assignment</h3>
                  <p className="text-primary-100 text-sm">Get your assignment done at a fee</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {assignmentSuccess ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-bold text-secondary-900 dark:text-white mb-2">Assignment Posted!</h3>
                  <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-4">
                    Your assignment is now live in the marketplace. Workers can apply to complete it.
                  </p>
                  <button
                    onClick={() => {
                      setShowAssignmentModal(false);
                      setAssignmentSuccess(false);
                      setAssignmentForm({ title: '', description: '', category: 'Writing', payout: '', deadline: '', requirements: '' });
                    }}
                    className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignmentError && (
                    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                      {assignmentError}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1.5">Assignment Title</label>
                    <input
                      type="text"
                      value={assignmentForm.title}
                      onChange={(e) => setAssignmentForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Essay on Climate Change in East Africa"
                      className="w-full px-4 py-2.5 border border-secondary-200 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1.5">Description</label>
                    <textarea
                      value={assignmentForm.description}
                      onChange={(e) => setAssignmentForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your assignment in detail - what needs to be done, format, word count, etc."
                      rows={3}
                      className="w-full px-4 py-2.5 border border-secondary-200 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1.5">Category</label>
                      <select
                        value={assignmentForm.category}
                        onChange={(e) => setAssignmentForm(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-secondary-200 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white"
                      >
                        <option>Writing</option>
                        <option>Research</option>
                        <option>Translation</option>
                        <option>Data Entry</option>
                        <option>AI Training</option>
                        <option>Social Media</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1.5">Estimated Unlock Fee (KES)</label>
                      <output className="block w-full px-4 py-2.5 border border-secondary-200 dark:border-secondary-600 rounded-lg bg-secondary-50 dark:bg-secondary-700 text-secondary-900 dark:text-white font-semibold">
                        {assignmentForm.payout ? `KES ${assignmentUnlockFee.toLocaleString()}` : 'Enter a payout to calculate'}
                      </output>
                      <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">Higher-paying tasks have higher fees, capped at KES 250.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1.5">Payout (USD)</label>
                      <input
                        type="number"
                        value={assignmentForm.payout}
                        onChange={(e) => setAssignmentForm(prev => ({ ...prev, payout: e.target.value }))}
                        placeholder="e.g., 25"
                        min="1"
                        className="w-full px-4 py-2.5 border border-secondary-200 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1.5">Deadline</label>
                    <input
                      type="date"
                      value={assignmentForm.deadline}
                      onChange={(e) => setAssignmentForm(prev => ({ ...prev, deadline: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-secondary-200 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1.5">Requirements (optional)</label>
                    <input
                      type="text"
                      value={assignmentForm.requirements}
                      onChange={(e) => setAssignmentForm(prev => ({ ...prev, requirements: e.target.value }))}
                      placeholder="e.g., MLA format, 2000 words, original work"
                      className="w-full px-4 py-2.5 border border-secondary-200 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white"
                    />
                  </div>

                  <button
                    onClick={async () => {
                      const payoutAmount = Number(assignmentForm.payout);
                      const unlockFee = getUnlockFeeForPayout(payoutAmount);
                      if (!assignmentForm.title || !assignmentForm.description || !Number.isFinite(payoutAmount) || payoutAmount <= 0) return;
                      setAssignmentPosting(true);
                      setAssignmentError(null);
                      try {
                        const { error } = await supabase.from('tasks').insert({
                          title: assignmentForm.title.trim(),
                          description: assignmentForm.description.trim(),
                          category: assignmentForm.category,
                          task_type: assignmentForm.category === 'Translation' ? 'translation' : 'annotation',
                          difficulty: 'intermediate',
                          payout_amount: payoutAmount,
                          payout_currency: 'USD',
                          unlock_fee: unlockFee,
                          estimated_time_minutes: 120,
                          skills_required: assignmentForm.requirements ? assignmentForm.requirements.split(',').map((s: string) => s.trim()) : ['Writing'],
                          status: 'active',
                          total_slots: 1,
                          slots_filled: 0,
                          quality_threshold: 0.8,
                          poster_name: profile?.full_name || 'Student',
                          poster_location: profile?.country || profile?.city || 'Global',
                          poster_avatar_url: profile?.avatar_url || null,
                          created_by: profile?.id,
                        });
                        if (error) {
                          setAssignmentError(`Unable to post assignment: ${error.message}`);
                          return;
                        }
                        setAssignmentSuccess(true);
                        await loadTasks();
                      } catch (error) {
                        setAssignmentError(error instanceof Error ? error.message : 'Unable to post assignment. Please try again.');
                      } finally {
                        setAssignmentPosting(false);
                      }
                    }}
                    disabled={!assignmentForm.title || !assignmentForm.description || !assignmentForm.payout || assignmentPosting}
                    className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {assignmentPosting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Posting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Post Assignment
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
