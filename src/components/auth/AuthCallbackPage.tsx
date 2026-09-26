import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const completeSignIn = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!mounted) return;

      if (sessionError || !data.session) {
        setError(sessionError?.message || 'This verification link is invalid or has expired.');
        return;
      }

      navigate('/dashboard', { replace: true });
    };

    completeSignIn();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-xl font-bold text-secondary-900 mb-2">Verification link unavailable</h1>
          <p className="text-secondary-600 mb-4">{error}</p>
          <button onClick={() => navigate('/auth/signup')} className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white">
            Return to sign up
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center text-secondary-600">
      <Loader2 className="w-8 h-8 animate-spin mr-3" /> Completing verification...
    </div>
  );
}