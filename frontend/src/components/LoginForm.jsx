import React, { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import authService from '../api/auth';

export default function LoginForm({ onSuccess, onSwitchToSignup }) {
  const [identifier, setIdentifier] = useState(''); // username or email
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const validate = () => {
    const errors = {};
    if (!identifier.trim()) {
      errors.identifier = 'Please enter your username or email address';
    }
    if (!password) {
      errors.password = 'Please enter your account password';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!validate()) return;

    setIsLoading(true);

    try {
      /**
       * MERN Backend Hook:
       * Dispatches login request to POST /api/auth/login.
       * If your teammates' backend is not running yet, authService automatically
       * enters Demo Mock Mode so you can see the full dashboard / success flow!
       */
      const result = await authService.login({
        identifier,
        password,
      });

      if (result.success) {
        setSuccessMsg(
          result.isMock
            ? '✓ Verified! Logged in (Preview Demo Mode)'
            : '✓ Welcome back! Authentication verified.'
        );

        setTimeout(() => {
          if (onSuccess) {
            onSuccess(result.data.user || { username: identifier, email: identifier });
          }
        }, 800);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Header title */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Welcome to <span className="text-amber-400">XorVest</span>
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          Access your personalized loan portfolio and repayment schedules.
        </p>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-950/50 border border-red-500/40 rounded-xl flex items-start space-x-2.5 text-xs text-red-300 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3 bg-emerald-950/50 border border-emerald-500/40 rounded-xl flex items-start space-x-2.5 text-xs text-emerald-300 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username or Email Input */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
            Username or Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (fieldErrors.identifier) setFieldErrors({ ...fieldErrors, identifier: '' });
              }}
              placeholder="e.g. john_doe or john@xorvest.com"
              className={`w-full pl-10 pr-4 py-2.5 bg-zinc-900/90 border ${
                fieldErrors.identifier ? 'border-red-500' : 'border-zinc-800 focus:border-amber-500'
              } rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 transition`}
            />
          </div>
          {fieldErrors.identifier && (
            <p className="mt-1 text-xs text-red-400">{fieldErrors.identifier}</p>
          )}
        </div>

        {/* Password Input with Visibility Toggle */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Password
            </label>
            <button
              type="button"
              onClick={() => alert('Password reset will send an automated reset token to your registered email when backend SMTP is connected.')}
              className="text-xs text-amber-400 hover:text-amber-300 hover:underline transition"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' });
              }}
              placeholder="Enter your security password"
              className={`w-full pl-10 pr-10 py-2.5 bg-zinc-900/90 border ${
                fieldErrors.password ? 'border-red-500' : 'border-zinc-800 focus:border-amber-500'
              } rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 transition`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-200"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="mt-1 text-xs text-red-400">{fieldErrors.password}</p>
          )}
        </div>

        {/* Remember Me */}
        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center space-x-2 text-zinc-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-0 focus:ring-offset-0"
            />
            <span>Remember session on this device</span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-sm tracking-wide shadow-lg shadow-amber-500/20 active:scale-[0.99] transition duration-200 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-black" />
              <span>Verifying Credentials...</span>
            </>
          ) : (
            <>
              <span>Sign In to XorVest</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Switch to Signup */}
      <div className="mt-6 text-center text-xs text-zinc-400 pt-4 border-t border-zinc-800">
        <span>Don't have an account yet? </span>
        <button
          type="button"
          onClick={onSwitchToSignup}
          className="text-amber-400 font-semibold hover:text-amber-300 hover:underline transition ml-1"
        >
          Create an Account
        </button>
      </div>
    </div>
  );
}
