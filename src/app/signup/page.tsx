// app/(auth)/signup/page.tsx
"use client"

import { useState } from 'react'
import { useSignup } from '@/lib/auth/hooks'
import { useAuth } from '@/lib/auth/AuthContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Mail, Lock, User, Eye, EyeOff, ArrowLeft, Check, X } from 'lucide-react'
import { useEffect } from 'react'

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  
  const { signup, isLoading, error } = useSignup()
  const { isAuthenticated } = useAuth()
  const router = useRouter()

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, router])

  // Password strength validation
  const passwordValidation = {
    minLength: formData.password.length >= 8,
    hasUpperCase: /[A-Z]/.test(formData.password),
    hasLowerCase: /[a-z]/.test(formData.password),
    hasNumber: /[0-9]/.test(formData.password),
    hasSpecialChar: /[^A-Za-z0-9]/.test(formData.password),
  }

  const isPasswordStrong = Object.values(passwordValidation).every(Boolean)
  const passwordsMatch = formData.password && formData.password === formData.confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!agreedToTerms) {
      alert('Please agree to the terms and conditions')
      return
    }

    if (!isPasswordStrong) {
      alert('Please meet all password requirements')
      return
    }

    if (!passwordsMatch) {
      alert('Passwords do not match')
      return
    }

    try {
      await signup(formData.email, formData.password, formData.name || undefined)
    } catch (err) {
      // Error handled by hook
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  if (isAuthenticated) {
    return null
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

      {/* Signup Container */}
      <div className="flex items-center justify-center min-h-screen px-4 py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-heading text-neutral-100 mb-3">
              Create Account
            </h1>
            <p className="text-neutral-400 font-body">
              Join thousands of readers
            </p>
          </div>

          {/* Signup Form */}
          <div className="bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/60 rounded-xl p-8 shadow-2xl">
            {error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-800/50 rounded-lg">
                <p className="text-red-400 text-sm font-body">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name Field */}
              <div>
                <label 
                  htmlFor="name" 
                  className="block text-sm font-ui text-neutral-300 mb-2 tracking-wider uppercase"
                >
                  Name <span className="text-neutral-600">(Optional)</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your name"
                    className="w-full pl-11 pr-4 py-3 bg-black/40 border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-[#9f1239] focus:ring-1 focus:ring-[#9f1239] transition-all font-body"
                    disabled={isLoading}
                  />
                </div>
              </div>

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
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
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
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
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

                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="mt-3 space-y-2">
                    <PasswordRequirement 
                      met={passwordValidation.minLength}
                      text="At least 8 characters"
                    />
                    <PasswordRequirement 
                      met={passwordValidation.hasUpperCase}
                      text="One uppercase letter"
                    />
                    <PasswordRequirement 
                      met={passwordValidation.hasLowerCase}
                      text="One lowercase letter"
                    />
                    <PasswordRequirement 
                      met={passwordValidation.hasNumber}
                      text="One number"
                    />
                    <PasswordRequirement 
                      met={passwordValidation.hasSpecialChar}
                      text="One special character"
                    />
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label 
                  htmlFor="confirmPassword" 
                  className="block text-sm font-ui text-neutral-300 mb-2 tracking-wider uppercase"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-12 py-3 bg-black/40 border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-[#9f1239] focus:ring-1 focus:ring-[#9f1239] transition-all font-body"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {formData.confirmPassword && (
                  <div className="mt-2">
                    {passwordsMatch ? (
                      <p className="text-sm text-green-500 flex items-center gap-1">
                        <Check className="w-4 h-4" /> Passwords match
                      </p>
                    ) : (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <X className="w-4 h-4" /> Passwords do not match
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Terms & Conditions */}
              <div className="flex items-start gap-2">
                <input
                  id="terms"
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 bg-black/40 border border-neutral-700 rounded text-[#9f1239] focus:ring-[#9f1239] focus:ring-offset-0"
                  required
                  disabled={isLoading}
                />
                <label htmlFor="terms" className="text-sm text-neutral-400 font-body">
                  I agree to the{' '}
                  <Link href="/terms" className="text-[#9f1239] hover:text-[#be123c] underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-[#9f1239] hover:text-[#be123c] underline">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !agreedToTerms || !isPasswordStrong || !passwordsMatch}
                className="w-full py-3 px-6 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg font-heading text-sm tracking-[0.2em] uppercase hover:from-red-500 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-[#9f1239]/50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
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

            {/* Login Link */}
            <p className="text-center text-neutral-400 font-body">
              Already have an account?{' '}
              <Link 
                href="/login" 
                className="text-[#9f1239] hover:text-[#be123c] font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Password Requirement Component
function PasswordRequirement({ met, text }: { met: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      {met ? (
        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
      ) : (
        <X className="w-4 h-4 text-neutral-600 flex-shrink-0" />
      )}
      <span className={`text-xs font-body ${met ? 'text-green-500' : 'text-neutral-500'}`}>
        {text}
      </span>
    </div>
  )
}