import { useAuth } from "../contexts/AuthContext";
import { Navigate } from "react-router-dom";

export default function LoginPage() {
  const { user, loading, signIn } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="bg-surface border border-border rounded-2xl p-8 w-full max-w-sm text-center shadow-2xl">
        <h1 className="text-2xl font-bold text-text mb-1">UGC NET Practice</h1>
        <p className="text-sm text-muted mb-8">
          Sign in to manage your mock tests
        </p>
        <button
          onClick={signIn}
          className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold rounded-lg px-4 py-3 hover:bg-gray-100 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path
              fill="#4285F4"
              d="M44.5 20H24v8.5h11.7C34.2 33.6 29.6 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 6 1.1 8.2 2.9l6-6C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.9 0 20-7.9 20-21 0-1.4-.1-2.7-.5-4z"
            />
            <path
              fill="#34A853"
              d="M6.3 14.7l7 5.1C15 16.1 19.1 13 24 13c3.1 0 6 1.1 8.2 2.9l6-6C34.5 5.1 29.5 3 24 3c-7.6 0-14.1 4.2-17.7 10.7z"
            />
            <path
              fill="#FBBC05"
              d="M24 45c5.4 0 10.3-1.9 14.1-5l-6.5-5.3C29.6 36.2 26.9 37 24 37c-5.6 0-10.2-3.4-11.7-8.3l-7 5.4C8.9 41.1 15.9 45 24 45z"
            />
            <path
              fill="#EA4335"
              d="M44.5 20H24v8.5h11.7c-.8 2.3-2.3 4.3-4.3 5.7l6.5 5.3C42.1 36.2 45 30.6 45 24c0-1.4-.1-2.7-.5-4z"
            />
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
}
