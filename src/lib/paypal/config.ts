import paypal from '@paypal/checkout-server-sdk'

function environment(): paypal.core.SandboxEnvironment | paypal.core.LiveEnvironment {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured')
  }

  if (process.env.PAYPAL_MODE === 'live') {
    return new paypal.core.LiveEnvironment(clientId, clientSecret)
  }
  return new paypal.core.SandboxEnvironment(clientId, clientSecret)
}

export function paypalClient(): paypal.core.PayPalHttpClient {
  return new paypal.core.PayPalHttpClient(environment())
}

// Convert INR to USD - returns string with 2 decimals
export function convertINRtoUSD(amountINR: number): string {
  const rate = parseFloat(process.env.USD_TO_INR_RATE || '83.5')
  const usd = amountINR / rate
  return usd.toFixed(2)
}

// Convert USD to INR (for storing)
export function convertUSDtoINR(amountUSD: number): number {
  const rate = parseFloat(process.env.USD_TO_INR_RATE || '83.5')
  return Math.round(amountUSD * rate)
}