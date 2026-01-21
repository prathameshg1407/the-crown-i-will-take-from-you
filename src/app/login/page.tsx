// app/(auth)/login/page.tsx
"use client"

import { useState } from 'react'
import { useLogin } from '@/lib/auth/hooks'
import { useAuth } from '@/lib/auth/AuthContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { useEffect } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  
  const { login, isLoading, error } = useLogin()
  const { isAuthenticated } = useAuth()
  const router = useRouter()

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(email, password)
    } catch (err) {
      // Error handled by hook
    }
  }

  if (isAuthenticated) {
    return null // or loading spinner
  }

  return (
    <div className="min-h-screen bg-[#050505] relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/20 via-black to-black -z-10" />
      
      {/* Back to Home */}
      <Link 
        href="/"
        className="fixed top-6 left-6 z-50 flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-ui">Back to Home</span>
      </Link>

      {/* Login Container */}
      <div className="flex items-center justify-center min-h-screen px-4 py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-heading text-neutral-100 mb-3">
              Welcome Back
            </h1>
            <p className="text-neutral-400 font-body">
              Sign in to continue your journey
            </p>
          </div>

          {/* Login Form */}
          <div className="bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/60 rounded-xl p-8 shadow-2xl">
            {error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-800/50 rounded-lg">
                <p className="text-red-400 text-sm font-body">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div>
                <label 
                  htmlFor="email" 
                  className="block text-sm font-ui text-neutral-300 mb-2 tracking-wider uppercase"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full pl-11 pr-4 py-3 bg-black/40 border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-[#9f1239] focus:ring-1 focus:ring-[#9f1239] transition-all font-body"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label 
                  htmlFor="password" 
                  className="block text-sm font-ui text-neutral-300 mb-2 tracking-wider uppercase"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-12 py-3 bg-black/40 border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-[#9f1239] focus:ring-1 focus:ring-[#9f1239] transition-all font-body"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 bg-black/40 border border-neutral-700 rounded text-[#9f1239] focus:ring-[#9f1239] focus:ring-offset-0"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-neutral-400 group-hover:text-neutral-300 transition-colors font-body">
                    Remember me
                  </span>
                </label>

                <Link 
                  href="/forgot-password"
                  className="text-sm text-[#9f1239] hover:text-[#be123c] transition-colors font-body"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-6 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg font-heading text-sm tracking-[0.2em] uppercase hover:from-red-500 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-[#9f1239]/50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-800"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-neutral-900/40 text-neutral-500 font-ui uppercase tracking-wider">
                  Or
                </span>
              </div>
            </div>

            {/* Sign Up Link */}
            <p className="text-center text-neutral-400 font-body">
              Don't have an account?{' '}
              <Link 
                href="/signup" 
                className="text-[#9f1239] hover:text-[#be123c] font-medium transition-colors"
              >
                Create one
              </Link>
            </p>
          </div>

          {/* Footer Note */}
          <p className="text-center text-xs text-neutral-600 mt-6 font-body">
            By signing in, you agree to our{' '}
            <Link href="/terms" className="text-neutral-500 hover:text-neutral-400 underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-neutral-500 hover:text-neutral-400 underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}