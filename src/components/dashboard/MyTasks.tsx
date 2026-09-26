import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Brain,
  MessageCircle,
  Code,
  BarChart3,
  FileText,
  Play,
  Hourglass,
  Banknote,
  ArrowRight,
} from 'lucide-react';
import type { UserTask, Task } from '../../types/database';

type UserTaskWithDetails = UserTask & { task: Task };

const statusColors: Record<string, string> = {
  assigned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  submitted: 'bg-purple-100 text-purple-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  disputed: 'bg-orange-100 text-orange-700',
};

const statusIcons: Record<string, React.ReactElement> = {
  assigned: <Clock className="w-4 h-4" />,
  in_progress: <Loader2 className="w-4 h-4 animate-spin" />,
  submitted: <Send className="w-4 h-4" />,
  approved: <CheckCircle2 className="w-4 h-4" />,
  rejected: <AlertCircle className="w-4 h-4" />,
  disputed: <AlertCircle className="w-4 h-4" />,
};

const paymentStatusMeta: Record<string, { label: string; color: string; icon: React.ReactElement }> = {
  pending: { label: 'Pending', color: 'text-secondary-500', icon: <Clock className="w-4 h-4" /> },
  processing: { label: 'Processing', color: 'text-blue-600', icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  waiting_payment: { label: 'Waiting for Payment', color: 'text-amber-600', icon: <Hourglass className="w-4 h-4" /> },
  paid: { label: 'Paid', color: 'text-green-600', icon: <Banknote className="w-4 h-4" /> },
};

const taskTypeIcons: Record<string, React.ReactElement> = {
  annotation: <Brain className="w-5 h-5" />,
  moderation: <MessageCircle className="w-5 h-5" />,
  coding: <Code className="w-5 h-5" />,
  survey: <BarChart3 className="w-5 h-5" />,
  testing: <CheckCircle2 className="w-5 h-5" />,
  transcription: <FileText className="w-5 h-5" />,
};

const PAYMENT_STEPS = [
  { key: 'submitted', label: 'Submitted', icon: Send },
  { key: 'accepted', label: 'Accepted', icon: CheckCircle2 },
  { key: 'processing', label: 'Processing', icon: Loader2 },
  { key: 'waiting_payment', label: 'Waiting for Payment', icon: Hourglass },
  { key: 'paid', label: 'Paid', icon: Banknote },
];

function getPaymentStepIndex(status: string, paymentStatus: string | null): number {
  if (status === 'in_progress') return -1;
  if (status === 'submitted') return 0;
  if (status === 'approved') {
    if (paymentStatus === 'paid') return 4;
    if (paymentStatus === 'waiting_payment') return 3;
    if (paymentStatus === 'processing') return 2;
    return 1; // accepted
  }
  return -1;
}

export default function MyTasks() {
  const { profile, refreshWallet } = useAuth();
  const [tasks, setTasks] = useState<UserTaskWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'in_progress' | 'submitted' | 'completed'>('all');

  useEffect(() => {
    loadTasks();
  }, [profile, activeTab]);

  const loadTasks = async () => {
    setLoading(true);

    let query = supabase
      .from('user_tasks')
      .select('*, task:tasks(*)')
      .eq('user_id', profile?.id || '')
      .order('started_at', { ascending: false });

    if (activeTab === 'in_progress') {
      query = query.eq('status', 'in_progress');
    } else if (activeTab === 'submitted') {
      query = query.eq('status', 'submitted');
    } else if (activeTab === 'completed') {
      query = query.in('status', ['approved', 'rejected']);
    }

    const { data, error } = await query.limit(20);

    if (!error && data) {
      setTasks(data as UserTaskWithDetails[]);
    }

    setLoading(false);
  };

  const handleSubmitTask = async (taskId: string) => {
    const { error } = await supabase
      .from('user_tasks')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', taskId);

    if (!error) {
      loadTasks();
    }
  };

  const handleStartTask = async (taskId: string) => {
    const { error } = await supabase
      .from('user_tasks')
      .update({ status: 'in_progress' })
      .eq('id', taskId);

    if (!error) {
      loadTasks();
    }
  };

  const calculateTimeRemaining = (startedAt: string, estimatedMinutes: number) => {
    const start = new Date(startedAt).getTime();
    const deadline = start + estimatedMinutes * 60 * 1000;
    const remaining = deadline - Date.now();

    if (remaining <= 0) return 'Overdue';

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes} min`;
  };

  const tabs = [
    { id: 'all' as const, label: 'All Tasks' },
    { id: 'in_progress' as const, label: 'In Progress' },
    { id: 'submitted' as const, label: 'Submitted' },
    { id: 'completed' as const, label: 'Completed' },
  ];

  const stats = {
    total: tasks.length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    pending: tasks.filter(t => t.status === 'submitted').length,
    earnings: tasks.filter(t => t.status === 'approved' && t.payment_status === 'paid').reduce((sum, t) => sum + (t.earnings || 0), 0),
    processing: tasks.filter(t => t.status === 'approved' && (t.payment_status === 'processing' || t.payment_status === 'waiting_payment')).length,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl lg:text-3xl font-bold text-secondary-900">My Tasks</h1>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            Live activity
          </span>
        </div>
        <p className="text-secondary-600">Manage and track your assigned tasks</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-red-200 rounded-xl p-4 shadow-sm shadow-red-100 animate-slide-up">
          <p className="text-sm text-secondary-500">Total Tasks</p>
          <p className="text-2xl font-bold text-red-600">{stats.total}</p>
        </div>
        <div className="bg-white border border-secondary-200 rounded-xl p-4 animate-slide-up [animation-delay:80ms]">
          <p className="text-sm text-secondary-500">In Progress</p>
          <p className="text-2xl font-bold text-amber-600">{stats.inProgress}</p>
        </div>
        <div className="bg-white border border-secondary-200 rounded-xl p-4 animate-slide-up [animation-delay:160ms]">
          <p className="text-sm text-secondary-500">Pending Review</p>
          <p className="text-2xl font-bold text-purple-600">{stats.pending}</p>
        </div>
        <div className="bg-white border border-secondary-200 rounded-xl p-4 animate-slide-up [animation-delay:240ms]">
          <p className="text-sm text-secondary-500">Processing</p>
          <p className="text-2xl font-bold text-blue-600">{stats.processing}</p>
        </div>
        <div className="bg-white border border-red-200 rounded-xl p-4 shadow-sm shadow-red-100 animate-slide-up [animation-delay:320ms]">
          <p className="text-sm text-secondary-500">Total Paid</p>
          <p className="text-2xl font-bold text-red-600">${stats.earnings.toFixed(2)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-primary-600 text-white'
                : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white border border-secondary-200 rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-secondary-200 rounded-xl"></div>
                <div className="flex-1">
                  <div className="h-4 bg-secondary-200 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-secondary-200 rounded w-1/4"></div>
                </div>
              </div>
            </div>
          ))
        ) : tasks.length > 0 ? (
          tasks.map((userTask) => {
            const task = userTask.task;
            const payStep = getPaymentStepIndex(userTask.status, userTask.payment_status);
            const showPaymentFlow = payStep >= 0;
            return (
              <div key={userTask.id} className="bg-white border border-secondary-200 rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-red-200 hover:shadow-lg hover:shadow-red-100/50">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-red-600 animate-float">
                      {taskTypeIcons[task.task_type] || <Brain className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-secondary-900">{task.title}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[userTask.status]}`}>
                          {statusIcons[userTask.status]}
                          {userTask.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-secondary-600 mb-2">{task.category}</p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-secondary-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {userTask.status === 'in_progress'
                            ? calculateTimeRemaining(userTask.started_at, task.estimated_time_minutes)
                            : `${task.estimated_time_minutes} min`}
                        </span>
                        <span className="font-medium text-primary-600">
                          ${task.payout_amount.toFixed(2)}
                        </span>
                        <span>
                          Started {new Date(userTask.started_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {userTask.status === 'assigned' && (
                      <button
                        onClick={() => handleStartTask(userTask.id)}
                        className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors flex items-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Start
                      </button>
                    )}
                    {userTask.status === 'in_progress' && (
                      <button
                        onClick={() => handleSubmitTask(userTask.id)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        Submit
                      </button>
                    )}
                    {userTask.status === 'approved' && userTask.earnings && (
                      <div className="text-right">
                        <p className="text-sm text-secondary-500">
                          {userTask.payment_status === 'paid' ? 'Earned' : 'Pending Payment'}
                        </p>
                        <p className={`text-lg font-bold ${userTask.payment_status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                          ${userTask.earnings.toFixed(2)}
                        </p>
                      </div>
                    )}
                    {userTask.status === 'rejected' && userTask.feedback && (
                      <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                        {userTask.feedback}
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Flow Progress Bar */}
                {showPaymentFlow && (
                  <div className="mt-5 pt-5 border-t border-secondary-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-secondary-500 uppercase tracking-wide">Payment Progress</p>
                      {userTask.payment_status && paymentStatusMeta[userTask.payment_status] && (
                        <span className={`text-xs font-medium flex items-center gap-1 ${paymentStatusMeta[userTask.payment_status].color}`}>
                          {paymentStatusMeta[userTask.payment_status].icon}
                          {paymentStatusMeta[userTask.payment_status].label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {PAYMENT_STEPS.map((step, i) => {
                        const isComplete = i < payStep;
                        const isCurrent = i === payStep;
                        return (
                          <div key={step.key} className="flex items-center flex-1 last:flex-none">
                            <div className="flex flex-col items-center gap-1 flex-shrink-0">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                isComplete
                                  ? 'bg-green-600 text-white'
                                  : isCurrent
                                  ? 'bg-primary-600 text-white ring-4 ring-primary-100'
                                  : 'bg-secondary-100 text-secondary-400'
                              }`}>
                                {isComplete || (isCurrent && userTask.payment_status !== 'waiting_payment' && userTask.payment_status !== 'processing') ? (
                                  <step.icon className="w-4 h-4" />
                                ) : isCurrent && (userTask.payment_status === 'processing') ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  i + 1
                                )}
                              </div>
                              <span className={`text-[10px] font-medium text-center leading-tight ${isComplete || isCurrent ? 'text-secondary-700' : 'text-secondary-400'}`}>
                                {step.label}
                              </span>
                            </div>
                            {i < PAYMENT_STEPS.length - 1 && (
                              <div className={`h-0.5 flex-1 mx-1 rounded transition-all ${isComplete ? 'bg-green-500' : 'bg-secondary-200'}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {userTask.payment_status === 'waiting_payment' && (
                      <p className="text-xs text-amber-600 mt-3 flex items-center gap-1.5">
                        <Hourglass className="w-3.5 h-3.5" />
                        Payment is being processed and will reflect on your account in 5-10 minutes.
                      </p>
                    )}
                    {userTask.payment_status === 'paid' && userTask.paid_at && (
                      <p className="text-xs text-green-600 mt-3 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Payment reflected on {new Date(userTask.paid_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}.
                        Withdrawals available after 48 hours.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 bg-white border border-secondary-200 rounded-xl">
            <Brain className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-secondary-900 mb-2">No tasks found</h3>
            <p className="text-secondary-600 mb-4">
              {activeTab === 'all'
                ? "You haven't started any tasks yet"
                : `No ${activeTab.replace('_', ' ')} tasks`}
            </p>
            <button
              onClick={() => window.location.href = '/dashboard/tasks'}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              Browse Tasks
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
