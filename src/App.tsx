import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Loader2 } from 'lucide-react';

// Landing Page
import LandingPage from './components/LandingPage';

// Auth Pages
import SignUpPage from './components/auth/SignUpPage';
import LoginPage from './components/auth/LoginPage';
import ForgotPasswordPage from './components/auth/ForgotPasswordPage';
import ResetPasswordPage from './components/auth/ResetPasswordPage';
import VerifyEmailPage from './components/auth/VerifyEmailPage';
import AuthCallbackPage from './components/auth/AuthCallbackPage';
import ProfileSetupPage from './components/auth/ProfileSetupPage';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Dashboard
import DashboardLayout from './components/dashboard/DashboardLayout';
import DashboardHome from './components/dashboard/DashboardHome';
import LearningHub from './components/dashboard/LearningHub';
import TaskMarketplace from './components/dashboard/TaskMarketplace';
import MyTasks from './components/dashboard/MyTasks';
import Wallet from './components/dashboard/Wallet';
import MpesaWithdrawals from './components/dashboard/MpesaWithdrawals';
import ResumeBuilder from './components/dashboard/ResumeBuilder';
import AIAssistant from './components/dashboard/AIAssistant';
import Referrals from './components/dashboard/Referrals';
import Settings from './components/dashboard/Settings';
import Leaderboard from './components/dashboard/Leaderboard';
import Achievements from './components/dashboard/Achievements';

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-secondary-600">Loading EarnIQ...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Auth Routes */}
      <Route path="/auth/signup" element={<SignUpPage />} />
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
      <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/auth/setup" element={<ProfileSetupPage />} />

      {/* Dashboard Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardHome />} />
        <Route path="learning" element={<LearningHub />} />
        <Route path="tasks" element={<TaskMarketplace />} />
        <Route path="my-tasks" element={<MyTasks />} />
        <Route path="wallet" element={<Wallet />} />
        <Route path="withdrawals" element={<MpesaWithdrawals />} />
        <Route path="resume" element={<ResumeBuilder />} />
        <Route path="assistant" element={<AIAssistant />} />
        <Route path="referrals" element={<Referrals />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="achievements" element={<Achievements />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Catch all - redirect to landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
