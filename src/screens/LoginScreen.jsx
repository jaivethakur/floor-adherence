import React, { useState } from 'react';
import { Clock, Lock, Mail, Eye, EyeOff, AlertCircle, ArrowRight, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email and password');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-full flex flex-col justify-center px-4 py-8 max-w-md mx-auto">
      {/* App Branding */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 mx-auto flex items-center justify-center shadow-xl shadow-indigo-600/30 ring-1 ring-white/20 mb-4">
          <Clock className="w-9 h-9 text-white" />
        </div>
        <h1 className="font-heading font-extrabold text-2xl text-white tracking-tight">
          CatchAbit Floor Hours
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          7-Hour Daily Target • Office & WFH Tracker
        </p>
      </div>

      {/* Login Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Work Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@catchabit.in"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl active-scale shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 text-sm disabled:opacity-50 mt-2"
          >
            <span>{loading ? 'Signing in...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Logins */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
            One-Tap Quick Logins
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('rahul@catchabit.in', 'password123')}
              className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-left transition-all active-scale"
            >
              <div className="flex items-center space-x-1.5 text-indigo-400 text-xs font-semibold">
                <User className="w-3.5 h-3.5" />
                <span>Rahul Sharma</span>
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">rahul@catchabit.in</p>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('priya@catchabit.in', 'password123')}
              className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-left transition-all active-scale"
            >
              <div className="flex items-center space-x-1.5 text-sky-400 text-xs font-semibold">
                <User className="w-3.5 h-3.5" />
                <span>Priya Patel</span>
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">priya@catchabit.in</p>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('amit@catchabit.in', 'password123')}
              className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-left transition-all active-scale"
            >
              <div className="flex items-center space-x-1.5 text-emerald-400 text-xs font-semibold">
                <User className="w-3.5 h-3.5" />
                <span>Amit Verma</span>
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">amit@catchabit.in</p>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('admin@catchabit.in', 'admin123')}
              className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-left transition-all active-scale"
            >
              <div className="flex items-center space-x-1.5 text-indigo-300 text-xs font-semibold">
                <User className="w-3.5 h-3.5" />
                <span>Jaivendra Singh</span>
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">admin@catchabit.in</p>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-slate-500">
        <p>Timezone: Asia/Kolkata (IST)</p>
        <p className="mt-0.5">Auto-checkout scheduled daily at 8:00 PM IST</p>
      </div>
    </div>
  );
}
