import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Sparkles,
  Mail,
  Smartphone,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Loader2,
  Eye,
  EyeOff,
  Shield,
  Zap,
} from 'lucide-react';

export default function SignUpPage() {
  const [contact, setContact] = useState('');
  const [verificationMethod, setVerificationMethod] = useState<'email' | 'phone'>('email');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<'worker' | 'client'>('worker');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const passwordStrength = () => {
    let s = 0;
    if (password.length >= 6) s++;
    if (password.length >= 10) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  };
  const strength = passwordStrength();
  const strengthLabels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
  const strengthColors = ['bg-secondary-200', 'bg-red-400', 'bg-amber-400', 'bg-blue-400', 'bg-emerald-400', 'bg-emerald-500'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (verificationMethod === 'phone' && !/^\+?2547\d{8}$/.test(contact.replace(/[\s-]/g, '')) && !/^07\d{8}$/.test(contact.replace(/[\s-]/g, ''))) {
      setError('Enter a valid Kenyan mobile number, for example 0712345678.');
      return;
    }

    setLoading(true);

    const { error: signUpError } = await signUp(contact, password, userType, verificationMethod);

    if (signUpError) {
      setError(signUpError);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);

    setTimeout(() => {
      navigate('/auth/verify-email', {
        state: {
          contact: verificationMethod === 'phone' ? contact.replace(/[\s-]/g, '').replace(/^0/, '+254') : contact,
          verificationMethod,
        },
      });
    }, 2000);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-red-50 flex items-center justify-center p-4">
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30 animate-bounce">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-secondary-900 mb-2">Account Created!</h2>
          <p className="text-secondary-600">Redirecting to verification...</p>
        </div>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-secondary-900 mb-1">Create your account</h1>
            <p className="text-secondary-600 text-sm">Join thousands earning on EarnIQ Africa</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-3">I want to:</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setUserType('worker')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    userType === 'worker'
                      ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-700 shadow-md shadow-emerald-500/10'
                      : 'border-secondary-200 hover:border-secondary-300 text-secondary-600'
                  }`}
                >
                  <User className="w-6 h-6 mx-auto mb-2" />
                  <span className="font-semibold text-sm">Work & Earn</span>
                  <p className="text-xs mt-1 opacity-70">Complete tasks for money</p>
                </button>
                <button
                  type="button"
                  onClick={() => setUserType('client')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    userType === 'client'
                      ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-700 shadow-md shadow-emerald-500/10'
                      : 'border-secondary-200 hover:border-secondary-300 text-secondary-600'
                  }`}
                >
                  <span className="w-6 h-6 mx-auto mb-2 block text-2xl">🏢</span>
                  <span className="font-semibold text-sm">Hire Workers</span>
                  <p className="text-xs mt-1 opacity-70">Post tasks & projects</p>
                </button>
              </div>
            </div>

            <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="contact" className="block text-sm font-medium text-secondary-700">
                    {verificationMethod === 'email' ? 'Email address' : 'Mobile number'}
                  </label>
                  <div className="flex gap-1 rounded-lg bg-secondary-100 p-1 text-xs">
                    <button type="button" onClick={() => { setVerificationMethod('email'); setContact(''); }} className={`px-2 py-1 rounded-md ${verificationMethod === 'email' ? 'bg-white text-emerald-700 shadow-sm' : 'text-secondary-500'}`}>Email</button>
                    <button type="button" onClick={() => { setVerificationMethod('phone'); setContact(''); }} className={`px-2 py-1 rounded-md ${verificationMethod === 'phone' ? 'bg-white text-emerald-700 shadow-sm' : 'text-secondary-500'}`}>SMS</button>
                  </div>
                </div>
                <div className="relative">
                  {verificationMethod === 'email' ? <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" /> : <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />}
                  <input
                    id="contact"
                    type={verificationMethod === 'email' ? 'email' : 'tel'}
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white transition-all"
                    placeholder={verificationMethod === 'email' ? 'you@example.com' : '0712345678'}
                    required
                  />
                </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-secondary-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white transition-all"
                  placeholder="At least 6 characters"
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
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all ${i < strength ? strengthColors[strength] : 'bg-secondary-200'}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-secondary-500 mt-1">{strengthLabels[strength]}</p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3.5 px-4 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 hover:scale-[1.01]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-secondary-500">
            <span className="flex items-center gap-1"><Shield className="w-4 h-4 text-emerald-500" /> Secure</span>
            <span className="flex items-center gap-1"><Zap className="w-4 h-4 text-amber-500" /> Free to join</span>
          </div>

          <p className="mt-6 text-center text-sm text-secondary-600">
            Already have an account?{' '}
            <Link to="/auth/login" className="font-semibold text-emerald-600 hover:text-emerald-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
