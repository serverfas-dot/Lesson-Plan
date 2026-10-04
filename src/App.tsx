import { Component, ErrorInfo, ReactNode, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Auth/Login';
import { TeacherDashboard } from './components/Dashboard/TeacherDashboard';
import { LeadingTeacherDashboard } from './components/Dashboard/LeadingTeacherDashboard';
import { PrincipalDashboard } from './components/Dashboard/PrincipalDashboard';
import { SuperAdminDashboard } from './components/Dashboard/SuperAdminDashboard';
import { hasRequiredEnvVars } from './lib/supabase';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-300 to-sky-300 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-blue-50 rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Configuration Error</h1>
            <p className="text-slate-700 mb-4">
              The application failed to load. This is usually caused by missing environment variables in Netlify.
            </p>
            <div className="bg-slate-100 rounded p-4 mb-4">
              <p className="font-semibold text-sm mb-2">Required Environment Variables:</p>
              <ul className="text-sm space-y-1 text-slate-600">
                <li>• VITE_SUPABASE_URL</li>
                <li>• VITE_SUPABASE_ANON_KEY</li>
              </ul>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Please add these variables in your Netlify dashboard under Site Configuration → Environment Variables.
            </p>
            <details className="text-xs text-slate-500">
              <summary className="cursor-pointer font-semibold">Error Details</summary>
              <pre className="mt-2 p-2 bg-red-50 rounded overflow-auto">
                {this.state.error?.message}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [principalView, setPrincipalView] = useState<'principal' | 'leading_teacher'>('principal');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-300 to-sky-300 flex flex-col items-center justify-center">
        <div className="mb-6">
          <img
            src={`${import.meta.env.BASE_URL}school-logo.png`}
            alt="Loading"
            className="w-24 h-24 object-contain animate-pulse"
          />
        </div>
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-100 border-t-white"></div>
        <p className="mt-4 text-white font-medium">Loading...</p>
      </div>
    );
  }

  if (!user || !profile) {
    return <Login />;
  }

  switch (profile.role) {
    case 'teacher':
      return <TeacherDashboard />;
    case 'leading_teacher':
      return <LeadingTeacherDashboard />;
    case 'principal':
      return (
        <div>
          <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 py-2 flex items-center gap-2">
              <span className="text-sm text-slate-500 font-medium mr-2">View as:</span>
              <button
                onClick={() => setPrincipalView('principal')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                  principalView === 'principal'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Principal
              </button>
              <button
                onClick={() => setPrincipalView('leading_teacher')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                  principalView === 'leading_teacher'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Leading Teacher
              </button>
            </div>
          </div>
          {principalView === 'principal' ? <PrincipalDashboard /> : <LeadingTeacherDashboard />}
        </div>
      );
    case 'super_admin':
      return <SuperAdminDashboard />;
    default:
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-300 to-sky-300 flex items-center justify-center">
          <p className="text-white font-medium">Invalid user role</p>
        </div>
      );
  }
}

function App() {
  if (!hasRequiredEnvVars) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-300 to-sky-300 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 border-2 border-red-200">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Configuration Error</h1>
          <p className="text-slate-700 mb-4">
            The application failed to load. This is usually caused by missing environment variables in Netlify.
          </p>
          <div className="bg-slate-100 rounded p-4 mb-4">
            <p className="font-semibold text-sm mb-2">Required Environment Variables:</p>
            <ul className="text-sm space-y-1 text-slate-600">
              <li>• VITE_SUPABASE_URL</li>
              <li>• VITE_SUPABASE_ANON_KEY</li>
            </ul>
          </div>
          <p className="text-sm text-slate-600">
            Please add these variables in your Netlify dashboard under Site Configuration → Environment Variables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
