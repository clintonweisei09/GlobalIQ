import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  Wallet as WalletIcon,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Phone,
  Link2,
  Eye,
  EyeOff,
  Smartphone,
  ShieldCheck,
  Loader2,
  X,
  PartyPopper,
  Sparkles,
  Award,
  Globe,
  ChevronDown,
  Building2,
  DollarSign,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { Withdrawal } from '../../types/database';
import { Link } from 'react-router-dom';
import { CURRENCIES, formatCurrency as formatInCurrency, currencyFromCountry, type CurrencyCode } from '../../lib/currency';

const KES_RATE = 129.53;
type WalletTransaction = {
  id: string;
  status: string;
  earnings: number | null;
  created_at: string;
  task?: { title?: string; payout_amount?: number } | null;
};

export default function Wallet() {
  const { profile, wallet, refreshWallet } = useAuth();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState<'mpesa' | 'bank'>('mpesa');
  const [bankName, setBankName] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankBranchCode, setBankBranchCode] = useState('');
  const [withdrawStage, setWithdrawStage] = useState<'idle' | 'initiating' | 'waiting' | 'success' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ kes: number; recipient: string } | null>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);
  const [withdrawDestination, setWithdrawDestination] = useState<'phone' | 'till'>('phone');
  const [withdrawTillNumber, setWithdrawTillNumber] = useState('1712962');
  const currencyMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile?.country) {
      setCurrency(currencyFromCountry(profile.country));
    }
  }, [profile?.country]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (currencyMenuRef.current && !currencyMenuRef.current.contains(e.target as Node)) {
        setShowCurrencyMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    loadData();
  }, [profile]);

  const loadData = async () => {
    setLoading(true);

    const { data: withdrawalsData } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('user_id', profile?.id || '')
      .order('created_at', { ascending: false })
      .limit(10);

    if (withdrawalsData) {
      setWithdrawals(withdrawalsData);
    }

    const { data: tasksData } = await supabase
      .from('user_tasks')
      .select('id, status, earnings, created_at, task:tasks(title, payout_amount)')
      .eq('user_id', profile?.id || '')
      .in('status', ['approved', 'completed'])
      .order('created_at', { ascending: false })
      .limit(20);

    if (tasksData) {
      setTransactions(tasksData);
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

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    cancelled: 'bg-secondary-100 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-300',
  };

  const handleWithdraw = async () => {
    if (!profile?.id || !withdrawAmount) return;

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < 1 || amount > withdrawableBalance) {
      setError(`Amount must be between $1.00 and ${formatCurrency(withdrawableBalance)}`);
      return;
    }

    const cleanPhone = withdrawPhone.replace(/\s/g, '');
    const cleanTillNumber = withdrawTillNumber.replace(/\s/g, '');
    if (withdrawMethod === 'mpesa' && withdrawDestination === 'phone') {
      const phoneRegex = /^(07\d{8}|2547\d{8}|\+2547\d{8})$/;
      if (!phoneRegex.test(cleanPhone)) {
        setError('Please enter a valid M-Pesa phone number (e.g., 0712345678)');
        return;
      }
    } else if (withdrawMethod === 'mpesa' && !/^\d{5,7}$/.test(cleanTillNumber)) {
      setError('Please enter a valid M-Pesa till number.');
      return;
    }
    if (withdrawMethod === 'bank' && (!bankName || !bankAccountName || !bankAccountNumber || !bankBranchCode)) {
      setError('Complete all bank details before requesting a transfer.');
      return;
    }

    setWithdrawStage('initiating');
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setWithdrawStage('failed');
        setError('Your session has expired. Please log in again.');
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${withdrawMethod === 'mpesa' ? 'mpesa-b2c-withdrawal' : 'bank-transfer-request'}`;
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          phone: withdrawMethod === 'mpesa' && withdrawDestination === 'phone' ? cleanPhone : undefined,
          destinationType: withdrawMethod === 'mpesa' ? withdrawDestination : undefined,
          tillNumber: withdrawMethod === 'mpesa' && withdrawDestination === 'till' ? cleanTillNumber : undefined,
          amountUSD: amount,
          bankName,
          bankAccountName,
          bankAccountNumber,
          bankBranchCode,
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        setWithdrawStage('failed');
        setError(data.error || 'Failed to initiate withdrawal.');
        return;
      }

      if (withdrawMethod === 'bank' && data.status === 'pending') {
        setWithdrawStage('idle');
        setError('Bank transfer request received. It will remain pending until a bank payout provider processes it.');
        return;
      }

      // Test mode: withdrawal is already completed
      if (data.mode === 'test' && data.status === 'completed') {
        setWithdrawStage('success');
        setSuccessInfo({ kes: data.kesAmount, recipient: data.recipient || data.phone || data.tillNumber });
        await refreshWallet();
        loadData();
        return;
      }

      // Live mode: poll for callback result
      if (data.withdrawalId) {
        setWithdrawStage('waiting');
        pollWithdrawal(data.withdrawalId);
      }
    } catch {
      setWithdrawStage('failed');
      setError('Unable to reach the withdrawal service.');
    }
  };

  const pollWithdrawal = (withdrawalId: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      const { data } = await supabase
        .from('withdrawals')
        .select('status, failure_reason')
        .eq('id', withdrawalId)
        .maybeSingle();

      if (!data) return;

      if (data.status === 'completed') {
        clearInterval(interval);
        setWithdrawStage('success');
        setSuccessInfo({
          kes: parseFloat(withdrawAmount) * KES_RATE,
          recipient: withdrawDestination === 'phone' ? withdrawPhone : withdrawTillNumber,
        });
        await refreshWallet();
        loadData();
      } else if (data.status === 'failed') {
        clearInterval(interval);
        setWithdrawStage('failed');
        setError(data.failure_reason || 'Withdrawal failed.');
        await refreshWallet();
        loadData();
      }

      if (attempts > 20) clearInterval(interval);
    }, 3000);
  };

  const formatCurrency = (amount: number) => formatInCurrency(amount, currency);

  const formatKES = (amount: number) => `KES ${Math.round(amount * KES_RATE).toLocaleString()}`;

  const availableBalance = wallet?.available_balance || 0;
  const totalEarned = wallet?.total_earnings || 0;
  const pendingEarnings = wallet?.pending_earnings || 0;
  const totalWithdrawn = wallet?.total_withdrawn || 0;
  const lockedEarnings = wallet?.locked_earnings || 0;
  const lastEarningTime = wallet?.last_earning_time;

  const HOLD_HOURS = 48;
  const now = Date.now();
  const unlockTime = lastEarningTime ? new Date(lastEarningTime).getTime() + HOLD_HOURS * 60 * 60 * 1000 : 0;
  const hoursRemaining = unlockTime > now ? Math.ceil((unlockTime - now) / (60 * 60 * 1000)) : 0;
  const isLocked = hoursRemaining > 0 && lockedEarnings > 0;
  const withdrawableBalance = isLocked ? Math.max(0, availableBalance - lockedEarnings) : availableBalance;

  const quickAmounts = [
    { usd: 100, label: '$100' },
    { usd: 500, label: '$500' },
    { usd: 1000, label: '$1,000' },
    { usd: 5000, label: '$5,000' },
    { usd: 10000, label: '$10,000' },
    { usd: 50000, label: '$50,000' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-slide-up">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl lg:text-3xl font-bold text-secondary-900 dark:text-white">Wallet</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 dark:bg-red-900/20 px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-400">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              Live balance
            </span>
          </div>
          <p className="text-secondary-600 dark:text-secondary-400">Manage your earnings and withdraw to M-Pesa</p>
        </div>
        <button
          onClick={() => {
            setWithdrawPhone(wallet?.mpesa_phone || '');
            setWithdrawMethod('mpesa');
            setWithdrawDestination('phone');
            setWithdrawTillNumber('1712962');
            setBankName('');
            setBankAccountName('');
            setBankAccountNumber('');
            setBankBranchCode('');
            setWithdrawAmount('');
            setWithdrawStage('idle');
            setError(null);
            setSuccessInfo(null);
            if (isLocked) {
              setError(`${lockedEarnings.toFixed(2)} is locked for ${hoursRemaining}h. Only ${withdrawableBalance.toFixed(2)} is available for withdrawal.`);
            }
            setShowWithdrawModal(true);
          }}
          disabled={withdrawableBalance < 1}
          className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg hover:shadow-xl"
        >
          <Phone className="w-5 h-5" />
          Withdraw to M-Pesa
        </button>
      </div>

      {/* Premium Balance Card */}
      <div className="bg-gradient-to-br from-secondary-900 via-secondary-800 to-red-950 dark:from-secondary-800 dark:via-secondary-700 dark:to-red-950 rounded-3xl p-6 lg:p-8 text-white relative overflow-hidden animate-slide-up [animation-delay:120ms]">
        <div className="absolute top-0 right-0 w-72 h-72 bg-red-500/15 rounded-full -translate-y-1/3 translate-x-1/3 blur-2xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-blue-500/10 rounded-full translate-y-1/3 -translate-x-1/4 blur-2xl" />

        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                  <WalletIcon className="w-4 h-4 text-red-400" />
                </div>
                <p className="text-secondary-300 text-sm">Available Balance</p>
              </div>
              <div className="flex items-center gap-3">
                <h2 className="text-4xl lg:text-5xl font-bold tracking-tight">
                  {showBalance ? formatCurrency(availableBalance) : '••••••••'}
                </h2>
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {showBalance ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
                <div className="relative" ref={currencyMenuRef}>
                  <button
                    onClick={() => setShowCurrencyMenu(!showCurrencyMenu)}
                    className="ml-1 flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    {CURRENCIES[currency].flag} {currency}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {showCurrencyMenu && (
                    <div className="absolute right-0 top-full mt-2 bg-white dark:bg-secondary-800 rounded-xl shadow-2xl border border-secondary-200 dark:border-secondary-700 py-2 w-56 max-h-72 overflow-y-auto z-20">
                      <p className="px-3 py-1.5 text-xs font-semibold text-secondary-400 uppercase tracking-wide">Display Currency</p>
                      {Object.values(CURRENCIES).map((c) => (
                        <button
                          key={c.code}
                          onClick={() => { setCurrency(c.code); setShowCurrencyMenu(false); }}
                          className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${currency === c.code ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-semibold' : 'text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700'}`}
                        >
                          <span className="text-lg">{c.flag}</span>
                          <div className="flex-1 text-left">
                            <p>{c.code} {c.symbol}</p>
                            <p className="text-xs text-secondary-400">{c.name}</p>
                          </div>
                          {currency === c.code && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-red-200 text-sm mt-2">
                ≈ {showBalance ? formatInCurrency(availableBalance, 'KES') : 'KSh ••••••••'}
              </p>
            </div>
            <div className="hidden md:flex flex-col items-end gap-3">
              <div className="flex items-center gap-2 bg-green-500/10 text-green-400 px-3 py-1.5 rounded-full text-sm">
                <TrendingUp className="w-4 h-4" />
                +18.5% this month
              </div>
              <div className="flex items-center gap-2 text-secondary-400 text-xs">
                <ShieldCheck className="w-4 h-4 text-green-400" />
                Secured & Encrypted
              </div>
            </div>
          </div>

          {/* Quick Stats Inside Card */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Total Earned', value: totalEarned, icon: TrendingUp, accent: 'text-green-400' },
              { label: 'Pending', value: pendingEarnings, icon: Clock, accent: 'text-amber-400' },
              { label: 'Locked (48h)', value: lockedEarnings, icon: ShieldCheck, accent: 'text-blue-400' },
              { label: 'Withdrawn', value: totalWithdrawn, icon: ArrowUpRight, accent: 'text-purple-400' },
                { label: 'Available', value: withdrawableBalance, icon: CheckCircle2, accent: 'text-red-400' },
            ].map((stat, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-3 backdrop-blur-sm border border-white/5">
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className={`w-4 h-4 ${stat.accent}`} />
                  <span className="text-xs text-secondary-400">{stat.label}</span>
                </div>
                <p className="text-lg font-bold">
                  {showBalance ? formatCurrency(stat.value) : '••••'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts & Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Earnings Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-secondary-800 rounded-2xl border border-secondary-200 dark:border-secondary-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">Earnings Overview</h3>
              <p className="text-sm text-secondary-500 dark:text-secondary-400">Your daily earnings this week</p>
            </div>
            <div className="text-right">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(earningsData.reduce((sum, d) => sum + d.earnings, 0))}
              </p>
                <p className="text-xs text-red-600 dark:text-red-400 flex items-center justify-end gap-1">
                <TrendingUp className="w-3 h-3" />
                +18.5% from last week
              </p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={earningsData}>
                <defs>
                  <linearGradient id="colorEarnings2" x1="0" y1="0" x2="0" y2="1">
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
                    stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorEarnings2)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-secondary-800 rounded-2xl border border-secondary-200 dark:border-secondary-700 p-6">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link
              to="/dashboard/tasks"
              className="flex items-center justify-between p-3 bg-secondary-50 dark:bg-secondary-700/50 rounded-xl hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                </div>
                <span className="font-medium text-secondary-700 dark:text-secondary-300">View Tasks</span>
              </div>
              <ArrowRight className="w-4 h-4 text-secondary-400 group-hover:text-primary-600 transition-colors" />
            </Link>

            <Link
              to="/dashboard/withdrawals"
              className="flex items-center justify-between p-3 bg-secondary-50 dark:bg-secondary-700/50 rounded-xl hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <Phone className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="font-medium text-secondary-700 dark:text-secondary-300">M-Pesa History</span>
              </div>
              <ArrowRight className="w-4 h-4 text-secondary-400 group-hover:text-green-600 transition-colors" />
            </Link>

            <Link
              to="/dashboard/settings"
              className="flex items-center justify-between p-3 bg-secondary-50 dark:bg-secondary-700/50 rounded-xl hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Link2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="font-medium text-secondary-700 dark:text-secondary-300">Link M-Pesa</span>
              </div>
              <ArrowRight className="w-4 h-4 text-secondary-400 group-hover:text-blue-600 transition-colors" />
            </Link>
          </div>

          {/* Achievement Banner */}
          <div className="mt-6 pt-6 border-t border-secondary-200 dark:border-secondary-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                <Award className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-secondary-900 dark:text-white">Top Earner</p>
                <p className="text-xs text-secondary-500 dark:text-secondary-400">You're in the top 1%</p>
              </div>
            </div>
          </div>

          {/* Withdrawal History Preview */}
          <div className="mt-4 pt-4 border-t border-secondary-200 dark:border-secondary-700">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-secondary-900 dark:text-white">Recent Withdrawals</h4>
              <Link to="/dashboard/withdrawals" className="text-xs text-primary-600 dark:text-primary-400 font-medium hover:text-primary-700">
                View all
              </Link>
            </div>
            {withdrawals.length > 0 ? (
              <div className="space-y-2">
                {withdrawals.slice(0, 3).map((w) => (
                  <div key={w.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-secondary-900 dark:text-white">{formatCurrency(w.amount)}</p>
                      <p className="text-xs text-secondary-500 dark:text-secondary-400">{new Date(w.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[w.status]}`}>
                      {w.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-secondary-500 dark:text-secondary-400 text-center py-4">No withdrawals yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white dark:bg-secondary-800 rounded-2xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
        <div className="p-6 border-b border-secondary-200 dark:border-secondary-700">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">Earnings History</h3>
          <p className="text-sm text-secondary-500 dark:text-secondary-400">Your recent task earnings</p>
        </div>

        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-secondary-50 dark:bg-secondary-700/50 rounded-xl">
                <div className="w-10 h-10 bg-secondary-200 dark:bg-secondary-600 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-secondary-200 dark:bg-secondary-600 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-secondary-200 dark:bg-secondary-600 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : transactions.length > 0 ? (
          <div className="divide-y divide-secondary-100 dark:divide-secondary-700">
            {transactions.map((tx) => (
              <div key={tx.id} className="p-4 hover:bg-secondary-50 dark:hover:bg-secondary-700/30 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                    <ArrowDownRight className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="font-medium text-secondary-900 dark:text-white">{tx.task?.title || 'Task Completed'}</p>
                    <p className="text-sm text-secondary-500 dark:text-secondary-400">{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-red-600 dark:text-red-400">+{formatCurrency(tx.earnings || tx.task?.payout_amount || 0)}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[tx.status] || 'bg-green-100 text-green-700'}`}>
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-secondary-100 dark:bg-secondary-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-8 h-8 text-secondary-300 dark:text-secondary-500" />
            </div>
            <p className="text-secondary-500 dark:text-secondary-400 font-medium">No earnings yet</p>
            <p className="text-sm text-secondary-400 dark:text-secondary-500 mb-4">Complete tasks to start earning</p>
            <Link
              to="/dashboard/tasks"
              className="text-primary-600 dark:text-primary-400 font-medium hover:text-primary-700"
            >
              Browse Tasks
            </Link>
          </div>
        )}
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-secondary-800 rounded-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in">
            {/* Modal Header */}
            <div className="bg-gradient-to-br from-green-600 to-emerald-700 p-5 text-white relative">
              <button
                onClick={() => {
                  setShowWithdrawModal(false);
                  setWithdrawStage('idle');
                  setError(null);
                  setSuccessInfo(null);
                  setWithdrawAmount('');
                  setWithdrawPhone('');
                }}
                className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center mb-3 backdrop-blur-sm">
                {withdrawStage === 'success' ? (
                  <PartyPopper className="w-7 h-7" />
                ) : withdrawStage === 'failed' ? (
                  <AlertCircle className="w-7 h-7" />
                ) : (
                  <Smartphone className="w-7 h-7" />
                )}
              </div>
              <h2 className="text-xl font-bold mb-1">
                {withdrawStage === 'success' ? 'Withdrawal Successful!' :
                 withdrawStage === 'failed' ? 'Withdrawal Failed' :
                 withdrawStage === 'waiting' ? 'Processing...' :
                 withdrawStage === 'initiating' ? 'Initiating...' :
                 withdrawMethod === 'bank' ? 'Bank Transfer Request' : 'Withdraw to M-Pesa'}
              </h2>
              <p className="text-green-100 text-sm">
                {withdrawStage === 'success' ? 'Funds sent to your M-Pesa account' :
                 withdrawMethod === 'bank' ? 'Secure payout request for review' : 'Real-time transfer via Safaricom B2C'}
              </p>
            </div>

            <div className="p-5">
              {/* Success State */}
              {withdrawStage === 'success' && successInfo ? (
                <div className="text-center py-4">
                  <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-lg font-bold text-secondary-900 dark:text-white mb-1">
                    {formatKES(parseFloat(withdrawAmount))}
                  </p>
                  <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-4">
                    sent to {successInfo.recipient}
                  </p>
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-left">
                    <div className="flex items-start gap-2">
                      <Smartphone className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-green-800 dark:text-green-300">
                        Check your phone — you should receive an M-Pesa confirmation message with the transaction details.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowWithdrawModal(false);
                      setWithdrawStage('idle');
                      setSuccessInfo(null);
                      setWithdrawAmount('');
                      setWithdrawPhone('');
                    }}
                    className="mt-6 w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      {error}
                    </div>
                  )}

                  {withdrawStage === 'waiting' && (
                    <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl flex items-start gap-3">
                      <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5 animate-spin" />
                      <div>
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                          Sending {formatKES(parseFloat(withdrawAmount))} to {withdrawDestination === 'phone' ? withdrawPhone : withdrawTillNumber}
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                          This usually takes 10-30 seconds. Safaricom will confirm the transaction when it completes.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-4 mb-5">
                    <p className="text-sm text-green-700 dark:text-green-400 mb-1">Withdrawable Balance</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">{formatCurrency(withdrawableBalance)}</p>
                    {isLocked && <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">{formatCurrency(lockedEarnings)} remains locked for {hoursRemaining}h.</p>}
                  </div>

                  {withdrawMethod === 'mpesa' && (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <button type="button" onClick={() => setWithdrawDestination('phone')} className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${withdrawDestination === 'phone' ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'border-secondary-200 text-secondary-600 dark:border-secondary-600 dark:text-secondary-300'}`}>
                        Phone number
                      </button>
                      <button type="button" onClick={() => setWithdrawDestination('till')} className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${withdrawDestination === 'till' ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'border-secondary-200 text-secondary-600 dark:border-secondary-600 dark:text-secondary-300'}`}>
                        Till number
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <button type="button" onClick={() => setWithdrawMethod('mpesa')} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${withdrawMethod === 'mpesa' ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'border-secondary-200 text-secondary-600 dark:border-secondary-600 dark:text-secondary-300'}`}>
                      <Phone className="w-4 h-4" /> M-Pesa
                    </button>
                    <button type="button" onClick={() => setWithdrawMethod('bank')} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${withdrawMethod === 'bank' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'border-secondary-200 text-secondary-600 dark:border-secondary-600 dark:text-secondary-300'}`}>
                      <Building2 className="w-4 h-4" /> Bank transfer
                    </button>
                  </div>

                  <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                    M-Pesa payouts are sent through Safaricom and remain pending until the provider confirms the transaction.
                  </p>

                  {withdrawMethod === 'mpesa' && withdrawDestination === 'phone' ? <div className="mb-4">
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      M-Pesa Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400 dark:text-secondary-500" />
                      <input
                        type="tel"
                        value={withdrawPhone}
                        onChange={(e) => { setWithdrawPhone(e.target.value); setError(null); }}
                        disabled={withdrawStage === 'initiating' || withdrawStage === 'waiting'}
                        placeholder="0712345678"
                        className="w-full pl-10 pr-4 py-3 border border-secondary-200 dark:border-secondary-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white disabled:opacity-60"
                      />
                    </div>
                  </div> : withdrawMethod === 'mpesa' ? <div className="mb-4">
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      M-Pesa Till Number
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={withdrawTillNumber}
                      onChange={(e) => { setWithdrawTillNumber(e.target.value); setError(null); }}
                      disabled={withdrawStage === 'initiating' || withdrawStage === 'waiting'}
                      placeholder="1712962"
                      className="w-full px-4 py-3 border border-secondary-200 dark:border-secondary-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white disabled:opacity-60"
                    />
                  </div> : <div className="space-y-3 mb-4">
                    <p className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">Bank transfer requests are sent for review and require a configured payout provider before funds can be released.</p>
                    <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank name" className="w-full px-4 py-3 border border-secondary-200 dark:border-secondary-600 rounded-xl bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white" />
                    <input type="text" value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} placeholder="Account holder name" className="w-full px-4 py-3 border border-secondary-200 dark:border-secondary-600 rounded-xl bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white" />
                    <input type="text" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} placeholder="Account number" className="w-full px-4 py-3 border border-secondary-200 dark:border-secondary-600 rounded-xl bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white" />
                    <input type="text" value={bankBranchCode} onChange={(e) => setBankBranchCode(e.target.value)} placeholder="Branch / SWIFT code" className="w-full px-4 py-3 border border-secondary-200 dark:border-secondary-600 rounded-xl bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white" />
                  </div>}

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      Amount (USD)
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400 dark:text-secondary-500" />
                      <input
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => { setWithdrawAmount(e.target.value); setError(null); }}
                        disabled={withdrawStage === 'initiating' || withdrawStage === 'waiting'}
                        placeholder="0.00"
                        min="1"
                        max={withdrawableBalance}
                        step="0.01"
                        className="w-full pl-10 pr-4 py-3 border border-secondary-200 dark:border-secondary-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white disabled:opacity-60"
                      />
                    </div>
                    {withdrawAmount && parseFloat(withdrawAmount) > 0 && (
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-secondary-500 dark:text-secondary-400">You'll receive:</p>
                        <p className="text-sm font-bold text-green-600 dark:text-green-400">{formatKES(parseFloat(withdrawAmount))}</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-5">
                    {quickAmounts.map((amt) => (
                      <button
                        key={amt.usd}
                        onClick={() => { setWithdrawAmount(amt.usd.toString()); setError(null); }}
                        disabled={amt.usd > withdrawableBalance || withdrawStage === 'initiating' || withdrawStage === 'waiting'}
                        className="py-2 px-3 rounded-lg text-sm font-medium bg-secondary-50 dark:bg-secondary-700 text-secondary-700 dark:text-secondary-300 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-900/20 dark:hover:text-green-400 border border-secondary-200 dark:border-secondary-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {amt.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-secondary-500 dark:text-secondary-400 mb-5">
                    <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                    {withdrawMethod === 'mpesa' ? `Secured by Safaricom M-Pesa ${withdrawDestination === 'phone' ? 'B2C' : 'B2B'} API` : 'Bank details are encrypted and reviewed before payout'}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowWithdrawModal(false);
                        setWithdrawStage('idle');
                        setError(null);
                        setWithdrawAmount('');
                        setWithdrawPhone('');
                        setBankName('');
                        setBankAccountName('');
                        setBankAccountNumber('');
                        setBankBranchCode('');
                      }}
                      disabled={withdrawStage === 'initiating' || withdrawStage === 'waiting'}
                      className="flex-1 py-3 rounded-xl font-medium text-secondary-600 dark:text-secondary-400 bg-secondary-100 dark:bg-secondary-700 hover:bg-secondary-200 dark:hover:bg-secondary-600 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleWithdraw}
                      disabled={withdrawStage === 'initiating' || withdrawStage === 'waiting' || (withdrawMethod === 'mpesa' ? (withdrawDestination === 'phone' ? !withdrawPhone : !withdrawTillNumber) : (!bankName || !bankAccountName || !bankAccountNumber || !bankBranchCode)) || !withdrawAmount || parseFloat(withdrawAmount) < 1}
                      className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                    >
                      {withdrawStage === 'initiating' || withdrawStage === 'waiting' ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          {withdrawStage === 'waiting' ? 'Sending...' : 'Initiating...'}
                        </>
                      ) : (
                        <>
                          <ArrowUpRight className="w-5 h-5" />
                          {withdrawMethod === 'mpesa' ? 'Withdraw to M-Pesa' : 'Request bank transfer'}
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
    </div>
  );
}
