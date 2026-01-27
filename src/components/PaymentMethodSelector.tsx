// components/PaymentMethodSelector.tsx
"use client"

import { CreditCard, Globe } from 'lucide-react'

export type PaymentMethod = 'razorpay' | 'paypal'

interface PaymentMethodSelectorProps {
  selected: PaymentMethod
  onChange: (method: PaymentMethod) => void
  isInternational: boolean
  className?: string
}

export default function PaymentMethodSelector({
  selected,
  onChange,
  isInternational,
  className = '',
}: PaymentMethodSelectorProps) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* Selector Buttons */}
      <div className="inline-flex bg-neutral-900/60 border border-neutral-800 rounded-xl p-1.5 gap-1">
        {/* Razorpay (India) */}
        <button
          onClick={() => onChange('razorpay')}
          className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-ui text-xs md:text-sm transition-all duration-200 ${
            selected === 'razorpay'
              ? 'bg-gradient-to-r from-[#9f1239] to-[#be123c] text-white shadow-lg shadow-red-900/30'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
          }`}
          aria-pressed={selected === 'razorpay'}
          aria-label="Pay with Razorpay (India)"
        >
          <CreditCard className="w-4 h-4" />
          <span className="hidden sm:inline">India (UPI/Cards)</span>
          <span className="sm:hidden">India</span>
        </button>
        
        {/* PayPal (International) */}
        <button
          onClick={() => onChange('paypal')}
          className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-ui text-xs md:text-sm transition-all duration-200 ${
            selected === 'paypal'
              ? 'bg-gradient-to-r from-[#003087] to-[#0070ba] text-white shadow-lg shadow-blue-900/30'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
          }`}
          aria-pressed={selected === 'paypal'}
          aria-label="Pay with PayPal (International)"
        >
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline">International (PayPal)</span>
          <span className="sm:hidden">PayPal</span>
        </button>
      </div>

      {/* Auto-selection hint for international users */}
      {isInternational && selected === 'razorpay' && (
        <p className="text-xs text-amber-400/90 bg-amber-900/20 px-3 py-1.5 rounded-full border border-amber-800/30">
          💡 PayPal recommended for international payments
        </p>
      )}

      {/* Info text based on selection */}
      <p className="text-xs text-neutral-500">
        {selected === 'razorpay' ? (
          <>UPI • Credit/Debit Cards • Net Banking • Wallets</>
        ) : (
          <>PayPal Balance • Credit/Debit Cards • Bank Account</>
        )}
      </p>
    </div>
  )
}