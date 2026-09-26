import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Sparkles,
  Mail,
  Smartphone,
  Lock,
  ArrowRight,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Shield,
} from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [loginMode, setLoginMode] = useState<'password' | 'code'>('password');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { signIn, sendVerificationCode, verifyVerificationCode, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const contact = email.trim();
    if (loginMode === 'code') {
      if (code.length < 6) {
        setError('Enter the 6-digit verification code.');
        setLoading(false);
        return;
      }
      const { error: codeError } = await verifyVerificationCode(contact, code, method);
      if (codeError) {
        setError(codeError);
        setLoading(false);
        return;
      }
      navigate('/dashboard', { replace: true });
      return;
    }

    if (method !== 'email') {
      setError('Use the verification code option to sign in with SMS.');
      setLoading(false);
      return;
    }

    const { error: signInError } = await signIn(contact, password);

    if (signInError) {
      setError(signInError);
      setLoading(false);
      return;
    }

    // Navigation handled by useEffect watching user state
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-red-50 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-emerald-200/30 to-teal-200/20 rounded-full blur-3xl animate-pulse-slow"></div>
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-tr from-red-200/20 to-amber-200/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>

      <div className="relative w-full max-w-md animate-slide-up">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-secondary-100 p-8">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <span className="text-2xl font-bold text-secondary-900">
                Earn<span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">IQ</span>
              </span>
            </Link>
            <h1 className="text-2xl font-bold text-secondary-900 mb-1">Welcome back</h1>
            <p className="text-secondary-600 text-sm">Sign in to continue earning</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="email" className="block text-sm font-medium text-secondary-700">
                  {method === 'email' ? 'Email address' : 'Mobile number'}
                </label>
                <div className="flex gap-1 rounded-lg bg-secondary-100 p-1 text-xs">
                  <button type="button" onClick={() => { setMethod('email'); setEmail(''); setLoginMode('password'); }} className={`px-2 py-1 rounded-md ${method === 'email' ? 'bg-white text-emerald-700 shadow-sm' : 'text-secondary-500'}`}>Email</button>
                  <button type="button" onClick={() => { setMethod('phone'); setEmail(''); setLoginMode('code'); }} className={`px-2 py-1 rounded-md ${method === 'phone' ? 'bg-white text-emerald-700 shadow-sm' : 'text-secondary-500'}`}>SMS</button>
                </div>
              </div>
              <div className="relative">
                {method === 'email' ? <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" /> : <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />}
                <input
                  id="email"
                  type={method === 'email' ? 'email' : 'tel'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white transition-all"
                  placeholder={method === 'email' ? 'you@example.com' : '0712345678'}
                  required
                />
              </div>
            </div>

            {loginMode === 'password' ? <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-secondary-700">
                  Password
                </label>
                <Link to="/auth/forgot-password" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div> : <div>
              <label htmlFor="login-code" className="block text-sm font-medium text-secondary-700 mb-2">Verification code</label>
              <input
                id="login-code"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                placeholder="Enter 6-digit code"
                className="w-full px-4 py-3 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white text-center tracking-[0.35em]"
                required
              />
            </div>}

            <button
              type="button"
              onClick={async () => {
                setError('');
                const result = await sendVerificationCode(email, method);
                if (result.error) setError(result.error);
                else { setLoginMode('code'); setCode(''); }
              }}
              className="w-full text-sm font-medium text-emerald-700 hover:text-emerald-800"
            >
              {loginMode === 'password' ? 'Sign in with a verification code' : 'Resend verification code'}
            </button>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-secondary-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm text-secondary-600">Keep me signed in</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3.5 px-4 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 hover:scale-[1.01]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {loginMode === 'code' ? 'Verifying...' : 'Signing in...'}
                </>
              ) : (
                <>
                  {loginMode === 'code' ? 'Verify code' : 'Sign In'} <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-secondary-500">
            <span className="flex items-center gap-1"><Shield className="w-4 h-4 text-emerald-500" /> Secure login</span>
          </div>

          <p className="mt-6 text-center text-sm text-secondary-600">
            Don't have an account?{' '}
            <Link to="/auth/signup" className="font-semibold text-emerald-600 hover:text-emerald-700">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
