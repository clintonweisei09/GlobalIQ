import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowUpRight,
  Calendar,
  Filter,
  AlertTriangle,
  Info,
  Smartphone,
  ShieldCheck,
  Loader2,
  TrendingUp,
  Wallet as WalletIcon,
  Zap,
  X,
  PartyPopper,
  Globe,
  ChevronDown,
  DollarSign,
} from 'lucide-react';
import type { Withdrawal } from '../../types/database';
import { CURRENCIES, formatCurrency as formatInCurrency, currencyFromCountry, type CurrencyCode } from '../../lib/currency';

const statusConfig: Record<string, { color: string; bg: string; icon: React.ReactElement; label: string }> = {
  pending: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: <Clock className="w-4 h-4" />, label: 'Pending' },
  processing: { color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: <RefreshCw className="w-4 h-4 animate-spin" />, label: 'Processing' },
  completed: { color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: <CheckCircle2 className="w-4 h-4" />, label: 'Completed' },
  failed: { color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: <AlertCircle className="w-4 h-4" />, label: 'Failed' },
  cancelled: { color: 'text-secondary-700', bg: 'bg-secondary-50 border-secondary-200', icon: <X className="w-4 h-4" />, label: 'Cancelled' },
};

const KES_RATE = 150;

export default function MpesaWithdrawals() {
  const { profile, wallet, refreshWallet } = useAuth();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState('');
  const [withdrawStage, setWithdrawStage] = useState<'idle' | 'initiating' | 'waiting' | 'success' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ kes: number; recipient: string } | null>(null);
  const [withdrawDestination, setWithdrawDestination] = useState<'phone' | 'till'>('phone');
  const [withdrawTillNumber, setWithdrawTillNumber] = useState('1712962');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);
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
    return () => stopPolling();
  }, [profile, filterStatus]);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const loadData = async () => {
    setLoading(true);

    let query = supabase
      .from('withdrawals')
      .select('*')
      .eq('user_id', profile?.id || '');

    if (filterStatus) {
      query = query.eq('status', filterStatus);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (!error && data) {
      setWithdrawals(data);
    }

    setLoading(false);
  };

  const pollWithdrawal = (withdrawalId: string) => {
    stopPolling();
    setWithdrawStage('waiting');

    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      const { data, error } = await supabase
        .from('withdrawals')
        .select('status, mpesa_transaction_id, failure_reason')
        .eq('id', withdrawalId)
        .maybeSingle();

      if (error || !data) return;

      if (data.status === 'completed') {
        stopPolling();
        setWithdrawStage('success');
        setSuccessInfo({
          kes: parseFloat(withdrawAmount) * KES_RATE,
          recipient: withdrawDestination === 'phone' ? withdrawPhone : withdrawTillNumber,
        });
        await refreshWallet();
        loadData();
      } else if (data.status === 'failed') {
        stopPolling();
        setWithdrawStage('failed');
        setError(data.failure_reason || 'The M-Pesa withdrawal could not be completed.');
        await refreshWallet();
        loadData();
      }

      if (attempts > 20) {
        stopPolling();
      }
    }, 3000);
  };

  const handleWithdraw = async () => {
    if (!profile?.id || !withdrawAmount) return;

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < 1 || amount > withdrawableBalance) {
      setError(`Amount must be between $1.00 and ${formatCurrency(withdrawableBalance)}`);
      return;
    }

    const cleanPhone = withdrawPhone.replace(/[\s\-()]/g, '');
    const cleanTillNumber = withdrawTillNumber.replace(/\s/g, '');
    const phoneRegex = /^(07\d{8}|01\d{8}|2547\d{8}|\+2547\d{8}|\+2541\d{8}|2541\d{8})$/;
    if (withdrawDestination === 'phone' && !phoneRegex.test(cleanPhone)) {
      setError('Please enter a valid phone number (e.g., 0712345678 or 254712345678)');
      return;
    }
    if (withdrawDestination === 'till' && !/^\d{5,7}$/.test(cleanTillNumber)) {
      setError('Please enter a valid M-Pesa till number.');
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

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mpesa-b2c-withdrawal`;
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          phone: withdrawDestination === 'phone' ? cleanPhone : undefined,
          destinationType: withdrawDestination,
          tillNumber: withdrawDestination === 'till' ? cleanTillNumber : undefined,
          amountUSD: amount,
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        setWithdrawStage('failed');
        setError(data.error || 'Failed to initiate withdrawal. Please try again.');
        return;
      }

      // Test mode: withdrawal is already completed
      if (data.mode === 'test' && data.status === 'completed') {
        setWithdrawStage('success');
        setSuccessInfo({
          kes: data.kesAmount,
          recipient: data.recipient || data.phone || data.tillNumber,
        });
        await refreshWallet();
        loadData();
        return;
      }

      if (data.withdrawalId) {
        pollWithdrawal(data.withdrawalId);
      }
    } catch {
      setWithdrawStage('failed');
      setError('Unable to reach the withdrawal service. Please try again.');
    }
  };

  const formatCurrency = (amount: number) => formatInCurrency(amount, currency);

  const formatKES = (amount: number) => {
    return `KES ${Math.round(amount * KES_RATE).toLocaleString()}`;
  };

  const stats = {
    total: withdrawals.length,
    pending: withdrawals.filter((w) => w.status === 'pending' || w.status === 'processing').length,
    completed: withdrawals.filter((w) => w.status === 'completed').length,
    totalAmount: withdrawals
      .filter((w) => w.status === 'completed')
      .reduce((sum, w) => sum + w.amount, 0),
  };

  const availableBalance = wallet?.available_balance || 0;
  const lockedEarnings = wallet?.locked_earnings || 0;
  const lastEarningTime = wallet?.last_earning_time;
  const HOLD_HOURS = 48;
  const unlockTime = lastEarningTime ? new Date(lastEarningTime).getTime() + HOLD_HOURS * 60 * 60 * 1000 : 0;
  const hoursRemaining = unlockTime > Date.now() ? Math.ceil((unlockTime - Date.now()) / (60 * 60 * 1000)) : 0;
  const isLocked = hoursRemaining > 0 && lockedEarnings > 0;
  const withdrawableBalance = isLocked ? Math.max(0, availableBalance - lockedEarnings) : availableBalance;
  const quickAmounts = [
    { usd: 50, label: '$50' },
    { usd: 100, label: '$100' },
    { usd: 500, label: '$500' },
    { usd: 1000, label: '$1,000' },
    { usd: 5000, label: '$5,000' },
    { usd: 10000, label: '$10,000' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-green-600 via-emerald-700 to-teal-800 rounded-3xl p-6 lg:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold">M-Pesa Withdrawals</h1>
                <p className="text-green-100 text-sm">Withdraw your earnings directly to M-Pesa — instantly</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-4">
              <div className="bg-white/10 rounded-xl px-4 py-2 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <p className="text-green-100 text-xs">Available Balance</p>
                  <div className="relative" ref={currencyMenuRef}>
                    <button
                      onClick={() => setShowCurrencyMenu(!showCurrencyMenu)}
                      className="text-green-200 hover:text-white text-xs font-medium bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded transition-colors flex items-center gap-1"
                    >
                      <Globe className="w-3 h-3" />
                      {CURRENCIES[currency].flag} {currency}
                      <ChevronDown className="w-2.5 h-2.5" />
                    </button>
                    {showCurrencyMenu && (
                      <div className="absolute right-0 top-full mt-1 bg-white dark:bg-secondary-800 rounded-xl shadow-2xl border border-secondary-200 dark:border-secondary-700 py-2 w-56 max-h-72 overflow-y-auto z-20">
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
                <p className="text-xl font-bold">{formatCurrency(withdrawableBalance)}</p>
              </div>
              <div className="bg-white/10 rounded-xl px-4 py-2 backdrop-blur-sm">
                <p className="text-green-100 text-xs">Total Withdrawn</p>
                <p className="text-xl font-bold">{formatCurrency(wallet?.total_withdrawn || 0)}</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setWithdrawPhone(wallet?.mpesa_phone || '');
              setWithdrawAmount('');
              setWithdrawStage('idle');
              setError(null);
              setSuccessInfo(null);
              setShowWithdrawModal(true);
            }}
            disabled={withdrawableBalance < 1}
            className="bg-white text-green-700 px-6 py-4 rounded-2xl font-bold hover:bg-green-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
          >
            <ArrowUpRight className="w-5 h-5" />
            New Withdrawal
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Requests', value: stats.total, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'In Progress', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Total Received', value: formatKES(stats.totalAmount), icon: WalletIcon, color: 'text-primary-600', bg: 'bg-primary-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-secondary-800 rounded-2xl border border-secondary-200 dark:border-secondary-700 p-5 hover:shadow-lg transition-shadow">
            <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-sm text-secondary-500 dark:text-secondary-400">{stat.label}</p>
            <p className="text-xl font-bold text-secondary-900 dark:text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 border border-green-200 dark:border-green-800/50 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-green-900 dark:text-green-300 mb-3">How M-Pesa Withdrawals Work</h3>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                'Enter the amount you want to withdraw in USD',
                'Provide your M-Pesa phone number (Safaricom)',
                'We convert to KES at the current rate (1 USD = 150 KES)',
                'You receive a real M-Pesa message on your phone with the funds',
                'Earnings are locked for 48 hours before withdrawal',
                'No hidden fees — EarnIQ covers all transfer charges',
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm text-green-800 dark:text-green-400">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-secondary-600 dark:text-secondary-400">
          <Filter className="w-5 h-5" />
          <span className="text-sm font-medium">Filter:</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {['pending', 'processing', 'completed', 'failed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(filterStatus === status ? null : status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                filterStatus === status
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-white dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 border border-secondary-200 dark:border-secondary-700 hover:border-primary-300'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Withdrawals List */}
      <div className="bg-white dark:bg-secondary-800 rounded-2xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-secondary-50 dark:bg-secondary-700/50 rounded-xl">
                <div className="w-12 h-12 bg-secondary-200 dark:bg-secondary-600 rounded-xl"></div>
                <div className="flex-1">
                  <div className="h-4 bg-secondary-200 dark:bg-secondary-600 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-secondary-200 dark:bg-secondary-600 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : withdrawals.length > 0 ? (
          <div className="divide-y divide-secondary-100 dark:divide-secondary-700">
            {withdrawals.map((withdrawal) => {
              const config = statusConfig[withdrawal.status] || statusConfig.pending;
              return (
                <div
                  key={withdrawal.id}
                  className="p-5 lg:p-6 hover:bg-secondary-50 dark:hover:bg-secondary-700/30 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${config.bg} ${config.color} border`}>
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <p className="font-bold text-lg text-secondary-900 dark:text-white">
                          {formatCurrency(withdrawal.amount)}
                        </p>
                        <span className="text-secondary-400 dark:text-secondary-500">→</span>
                        <p className="text-secondary-600 dark:text-secondary-400 font-medium">
                          {formatKES(withdrawal.amount)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-secondary-500 dark:text-secondary-400">
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-4 h-4" />
                          {withdrawal.mpesa_till_number || withdrawal.mpesa_phone || 'M-Pesa destination'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          {new Date(withdrawal.created_at).toLocaleDateString()} at{' '}
                          {new Date(withdrawal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {withdrawal.mpesa_transaction_id && withdrawal.status === 'completed' && (
                          <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium">
                            <Zap className="w-4 h-4" />
                            {withdrawal.mpesa_transaction_id.slice(0, 12)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-4 py-1.5 rounded-lg text-sm font-medium border ${config.bg} ${config.color}`}>
                        {config.label}
                      </span>
                    </div>
                  </div>

                  {withdrawal.failure_reason && (
                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-700 dark:text-red-300">Withdrawal Failed</p>
                        <p className="text-sm text-red-600 dark:text-red-400">{withdrawal.failure_reason}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-16 text-center">
            <div className="w-20 h-20 bg-secondary-100 dark:bg-secondary-700 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Smartphone className="w-10 h-10 text-secondary-300 dark:text-secondary-500" />
            </div>
            <h3 className="text-xl font-bold text-secondary-900 dark:text-white mb-2">No withdrawals yet</h3>
            <p className="text-secondary-600 dark:text-secondary-400 mb-6 max-w-sm mx-auto">
              Withdraw your earnings straight to your M-Pesa wallet. You'll get a confirmation message on your phone.
            </p>
            <button
              onClick={() => {
                setWithdrawPhone(wallet?.mpesa_phone || '');
                setWithdrawAmount('');
                setWithdrawStage('idle');
                setError(null);
                setSuccessInfo(null);
                setShowWithdrawModal(true);
              }}
              className="bg-green-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-green-700 transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-2"
            >
              <ArrowUpRight className="w-5 h-5" />
              Make First Withdrawal
            </button>
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
                  stopPolling();
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
                 'Withdraw to M-Pesa'}
              </h2>
              <p className="text-green-100 text-sm">
                {withdrawStage === 'success' ? 'Funds sent to your M-Pesa account' :
                 withdrawStage === 'waiting' ? 'Sending money to your phone...' :
                 'Real-time transfer via Safaricom B2C'}
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
                  {/* Error Display */}
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      {error}
                    </div>
                  )}

                  {/* Waiting State */}
                  {withdrawStage === 'waiting' && (
                    <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl flex items-start gap-3">
                      <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5 animate-spin" />
                      <div>
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                          Sending {formatKES(parseFloat(withdrawAmount))} to {withdrawPhone}
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                          This usually takes 10-30 seconds. Safaricom will confirm the transaction when it completes.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Balance Display */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-4 mb-5">
                    <p className="text-sm text-green-700 dark:text-green-400 mb-1">Available Balance</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {formatCurrency(withdrawableBalance)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <button type="button" onClick={() => setWithdrawDestination('phone')} className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${withdrawDestination === 'phone' ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'border-secondary-200 text-secondary-600 dark:border-secondary-600 dark:text-secondary-300'}`}>Phone number</button>
                    <button type="button" onClick={() => setWithdrawDestination('till')} className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${withdrawDestination === 'till' ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'border-secondary-200 text-secondary-600 dark:border-secondary-600 dark:text-secondary-300'}`}>Till number</button>
                  </div>

                  {/* M-Pesa Destination Input */}
                  {withdrawDestination === 'phone' ? <div className="mb-4">
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      M-Pesa Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400 dark:text-secondary-500" />
                      <input
                        type="tel"
                        value={withdrawPhone}
                        onChange={(e) => {
                          setWithdrawPhone(e.target.value);
                          setError(null);
                        }}
                        disabled={withdrawStage === 'initiating' || withdrawStage === 'waiting'}
                        placeholder="0712345678"
                        className="w-full pl-10 pr-4 py-3 border border-secondary-200 dark:border-secondary-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white disabled:opacity-60"
                      />
                    </div>
                    <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                      Enter your Safaricom number. You'll receive the funds here.
                    </p>
                  </div> : <div className="mb-4">
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">M-Pesa Till Number</label>
                    <input type="text" inputMode="numeric" value={withdrawTillNumber} onChange={(e) => { setWithdrawTillNumber(e.target.value); setError(null); }} disabled={withdrawStage === 'initiating' || withdrawStage === 'waiting'} placeholder="1712962" className="w-full px-4 py-3 border border-secondary-200 dark:border-secondary-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white disabled:opacity-60" />
                    <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">The till must be enabled for Safaricom B2B payments.</p>
                  </div>}

                  {/* Amount Input */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      Amount (USD)
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400 dark:text-secondary-500" />
                      <input
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => {
                          setWithdrawAmount(e.target.value);
                          setError(null);
                        }}
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
                        <p className="text-sm font-bold text-green-600 dark:text-green-400">
                          {formatKES(parseFloat(withdrawAmount))}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Quick Amount Buttons */}
                  <div className="grid grid-cols-3 gap-2 mb-5">
                    {quickAmounts.map((amt) => (
                      <button
                        key={amt.usd}
                        onClick={() => {
                          setWithdrawAmount(amt.usd.toString());
                          setError(null);
                        }}
                        disabled={amt.usd > withdrawableBalance || withdrawStage === 'initiating' || withdrawStage === 'waiting'}
                        className="py-2 px-3 rounded-lg text-sm font-medium bg-secondary-50 dark:bg-secondary-700 text-secondary-700 dark:text-secondary-300 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-900/20 dark:hover:text-green-400 border border-secondary-200 dark:border-secondary-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {amt.label}
                      </button>
                    ))}
                  </div>

                  {/* Security Note */}
                  <div className="flex items-center gap-2 text-xs text-secondary-500 dark:text-secondary-400 mb-5">
                    <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                    Secured by Safaricom M-Pesa {withdrawDestination === 'phone' ? 'B2C' : 'B2B'} API
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        stopPolling();
                        setShowWithdrawModal(false);
                        setWithdrawStage('idle');
                        setError(null);
                        setWithdrawAmount('');
                        setWithdrawPhone('');
                      }}
                      disabled={withdrawStage === 'initiating' || withdrawStage === 'waiting'}
                      className="flex-1 py-3 rounded-xl font-medium text-secondary-600 dark:text-secondary-400 bg-secondary-100 dark:bg-secondary-700 hover:bg-secondary-200 dark:hover:bg-secondary-600 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleWithdraw}
                      disabled={withdrawStage === 'initiating' || withdrawStage === 'waiting' || (withdrawDestination === 'phone' ? !withdrawPhone : !withdrawTillNumber) || !withdrawAmount || parseFloat(withdrawAmount) < 1}
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
                          Withdraw Now
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
