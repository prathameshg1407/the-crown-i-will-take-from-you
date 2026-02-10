// components/RazorpayLoader.tsx
"use client"

import { useEffect, useState } from 'react'
import Script from 'next/script'

export default function RazorpayLoader() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    // Check if already loaded
    if (window.Razorpay) {
      // console.log removed'Razorpay already available')
      setStatus('ready')
    }
  }, [])

  return (
    <Script
      src="https://checkout.razorpay.com/v1/checkout.js"
      strategy="afterInteractive"
      onLoad={() => {
        // console.log removed'Razorpay script loaded')
        setStatus('ready')
      }}
      onError={() => {
        console.error('Failed to load Razorpay')
        setStatus('error')
      }}
    />
  )
}