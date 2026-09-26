import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  DollarSign,
  Clock,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  Briefcase,
  Brain,
  Star,
  Zap,
  Globe,
  Award,
  Sparkles,
  Smartphone,
  Wallet as WalletIcon,
  Users,
  Flame,
  Target,
  Gift,
  ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import type { UserTask, Task } from '../../types/database';
import { Link } from 'react-router-dom';

type UserTaskWithDetails = UserTask & { task: Task };

const KES_RATE = 129.53;

export default function DashboardHome() {
  const { profile, wallet } = useAuth();
  const [recentTasks, setRecentTasks] = useState<UserTaskWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskCount, setTaskCount] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);

    const { data: tasks } = await supabase
      .from('user_tasks')
      .select('*, task:tasks(*)')
      .eq('user_id', profile?.id || '')
      .order('started_at', { ascending: false })
      .limit(5);

    if (tasks) {
      setRecentTasks(tasks as UserTaskWithDetails[]);
    }

    const { count } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    if (count !== null) {
      setTaskCount(count);
    }

    setLoading(false);
  };

  const earningsData = [
    { name: 'Mon', earnings: 8500 },
    { name: 'Tue', earnings: 12000 },
    { name: 'Wed', earnings: 9500 },
    { name: 'Thu', earnings: 15000 },
    { name: 'Fri', earnings: 18000 },
    { name: 'Sat', earnings: 12000 },
    { name: 'Sun', earnings: 7500 },
  ];

  const weeklyProgress = [
    { name: 'Week 1', tasks: 42 },
    { name: 'Week 2', tasks: 58 },
    { name: 'Week 3', tasks: 45 },
    { name: 'Week 4', tasks: 72 },
  ];

  const availableBalance = wallet?.available_balance || 0;
  const totalEarned = wallet?.total_earnings || 0;
  const pendingEarnings = wallet?.pending_earnings || 0;

  const stats = [
    {
      title: 'Total Earnings',
      value: `$${totalEarned.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: '+12.5%',
      icon: DollarSign,
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      textColor: 'text-green-600 dark:text-green-400',
      borderColor: 'hover:border-green-300 dark:hover:border-green-700',
    },
    {
      title: 'Pending Earnings',
      value: `$${pendingEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: 'Processing',
      icon: Clock,
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      textColor: 'text-amber-600 dark:text-amber-400',
      borderColor: 'hover:border-amber-300 dark:hover:border-amber-700',
    },
    {
      title: 'Available Balance',
      value: `$${availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: 'Ready to withdraw',
      icon: CheckCircle2,
      bgColor: 'bg-primary-50 dark:bg-primary-900/20',
      textColor: 'text-primary-600 dark:text-primary-400',
      borderColor: 'hover:border-primary-300 dark:hover:border-primary-700',
    },
    {
      title: 'Tasks Completed',
      value: (recentTasks.filter(t => t.status === 'approved').length || 217).toString(),
      change: '+8 this week',
      icon: TrendingUp,
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      textColor: 'text-blue-600 dark:text-blue-400',
      borderColor: 'hover:border-blue-300 dark:hover:border-blue-700',
    },
  ];

  const skillProgress = [
    { skill: 'Data Annotation', progress: 85, level: 4 },
    { skill: 'Content Moderation', progress: 60, level: 3 },
    { skill: 'Web Development', progress: 40, level: 2 },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Premium Welcome Header */}
      <div className="bg-gradient-to-br from-secondary-900 via-secondary-800 to-secondary-900 dark:from-secondary-800 dark:via-secondary-700 dark:to-secondary-800 rounded-3xl p-6 lg:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-green-500/10 rounded-full -translate-y-1/3 translate-x-1/3 blur-2xl" />
        <div className="absolute bottom-0 left-1/2 w-56 h-56 bg-blue-500/10 rounded-full translate-y-1/3 blur-2xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-green-400" />
              <span className="text-green-400 text-sm font-medium">Welcome back</span>
            </div>
            <h1 className="text-2xl lg:text-4xl font-bold mb-2">
              {profile?.full_name?.split(' ')[0] || 'there'}!
            </h1>
            <p className="text-secondary-300 max-w-md">
              You have {taskCount || '23'} tasks available from clients worldwide. Your balance is ready to withdraw to M-Pesa anytime.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-5">
              <Link
                to="/dashboard/tasks"
                className="inline-flex items-center gap-2 bg-white text-secondary-900 px-5 py-3 rounded-xl font-semibold hover:bg-secondary-100 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              >
                <Briefcase className="w-5 h-5" />
                Browse Tasks
              </Link>
              <Link
                to="/dashboard/wallet"
                className="inline-flex items-center gap-2 bg-white/10 text-white px-5 py-3 rounded-xl font-semibold hover:bg-white/15 transition-all backdrop-blur-sm border border-white/10"
              >
                <WalletIcon className="w-5 h-5" />
                View Wallet
              </Link>
            </div>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <div className="bg-white/5 rounded-2xl p-4 backdrop-blur-sm border border-white/5 min-w-[200px]">
              <div className="flex items-center gap-2 mb-1">
                <WalletIcon className="w-4 h-4 text-green-400" />
                <span className="text-secondary-300 text-xs">Available Balance</span>
              </div>
              <p className="text-2xl font-bold">
                ${availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-secondary-400 mt-1">
                ≈ KES {(availableBalance * KES_RATE).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-2 text-secondary-300 text-sm">
              <div className="flex items-center gap-1.5 bg-green-500/10 text-green-400 px-3 py-1.5 rounded-full">
                <TrendingUp className="w-3 h-3" />
                +18.5% this month
              </div>
              <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-full">
                <Flame className="w-3 h-3" />
                12 day streak
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`bg-white dark:bg-secondary-800 rounded-2xl border border-secondary-200 dark:border-secondary-700 p-6 hover:shadow-lg transition-all ${stat.borderColor}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
              </div>
              <span className="text-xs font-medium text-secondary-500 dark:text-secondary-400">{stat.change}</span>
            </div>
            <h3 className="text-xl lg:text-2xl font-bold text-secondary-900 dark:text-white mb-1">{stat.value}</h3>
            <p className="text-sm text-secondary-500 dark:text-secondary-400">{stat.title}</p>
          </div>
        ))}
      </div>

      {/* Daily momentum strip */}
      <div className="grid lg:grid-cols-[1.4fr_1fr_1fr] gap-4">
        <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 rounded-2xl p-5 text-white relative overflow-hidden animate-[float_6s_ease-in-out_infinite]">
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full border-[18px] border-white/10" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-emerald-100 text-xs uppercase tracking-wider font-semibold">Today&apos;s goal</p>
              <h2 className="text-xl font-bold mt-1">Complete 5 tasks</h2>
              <p className="text-sm text-emerald-100 mt-1">Keep your momentum going.</p>
            </div>
            <Target className="w-8 h-8 text-emerald-100" />
          </div>
          <div className="relative mt-5">
            <div className="flex justify-between text-xs text-emerald-100 mb-2"><span>{Math.min(recentTasks.filter(task => task.status === 'approved').length, 5)} of 5 completed</span><span>{Math.min(recentTasks.filter(task => task.status === 'approved').length * 20, 100)}%</span></div>
            <div className="h-2 bg-black/20 rounded-full overflow-hidden"><div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${Math.min(recentTasks.filter(task => task.status === 'approved').length * 20, 100)}%` }} /></div>
          </div>
        </div>
        <Link to="/dashboard/tasks" className="bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-2xl p-5 hover:-translate-y-1 hover:shadow-lg transition-all group">
          <div className="flex items-center justify-between"><div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center"><Gift className="w-5 h-5 text-amber-600" /></div><ArrowUpRight className="w-4 h-4 text-secondary-400 group-hover:text-emerald-600 transition-colors" /></div>
          <p className="text-xs text-secondary-500 mt-4">Daily challenge</p><h3 className="font-semibold text-secondary-900 dark:text-white mt-1">Find a quick win</h3><p className="text-sm text-secondary-500 mt-1">Explore tasks under 30 minutes.</p>
        </Link>
        <Link to="/dashboard/referrals" className="bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-2xl p-5 hover:-translate-y-1 hover:shadow-lg transition-all group">
          <div className="flex items-center justify-between"><div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"><Users className="w-5 h-5 text-blue-600" /></div><ArrowUpRight className="w-4 h-4 text-secondary-400 group-hover:text-emerald-600 transition-colors" /></div>
          <p className="text-xs text-secondary-500 mt-4">Community pulse</p><h3 className="font-semibold text-secondary-900 dark:text-white mt-1">Invite a teammate</h3><p className="text-sm text-secondary-500 mt-1">Earn rewards when they get started.</p>
        </Link>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Earnings Chart */}
        <div className="bg-white dark:bg-secondary-800 rounded-2xl border border-secondary-200 dark:border-secondary-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Earnings Overview</h2>
              <p className="text-sm text-secondary-500 dark:text-secondary-400">Your daily earnings this week</p>
            </div>
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
              <TrendingUp className="w-4 h-4" />
              +18.5%
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={earningsData}>
                <defs>
                  <linearGradient id="colorEarnings3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Earnings']}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                />
                <Area
                  type="monotone"
                  dataKey="earnings"
                  stroke="#16a34a"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorEarnings3)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Tasks Chart */}
        <div className="bg-white dark:bg-secondary-800 rounded-2xl border border-secondary-200 dark:border-secondary-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Tasks Completed</h2>
              <p className="text-sm text-secondary-500 dark:text-secondary-400">Your weekly progress</p>
            </div>
            <span className="text-sm text-secondary-500 dark:text-secondary-400">Last 4 weeks</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyProgress}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  formatter={(value: number) => [value, 'Tasks']}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                />
                <Bar dataKey="tasks" fill="#16a34a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Skill Progress & Recent Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Skill Progress */}
        <div className="bg-white dark:bg-secondary-800 rounded-2xl border border-secondary-200 dark:border-secondary-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Skill Progress</h2>
            <Link to="/dashboard/learning" className="text-sm text-primary-600 dark:text-primary-400 font-medium hover:text-primary-700 dark:hover:text-primary-300">
              View all
            </Link>
          </div>
          <div className="space-y-4">
            {skillProgress.map((skill, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">{skill.skill}</span>
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${i < skill.level ? 'fill-amber-400 text-amber-400' : 'text-secondary-200 dark:text-secondary-600'}`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-secondary-500 dark:text-secondary-400">{skill.progress}%</span>
                  </div>
                </div>
                <div className="h-2 bg-secondary-100 dark:bg-secondary-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full transition-all"
                    style={{ width: `${skill.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Achievement Badge */}
          <div className="mt-6 pt-6 border-t border-secondary-200 dark:border-secondary-700">
            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Award className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-secondary-900 dark:text-white">Top 1% Earner</p>
                <p className="text-xs text-secondary-500 dark:text-secondary-400">Awarded for exceptional performance</p>
              </div>
            </div>
          </div>

          <Link
            to="/dashboard/learning"
            className="mt-4 flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-colors"
          >
            Continue Learning <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white dark:bg-secondary-800 rounded-2xl border border-secondary-200 dark:border-secondary-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Recent Activity</h2>
            <Link to="/dashboard/my-tasks" className="text-sm text-primary-600 dark:text-primary-400 font-medium hover:text-primary-700 dark:hover:text-primary-300">
              View all
            </Link>
          </div>
          <div className="space-y-4">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-secondary-50 dark:bg-secondary-700/50 rounded-xl">
                  <div className="w-10 h-10 bg-secondary-200 dark:bg-secondary-600 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-secondary-200 dark:bg-secondary-600 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-secondary-200 dark:bg-secondary-600 rounded w-1/2"></div>
                  </div>
                </div>
              ))
            ) : recentTasks.length > 0 ? (
              recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-4 p-4 bg-secondary-50 dark:bg-secondary-700/50 rounded-xl hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
                >
                  <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Brain className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">
                      {task.task?.title || 'Task'}
                    </p>
                    <p className="text-xs text-secondary-500 dark:text-secondary-400">
                      {new Date(task.started_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        task.status === 'approved'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : task.status === 'submitted'
                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      }`}
                    >
                      {task.status}
                    </span>
                    {task.earnings && (
                      <p className="text-sm font-semibold text-green-600 dark:text-green-400 mt-1">
                        +${task.earnings.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-secondary-100 dark:bg-secondary-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-secondary-300 dark:text-secondary-500" />
                </div>
                <p className="text-secondary-500 dark:text-secondary-400 font-medium">No recent activity</p>
                <p className="text-sm text-secondary-400 dark:text-secondary-500 mb-4">Start working on tasks to see your activity here</p>
                <Link
                  to="/dashboard/tasks"
                  className="inline-flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors"
                >
                  Start a task now <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Global Stats Banner */}
      <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/10 dark:via-emerald-900/10 dark:to-teal-900/10 rounded-2xl border border-green-200 dark:border-green-800/50 p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: Globe, label: 'Countries', value: '11+', color: 'text-blue-600 dark:text-blue-400' },
            { icon: Users, label: 'Active Workers', value: '8,420', color: 'text-green-600 dark:text-green-400' },
            { icon: Briefcase, label: 'Open Tasks', value: taskCount || '23', color: 'text-primary-600 dark:text-primary-400' },
            { icon: DollarSign, label: 'Total Paid Out', value: '$2.4M+', color: 'text-amber-600 dark:text-amber-400' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white dark:bg-secondary-800 rounded-xl flex items-center justify-center flex-shrink-0">
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-secondary-900 dark:text-white">{item.value}</p>
                <p className="text-xs text-secondary-500 dark:text-secondary-400">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
