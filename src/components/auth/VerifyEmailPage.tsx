import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Sparkles,
  Mail,
  Smartphone,
  ArrowLeft,
  CheckCircle,
  Loader2,
  RefreshCw,
  KeyRound,
} from 'lucide-react';

export default function VerifyEmailPage() {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, resendSignupConfirmation, verifyVerificationCode } = useAuth();

  const verificationMethod = location.state?.verificationMethod || (user?.phone ? 'phone' : 'email');
  const contact = location.state?.contact || (verificationMethod === 'phone' ? user?.phone : user?.email);
  const isPhone = verificationMethod === 'phone';

  useEffect(() => {
    if (user?.email_confirmed_at || user?.phone_confirmed_at) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleResend = async () => {
    setResending(true);
    setError('');
    try {
      const result = await resendSignupConfirmation(contact, isPhone ? 'phone' : 'email');
      if (result.error) {
        setError(result.error);
        return;
      }
      setResent(true);
      setTimeout(() => setResent(false), 3000);
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : 'Unable to send a verification code.');
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!contact || code.length < 6) {
      setError('Enter the verification code sent to you.');
      return;
    }

    setVerifying(true);
    setError('');
    try {
      const result = await verifyVerificationCode(contact, code, isPhone ? 'phone' : 'email');
      if (result.error) {
        setError(result.error);
        return;
      }

      setVerified(true);
      setTimeout(() => navigate('/dashboard'), 800);
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : 'Unable to verify this code.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-100/50 to-transparent"></div>

      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-secondary-100 p-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-secondary-900">
              Earn<span className="text-primary-600">IQ</span>
            </span>
          </Link>

          <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
            {isPhone ? <Smartphone className="w-10 h-10 text-primary-600" /> : <Mail className="w-10 h-10 text-primary-600" />}
          </div>

          <h1 className="text-2xl font-bold text-secondary-900 mb-2">Verify your {isPhone ? 'mobile number' : 'email'}</h1>
          <p className="text-secondary-600 mb-6">
            {isPhone ? 'We\'ve sent a verification code to' : 'We\'ve sent a confirmation link to'}
            <br />
            <strong className="text-secondary-900">{contact}</strong>
          </p>

          {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-left text-sm text-red-700">{error}</p>}

          {verified ? (
            <div className="mb-6 flex items-center justify-center gap-2 rounded-lg bg-green-50 px-3 py-3 text-sm text-green-700">
              <CheckCircle className="w-5 h-5" /> Verified. Opening your dashboard...
            </div>
          ) : isPhone ? (
            <form onSubmit={handleVerify} className="mb-6 space-y-3">
              <label htmlFor="verification-code" className="sr-only">Verification code</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                <input
                  id="verification-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Enter 6-digit code"
                  className="w-full rounded-lg border border-secondary-200 py-3 pl-10 pr-4 text-center tracking-[0.35em]"
                  required
                />
              </div>
              <button type="submit" disabled={verifying} className="w-full rounded-lg bg-primary-600 px-4 py-3 font-medium text-white hover:bg-primary-700 disabled:opacity-50">
                {verifying ? <><Loader2 className="mr-2 inline h-5 w-5 animate-spin" /> Verifying...</> : 'Verify code'}
              </button>
            </form>
          ) : (
            <div className="mb-6 rounded-xl bg-emerald-50 px-4 py-4 text-left text-sm text-emerald-800">
              Open the confirmation link in your email. This page will continue automatically when verification is complete.
            </div>
          )}

          <div className="bg-secondary-50 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
              <div className="text-left text-sm text-secondary-600">
                <p className="font-medium text-secondary-900 mb-1">Check your inbox</p>
                <p>{isPhone ? 'Enter the code sent to you to verify your account. Codes expire shortly for your security.' : 'Use the confirmation link in your email to activate your account securely.'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleResend}
              disabled={resending || resent}
              className="w-full bg-white border border-secondary-200 text-secondary-700 py-3 px-4 rounded-lg font-medium hover:bg-secondary-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {resending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : resent ? (
                <>
                  <CheckCircle className="w-5 h-5 text-primary-600" />
                  {isPhone ? 'Code sent!' : 'Email sent!'}
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  {isPhone ? 'Resend verification code' : 'Resend confirmation email'}
                </>
              )}
            </button>

            <Link
              to="/auth/signup"
              className="block w-full text-secondary-600 py-3 px-4 rounded-lg font-medium hover:bg-secondary-50 transition-colors"
            >
              Use a different contact
            </Link>
          </div>

          <p className="mt-8 text-sm text-secondary-500">
            Already verified?{' '}
            <Link to="/auth/login" className="text-primary-600 font-medium hover:text-primary-700">
              Sign in
            </Link>
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-secondary-600 hover:text-primary-600"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
