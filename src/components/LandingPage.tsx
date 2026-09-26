import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Wallet,
  ArrowRight,
  CheckCircle2,
  Users,
  Star,
  ChevronDown,
  ChevronUp,
  Menu,
  X,
  Shield,
  Clock,
  DollarSign,
  Globe,
  Lock,
  Smartphone,
  BadgeCheck,
  RefreshCw,
  Quote,
  Zap,
  Target,
  CreditCard,
} from 'lucide-react';
import Logo from './Logo';

function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Live earnings ticker
  const [tickerAmount, setTickerAmount] = useState(2478934);
  useEffect(() => {
    const interval = setInterval(() => {
      setTickerAmount(prev => prev + Math.floor(Math.random() * 15 + 5));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const formatTicker = (val: number) => val.toLocaleString('en-US', { maximumFractionDigits: 0 });

  // Forex-style fluctuating earnings ticker
  const [forexAmount, setForexAmount] = useState(8472.50);
  const [forexDirection, setForexDirection] = useState<'up' | 'down'>('up');
  const [forexFlash, setForexFlash] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      setForexAmount(prev => {
        const change = (Math.random() - 0.35) * 80;
        const next = Math.max(1000, prev + change);
        setForexDirection(change >= 0 ? 'up' : 'down');
        setForexFlash(true);
        setTimeout(() => setForexFlash(false), 400);
        return next;
      });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Live African currency rates vs USD
  const [currencyPairs, setCurrencyPairs] = useState([
    { pair: 'USD/KES', flag: '🇰🇪', country: 'Kenya', rate: 150.25, prevRate: 150.25 },
    { pair: 'USD/NGN', flag: '🇳🇬', country: 'Nigeria', rate: 1585.4, prevRate: 1585.4 },
    { pair: 'USD/GHS', flag: '🇬🇭', country: 'Ghana', rate: 15.65, prevRate: 15.65 },
    { pair: 'USD/UGX', flag: '🇺🇬', country: 'Uganda', rate: 3785.0, prevRate: 3785.0 },
    { pair: 'USD/TZS', flag: '🇹🇿', country: 'Tanzania', rate: 2535.0, prevRate: 2535.0 },
    { pair: 'USD/ZAR', flag: '🇿🇦', country: 'South Africa', rate: 18.42, prevRate: 18.42 },
    { pair: 'USD/RWF', flag: '🇷🇼', country: 'Rwanda', rate: 1285.0, prevRate: 1285.0 },
    { pair: 'USD/ETB', flag: '🇪🇹', country: 'Ethiopia', rate: 58.75, prevRate: 58.75 },
    { pair: 'USD/EGP', flag: '🇪🇬', country: 'Egypt', rate: 48.85, prevRate: 48.85 },
    { pair: 'USD/MAD', flag: '🇲🇦', country: 'Morocco', rate: 9.95, prevRate: 9.95 },
  ]);
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrencyPairs(prev =>
        prev.map(c => {
          const volatility = c.rate > 1000 ? 3 : c.rate > 100 ? 0.5 : c.rate > 10 ? 0.08 : 0.02;
          const delta = (Math.random() - 0.48) * volatility;
          return { ...c, prevRate: c.rate, rate: Math.max(0.1, c.rate + delta) };
        })
      );
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Live trading events feed
  const [tradeEvents, setTradeEvents] = useState([
    { id: 1, user: 'Amara O.', action: 'completed task', amount: 42.5, currency: 'USD', time: 'just now' },
    { id: 2, user: 'Kevin M.', action: 'withdrew to M-Pesa', amount: 185.0, currency: 'KES', time: '12s ago' },
    { id: 3, user: 'Fatima M.', action: 'earned from task', amount: 65.2, currency: 'USD', time: '34s ago' },
    { id: 4, user: 'Priya S.', action: 'completed survey', amount: 12.0, currency: 'USD', time: '1m ago' },
  ]);
  useEffect(() => {
    const names = ['Amara O.', 'Kevin M.', 'Fatima M.', 'Priya S.', 'Daniel K.', 'Samantha L.', 'Kwame A.', 'Lerato N.'];
    const actions = ['completed task', 'earned from task', 'withdrew to M-Pesa', 'completed survey', 'withdrew to bank', 'finished annotation'];
    const interval = setInterval(() => {
      setTradeEvents(prev => {
        const newEvent = {
          id: Date.now(),
          user: names[Math.floor(Math.random() * names.length)],
          action: actions[Math.floor(Math.random() * actions.length)],
          amount: Math.round((Math.random() * 80 + 5) * 100) / 100,
          currency: Math.random() > 0.6 ? 'KES' : 'USD',
          time: 'just now',
        };
        return [newEvent, ...prev.slice(0, 3)];
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const livePayments = [
    { name: 'Amara O.', country: 'Nigeria', amount: 42.5, method: 'M-Pesa', time: '2 min ago' },
    { name: 'Kwame A.', country: 'Ghana', amount: 18.0, method: 'Bank Transfer', time: '5 min ago' },
    { name: 'Fatima M.', country: 'Kenya', amount: 65.2, method: 'M-Pesa', time: '8 min ago' },
    { name: 'Samantha L.', country: 'Philippines', amount: 27.75, method: 'GCash', time: '12 min ago' },
    { name: 'Daniel K.', country: 'Uganda', amount: 33.0, method: 'MTN Money', time: '15 min ago' },
    { name: 'Priya S.', country: 'India', amount: 51.5, method: 'UPI', time: '18 min ago' },
  ];

  const steps = [
    {
      icon: <Users className="w-7 h-7" />,
      title: 'Create Your Free Account',
      description: 'Sign up in under 2 minutes. No experience needed — just a phone or laptop.',
      step: 1,
    },
    {
      icon: <TrendingUp className="w-7 h-7" />,
      title: 'Complete Tasks',
      description: 'Choose from data annotation, writing, translation, research and more. Work on your own schedule.',
      step: 2,
    },
    {
      icon: <Wallet className="w-7 h-7" />,
      title: 'Get Paid Real Money',
      description: 'Earnings reflect on your account after task approval. Withdraw to M-Pesa or bank after 48 hours.',
      step: 3,
    },
  ];

  const taskCategories = [
    { icon: '📝', title: 'Writing & Translation', payout: '$5–25', tasks: '1,240 open', color: 'from-emerald-500 to-teal-600' },
    { icon: '🔍', title: 'Data Annotation', payout: '$4–15', tasks: '2,340 open', color: 'from-teal-500 to-cyan-600' },
    { icon: '📊', title: 'Research & Surveys', payout: '$3–10', tasks: '3,200 open', color: 'from-green-500 to-emerald-600' },
    { icon: '💻', title: 'Coding & Testing', payout: '$8–30', tasks: '950 open', color: 'from-cyan-500 to-blue-600' },
    { icon: '🎨', title: 'Design & Creative', payout: '$6–20', tasks: '680 open', color: 'from-emerald-600 to-green-700' },
    { icon: '📱', title: 'Social Media Tasks', payout: '$3–12', tasks: '1,560 open', color: 'from-teal-600 to-emerald-700' },
  ];

  const stats = [
    { value: '$2.4M+', label: 'Paid to members', icon: <DollarSign className="w-5 h-5" /> },
    { value: '180K+', label: 'Active earners', icon: <Users className="w-5 h-5" /> },
    { value: '48h', label: 'Withdrawal window', icon: <Clock className="w-5 h-5" /> },
    { value: '4.8/5', label: 'Trustpilot rating', icon: <Star className="w-5 h-5" /> },
  ];

  const trustBadges = [
    { icon: <Shield className="w-5 h-5" />, label: 'Secured Payments' },
    { icon: <BadgeCheck className="w-5 h-5" />, label: 'Verified Platform' },
    { icon: <Smartphone className="w-5 h-5" />, label: 'M-Pesa Integrated' },
    { icon: <Globe className="w-5 h-5" />, label: '40+ Countries' },
  ];

  const paymentMethods = [
    { icon: <Smartphone className="w-4 h-4" />, label: 'M-Pesa' },
    { icon: <CreditCard className="w-4 h-4" />, label: 'PayPal' },
    { icon: <Wallet className="w-4 h-4" />, label: 'Bank Transfer' },
    { icon: <Zap className="w-4 h-4" />, label: 'Airtel Money' },
    { icon: <Globe className="w-4 h-4" />, label: 'GCash' },
    { icon: <CreditCard className="w-4 h-4" />, label: 'UPI' },
  ];

  const testimonials = [
    {
      name: 'Amara Okafor',
      location: 'Lagos, Nigeria',
      quote: 'I was skeptical at first but EarnIQ actually pays. I earned $320 in my first month doing writing tasks. The money hit my bank account within 2 days of requesting withdrawal.',
      earnings: '$1,840',
      period: 'in 4 months',
      rating: 5,
    },
    {
      name: 'Kevin Mwangi',
      location: 'Nairobi, Kenya',
      quote: 'The M-Pesa withdrawal is so smooth. I complete data annotation tasks in the evening and withdraw on weekends. It\'s real extra income for my family.',
      earnings: '$2,200',
      period: 'in 6 months',
      rating: 5,
    },
    {
      name: 'Samantha Lopez',
      location: 'Manila, Philippines',
      quote: 'What I love is the transparency. You see exactly what each task pays before you start. No hidden fees, no scams. I\'ve been here 8 months and never had a late payment.',
      earnings: '$3,100',
      period: 'in 8 months',
      rating: 5,
    },
  ];

  const faqs = [
    {
      question: 'Is EarnIQ legit? How do I know I\'ll actually get paid?',
      answer: 'Yes. We\'ve paid over $2.4M to 180,000+ members across 40+ countries. Every transaction is tracked and visible in your wallet. After completing a task, it goes through a review process (submitted → accepted → processing → payment). Your earnings reflect on your account within 5–10 minutes of approval.',
    },
    {
      question: 'How does the payment process work?',
      answer: 'Once you submit a task, it goes through four stages: Submitted → Accepted → Processing → Waiting for Payment → Paid. The payment takes 5–10 minutes to process after approval, and the amount reflects on your account balance immediately. You can see the full progress tracker on your My Tasks page.',
    },
    {
      question: 'When can I withdraw my earnings?',
      answer: 'Earnings are locked for 48 hours after they reflect on your account. This is a security measure to prevent fraud. After 48 hours, you can withdraw to M-Pesa or your bank account. Most withdrawals are processed within minutes.',
    },
    {
      question: 'Why do I need to unlock tasks individually?',
      answer: 'Each task is locked separately with an unlock fee between KES 100 and KES 250 via M-Pesa. This ensures only serious workers access tasks, which keeps quality high and payouts competitive. When you unlock one task, others remain locked until you choose to unlock them too.',
    },
    {
      question: 'Is it free to join?',
      answer: 'Creating an account is 100% free. You only pay a small per-task unlock fee when you\'re ready to work on a specific task. There are no subscriptions, no hidden charges, and no fees to withdraw your money.',
    },
    {
      question: 'How much can I realistically earn?',
      answer: 'Earnings depend on the tasks you choose and time invested. Most active members earn $100–500 per month. Tasks pay between $3 and $30 each, and most take 15–60 minutes to complete.',
    },
  ];

  const footerLinks = {
    company: ['About Us', 'How It Works', 'Success Stories', 'Blog'],
    earn: ['Browse Tasks', 'Payment Proof', 'Leaderboard', 'Refer Friends'],
    support: ['Help Center', 'Contact Us', 'Payment Issues', 'Community'],
    legal: ['Privacy Policy', 'Terms of Service', 'Refund Policy'],
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-secondary-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <Link to="/">
              <Logo size={40} />
            </Link>

            <div className="hidden md:flex items-center gap-7">
              <a href="#how-it-works" className="text-secondary-700 hover:text-emerald-600 transition-colors font-medium relative group">How It Works
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-emerald-500 to-red-500 group-hover:w-full transition-all duration-300"></span>
              </a>
              <a href="#earnings" className="text-secondary-700 hover:text-emerald-600 transition-colors font-medium relative group">Payment Proof
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-emerald-500 to-red-500 group-hover:w-full transition-all duration-300"></span>
              </a>
              <a href="#tasks" className="text-secondary-700 hover:text-emerald-600 transition-colors font-medium relative group">Tasks
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-emerald-500 to-red-500 group-hover:w-full transition-all duration-300"></span>
              </a>
              <a href="#testimonials" className="text-secondary-700 hover:text-emerald-600 transition-colors font-medium relative group">Reviews
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-emerald-500 to-red-500 group-hover:w-full transition-all duration-300"></span>
              </a>
              <a href="#faq" className="text-secondary-700 hover:text-emerald-600 transition-colors font-medium relative group">FAQ
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-emerald-500 to-red-500 group-hover:w-full transition-all duration-300"></span>
              </a>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <Link to="/auth/login" className="px-4 py-2 text-secondary-700 font-medium hover:text-emerald-600 transition-colors">Sign In</Link>
              <Link to="/auth/signup" className="bg-gradient-to-r from-red-500 to-rose-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:from-red-600 hover:to-rose-700 transition-all shadow-md shadow-red-500/30 hover:scale-[1.03] hover:-translate-y-0.5">Start Earning</Link>
            </div>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-secondary-600">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-secondary-100 animate-fade-in">
            <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
              <a href="#how-it-works" className="block text-secondary-700 hover:text-emerald-600 font-medium">How It Works</a>
              <a href="#earnings" className="block text-secondary-700 hover:text-emerald-600 font-medium">Payment Proof</a>
              <a href="#tasks" className="block text-secondary-700 hover:text-emerald-600 font-medium">Tasks</a>
              <a href="#testimonials" className="block text-secondary-700 hover:text-emerald-600 font-medium">Reviews</a>
              <a href="#faq" className="block text-secondary-700 hover:text-emerald-600 font-medium">FAQ</a>
              <hr className="border-secondary-100" />
              <div className="flex flex-col gap-3">
                <Link to="/auth/login" className="text-center py-2 text-secondary-700 font-medium">Sign In</Link>
                <Link to="/auth/signup" className="bg-gradient-to-r from-red-500 to-rose-600 text-white text-center py-2.5 rounded-lg font-semibold">Start Earning</Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 md:pt-32 pb-16 md:pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-red-50 animate-gradient-shift bg-[length:200%_200%]"></div>
        <div className="absolute top-20 right-0 w-96 h-96 bg-gradient-to-br from-emerald-200/30 to-red-200/20 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-red-200/20 to-teal-200/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1.5s' }}></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Headline */}
            <div className="text-center lg:text-left animate-slide-up">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-100 to-red-100 text-emerald-800 px-4 py-2 rounded-full text-sm font-semibold mb-6 border border-emerald-200/50">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                ${formatTicker(tickerAmount)}+ paid to members
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-secondary-900 leading-[1.1] mb-6 text-balance">
                Get paid to complete{' '}
                <span className="landing-gradient-title">real online tasks.</span>
              </h1>

              <p className="text-lg md:text-xl text-secondary-600 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Join 180,000+ people worldwide earning extra income from their phone. Complete writing, research, and data tasks — get paid via M-Pesa or bank transfer.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10">
                <Link to="/auth/signup" className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-8 py-4 rounded-lg font-semibold hover:from-emerald-700 hover:to-teal-800 transition-all shadow-lg shadow-emerald-600/30 hover:-translate-y-0.5 text-lg">
                  Create Free Account <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a href="#earnings" className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-red-500 to-rose-600 border-2 border-red-400 rounded-lg hover:from-red-600 hover:to-rose-700 transition-all shadow-lg shadow-red-500/30 hover:-translate-y-0.5">
                  <BadgeCheck className="w-5 h-5" />
                  See Payment Proof
                </a>
              </div>

              {/* Trust badges */}
              <div className="grid grid-cols-2 gap-3 max-w-md mx-auto lg:mx-0">
                {trustBadges.map((badge, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-secondary-700">
                    <span className="text-emerald-600">{badge.icon}</span>
                    <span className="font-medium">{badge.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Live currency tracker + events */}
            <div className="relative animate-float hidden lg:block space-y-3">
              {/* Currency price tracker card */}
              <div className="bg-gradient-to-br from-secondary-900 via-secondary-800 to-emerald-950 rounded-2xl shadow-2xl p-4 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl"></div>
                <div className="flex items-center justify-between mb-3 relative">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold text-sm">Live Currency Rates</span>
                  </div>
                  <span className="bg-emerald-500/20 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs font-bold flex items-center gap-1 text-emerald-300">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                    LIVE
                  </span>
                </div>

                {/* Earnings ticker bar */}
                <div className="flex items-baseline gap-2 mb-3 pb-3 border-b border-white/10">
                  <span
                    className={`text-2xl font-bold tabular-nums transition-all duration-300 ${forexFlash ? (forexDirection === 'up' ? 'text-green-400 scale-105' : 'text-red-400 scale-105') : 'text-white'}`}
                  >
                    ${forexAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className={`flex items-center gap-0.5 text-xs font-bold ${forexDirection === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                    {forexDirection === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
                    {forexDirection === 'up' ? '+' : '-'}${Math.abs(forexAmount - 8472.50).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Currency rates list — compact */}
                <div className="grid grid-cols-2 gap-1.5">
                  {currencyPairs.map((cp, i) => {
                    const isUp = cp.rate >= cp.prevRate;
                    const pctChange = ((cp.rate - cp.prevRate) / cp.prevRate) * 100;
                    const decimals = cp.rate > 1000 ? 2 : cp.rate > 100 ? 2 : 2;
                    return (
                      <div key={i} className="bg-white/5 rounded-lg px-2.5 py-1.5 border border-white/5 hover:bg-white/10 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-xs font-medium text-secondary-300">
                            <span>{cp.flag}</span>
                            {cp.pair}
                          </span>
                          <span className={`text-xs font-bold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                            {isUp ? '▲' : '▼'} {Math.abs(pctChange).toFixed(2)}%
                          </span>
                        </div>
                        <p className={`text-sm font-bold tabular-nums mt-0.5 transition-colors duration-300 ${isUp ? 'text-green-300' : 'text-red-300'}`}>
                          {cp.rate.toFixed(decimals)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live trading events feed */}
              <div className="bg-white rounded-2xl shadow-xl border border-secondary-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin-slow" />
                    <span className="font-semibold text-secondary-900 text-sm">Live Trading Events</span>
                  </div>
                  <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    Streaming
                  </span>
                </div>
                <div className="space-y-2">
                  {tradeEvents.map((ev, i) => (
                    <div
                      key={ev.id}
                      className={`flex items-center justify-between text-sm ${i === 0 ? 'animate-slide-up' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-semibold text-xs ${ev.action.includes('withdrew') ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {ev.user.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-secondary-900 text-xs">{ev.user}</p>
                          <p className="text-xs text-secondary-400">{ev.action} · {ev.time}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-xs ${ev.action.includes('withdrew') ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {ev.currency === 'KES' ? `KES ${ev.amount.toFixed(2)}` : `+${ev.amount.toFixed(2)}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-16 md:mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-secondary-100 hover:border-emerald-300 hover:shadow-lg transition-all">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg mb-2 ${i % 2 === 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                  {stat.icon}
                </div>
                <p className="text-2xl md:text-3xl font-bold text-secondary-900">{stat.value}</p>
                <p className="text-sm text-secondary-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 md:py-24 bg-gradient-to-b from-white to-emerald-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              Simple 3-Step Process
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              <span className="landing-gradient-title">Start earning in minutes</span>
            </h2>
            <p className="text-lg text-secondary-600 max-w-2xl mx-auto">
              No special skills required. If you can use a phone, you can earn.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="relative group">
                <div className="bg-white rounded-2xl shadow-lg border border-secondary-100 p-8 h-full transition-all hover:shadow-xl hover:-translate-y-1">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                      {step.icon}
                    </div>
                    <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-sm">
                      {step.step}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-secondary-900 mb-3">{step.title}</h3>
                  <p className="text-secondary-600 leading-relaxed">{step.description}</p>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-6 transform -translate-y-1/2 z-10">
                    <ArrowRight className="w-6 h-6 text-emerald-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Payment Process Section */}
      <section id="earnings" className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              Transparent Payment Flow
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              <span className="landing-gradient-title">How you get paid</span>
            </h2>
            <p className="text-lg text-secondary-600 max-w-2xl mx-auto">
              Every task goes through a clear, trackable payment process. You always know where your money is.
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-4 mb-12">
            {[
              { step: '1', label: 'Submitted', desc: 'You finish and submit the task', icon: '📤' },
              { step: '2', label: 'Accepted', desc: 'Client reviews and accepts your work', icon: '✅' },
              { step: '3', label: 'Processing', desc: 'Payment is being processed (5–10 min)', icon: '⚙️' },
              { step: '4', label: 'Waiting', desc: 'Payment about to reflect on your account', icon: '⏳' },
              { step: '5', label: 'Paid', desc: 'Money reflects in your wallet balance', icon: '💰' },
            ].map((s, i) => (
              <div key={i} className="relative">
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-5 text-center h-full">
                  <div className="text-3xl mb-3">{s.icon}</div>
                  <div className="w-7 h-7 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-2">
                    {s.step}
                  </div>
                  <h3 className="font-bold text-secondary-900 text-sm mb-1">{s.label}</h3>
                  <p className="text-xs text-secondary-500 leading-relaxed">{s.desc}</p>
                </div>
                {i < 4 && (
                  <div className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                    <ArrowRight className="w-4 h-4 text-emerald-300" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Withdrawal notice */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6 flex items-start gap-4 max-w-3xl mx-auto">
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-secondary-900 mb-1">48-Hour Withdrawal Security Hold</h3>
              <p className="text-sm text-secondary-600 leading-relaxed">
                After earnings reflect on your account, they are held for 48 hours before you can withdraw. This security measure protects against fraud and ensures all payments are verified. After 48 hours, withdraw to M-Pesa or bank anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Task Categories */}
      <section id="tasks" className="py-16 md:py-24 bg-gradient-to-b from-emerald-50/50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              Earning Opportunities
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              <span className="landing-gradient-title">Choose how you want to earn</span>
            </h2>
            <p className="text-lg text-secondary-600 max-w-2xl mx-auto">
              Over 10,000 tasks available right now. Each task shows its payout upfront.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {taskCategories.map((cat, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-lg border border-secondary-100 p-6 group cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1">
                <div className={`w-14 h-14 bg-gradient-to-br ${cat.color} rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform`}>
                  {cat.icon}
                </div>
                <h3 className="text-lg font-bold text-secondary-900 mb-2">{cat.title}</h3>
                <div className="flex items-center justify-between pt-4 border-t border-secondary-100">
                  <div>
                    <p className="text-xs text-secondary-400">Average payout</p>
                    <p className="font-bold text-emerald-600">{cat.payout}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-secondary-400">Availability</p>
                    <p className="font-bold text-secondary-900 text-sm">{cat.tasks}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link to="/auth/signup" className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white bg-emerald-600 rounded-lg shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 transition-all hover:-translate-y-0.5">
              Browse All Tasks <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-16 md:py-24 bg-secondary-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block bg-emerald-900/50 text-emerald-300 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              Real Reviews
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              <span className="landing-gradient-title bg-gradient-to-r from-emerald-400 via-teal-400 to-red-400">Real people. Real payments.</span>
            </h2>
            <p className="text-lg text-secondary-300 max-w-2xl mx-auto">
              Don't take our word for it — hear from members who've cashed out.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-secondary-800/50 backdrop-blur-sm rounded-2xl p-6 border border-secondary-700 hover:border-emerald-500/50 transition-colors">
                <Quote className="w-8 h-8 text-emerald-600 mb-4" />
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(t.rating)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-emerald-400 text-emerald-400" />
                  ))}
                </div>
                <p className="text-secondary-200 mb-6 leading-relaxed text-sm">"{t.quote}"</p>
                <div className="flex items-center justify-between pt-4 border-t border-secondary-700">
                  <div>
                    <p className="font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-secondary-400">{t.location}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-emerald-400">{t.earnings}</p>
                    <p className="text-xs text-secondary-400">{t.period}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 md:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full text-sm font-semibold mb-4">FAQ</span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              <span className="landing-gradient-title">Questions? Answered.</span>
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-secondary-50 rounded-xl overflow-hidden border border-secondary-100">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className="font-semibold text-secondary-900">{faq.question}</span>
                  {openFaq === i ? <ChevronUp className="w-5 h-5 text-emerald-600 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-secondary-400 flex-shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 -mt-2">
                    <p className="text-secondary-600 leading-relaxed text-sm">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-emerald-600 via-teal-700 to-red-700 relative overflow-hidden animate-gradient-shift bg-[length:200%_200%]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 drop-shadow-lg">
            Your first payout is one task away
          </h2>
          <p className="text-lg text-emerald-100 mb-8 max-w-2xl mx-auto">
            Create your free account, complete your first task, and see your earnings reflect within minutes. No subscription, no hidden fees.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth/signup" className="bg-white text-emerald-700 hover:bg-emerald-50 font-bold px-8 py-4 rounded-lg shadow-xl transition-all hover:-translate-y-0.5 inline-flex items-center justify-center gap-2 text-lg">
              Create Free Account <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/auth/login" className="bg-gradient-to-r from-red-500 to-rose-600 border-2 border-red-400 text-white hover:from-red-600 hover:to-rose-700 font-semibold px-8 py-4 rounded-lg transition-all inline-flex items-center justify-center gap-2 text-lg shadow-lg shadow-red-500/30">
              Sign In
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-emerald-100">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4" /> Free to join
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4" /> No experience needed
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4" /> Withdraw to M-Pesa
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary-900 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Logo size={40} textClassName="text-white" />
              </div>
              <p className="text-secondary-400 mb-6 max-w-sm text-sm leading-relaxed">
                A trusted online earning platform. Complete tasks, get paid, and withdraw to M-Pesa or your bank account. Over $2.4M paid to members worldwide.
              </p>
              <div className="flex flex-wrap gap-3 mb-5">
                {trustBadges.map((badge, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-secondary-400 bg-secondary-800 rounded-lg px-3 py-1.5 hover:bg-secondary-700 hover:text-secondary-300 transition-colors">
                    <span className="text-emerald-500">{badge.icon}</span>
                    {badge.label}
                  </div>
                ))}
              </div>
              {/* Payment Methods */}
              <p className="text-xs font-semibold text-secondary-500 uppercase tracking-wide mb-3">Accepted Payment Methods</p>
              <div className="flex flex-wrap gap-2">
                {paymentMethods.map((method, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-secondary-300 bg-gradient-to-r from-secondary-800 to-secondary-750 border border-secondary-700 rounded-lg px-3 py-1.5 hover:border-emerald-600/50 hover:text-emerald-400 transition-all hover:scale-[1.03]">
                    <span className="text-emerald-500">{method.icon}</span>
                    {method.label}
                  </div>
                ))}
              </div>
            </div>

            {[
              { title: 'Company', links: footerLinks.company },
              { title: 'Earn', links: footerLinks.earn },
              { title: 'Support', links: footerLinks.support },
            ].map((col, i) => (
              <div key={i}>
                <h4 className="font-semibold text-white mb-4">{col.title}</h4>
                <ul className="space-y-3">
                  {col.links.map((link, j) => (
                    <li key={j}>
                      <a href="#" className="text-secondary-400 hover:text-emerald-400 transition-colors text-sm">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-secondary-800 pt-8 grid grid-cols-1 md:grid-cols-3 items-center gap-4">
            <p className="text-secondary-500 text-sm text-center md:text-left">© 2026 EarnIQ. All rights reserved.</p>
            <p className="text-sm text-center text-secondary-400">
              Developed by <span className="font-semibold text-white">Clinton Weisei</span>
            </p>
            <div className="flex justify-center md:justify-end gap-6">
              {footerLinks.legal.map((link, i) => (
                <a key={i} href="#" className="text-secondary-500 hover:text-emerald-400 text-sm transition-colors">{link}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
