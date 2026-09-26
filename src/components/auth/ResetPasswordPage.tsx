import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, Eye, EyeOff, KeyRound, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function ResetPasswordPage() {
  const { session, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session) return;
  }, [session]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Your new password must be at least 8 characters.');
      return;
    }
    if (password !== confirmation) {
      setError('The passwords do not match.');
      return;
    }

    setSaving(true);
    const result = await updatePassword(password);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    setSuccess(true);
    setTimeout(() => navigate('/dashboard', { replace: true }), 1200);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-secondary-100 p-8">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <span className="text-2xl font-bold text-secondary-900">Earn<span className="text-emerald-600">IQ</span></span>
            </Link>
            <h1 className="text-2xl font-bold text-secondary-900 mb-2">Create a new password</h1>
            <p className="text-secondary-600 text-sm">Choose a strong password you have not used before.</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {success ? (
            <div className="text-center py-4">
              <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-secondary-900">Password updated</h2>
              <p className="text-sm text-secondary-600 mt-1">Taking you back to your dashboard...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-secondary-700 mb-2">New password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                  <input id="new-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" className="w-full pl-10 pr-12 py-3 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white" required />
                  <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-secondary-700 mb-2">Confirm password</label>
                <input id="confirm-password" type={showPassword ? 'text' : 'password'} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="w-full px-4 py-3 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white" required />
              </div>
              <button type="submit" disabled={saving} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3.5 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <><Loader2 className="w-5 h-5 animate-spin" /> Updating...</> : 'Update password'}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-secondary-600"><Link to="/auth/login" className="font-semibold text-emerald-600 hover:text-emerald-700">Back to sign in</Link></p>
        </div>
      </div>
    </div>
  );
}