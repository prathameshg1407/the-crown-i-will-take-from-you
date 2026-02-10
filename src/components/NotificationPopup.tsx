// components/NotificationPopup.tsx
"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import { X, Mail, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function NotificationPopup() {
  const { user, isAuthenticated } = useAuth()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isAuthenticated && user) {
      const storageKey = `support_notified_${user.id}`
      const alreadyNotified = localStorage.getItem(storageKey)

      if (!alreadyNotified) {
        // Show after a short delay for better UX
        const timer = setTimeout(() => {
          setIsVisible(true)
        }, 3000)
        return () => clearTimeout(timer)
      }
    } else {
      setIsVisible(false)
    }
  }, [isAuthenticated, user])

  const handleClose = () => {
    if (user) {
      localStorage.setItem(`support_notified_${user.id}`, 'true')
    }
    setIsVisible(false)
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:w-[400px] z-[100]"
        >
          <div className="relative overflow-hidden bg-[#0a0a0a] border border-[#9f1239]/30 rounded-xl shadow-[0_0_30px_rgba(159,18,57,0.2)] backdrop-blur-xl">
            {/* Background Polish */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#9f1239]/10 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
            
            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#9f1239]/20 flex items-center justify-center border border-[#9f1239]/40">
                  <Mail className="w-5 h-5 text-[#f43f5e]" />
                </div>
                
                <div className="flex-1 pr-6">
                  <h3 className="text-white font-heading text-lg tracking-wide mb-1">
                    Support Notice
                  </h3>
                  <p className="text-neutral-400 text-sm leading-relaxed">
                    If you are facing any issues email <span className="text-[#f43f5e] font-medium selection:bg-[#9f1239]">ownverso.officials.com</span>
                  </p>
                </div>

                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors duration-200"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-[#9f1239] hover:bg-[#be123c] text-white text-xs font-bold uppercase tracking-widest rounded transition-all duration-300 shadow-lg shadow-[#9f1239]/20 active:scale-95"
                >
                  Understood
                </button>
              </div>
            </div>

            {/* Accent Bar */}
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#9f1239] to-transparent opacity-50" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
