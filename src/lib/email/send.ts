import { resend, EMAIL_CONFIG } from './resend'
import { 
  WelcomeEmail, 
  VerificationEmail, 
  PasswordResetEmail, 
  PurchaseConfirmationEmail,
  LoginAlertEmail 
} from './templates'
import { logger } from '@/lib/logger'
import { render } from '@react-email/render'

/**
 * Send welcome email with verification link
 */
export async function sendWelcomeEmail(
  to: string,
  name: string,
  verificationUrl: string
) {
  try {
    const html = await render(
      WelcomeEmail({ name, verificationUrl })
    )

    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to,
      subject: 'Welcome to The Crown I Will Take From You! 👑',
      html,
      replyTo: EMAIL_CONFIG.replyTo,
    })

    if (error) {
      logger.error({ error, to }, 'Failed to send welcome email')
      throw error
    }

    logger.info({ emailId: data?.id, to }, 'Welcome email sent')
    return data
  } catch (error) {
    logger.error({ error, to }, 'Error sending welcome email')
    throw error
  }
}

/**
 * Send email verification link
 */
export async function sendVerificationEmail(
  to: string,
  verificationUrl: string
) {
  try {
    const html = await render(
      VerificationEmail({ verificationUrl })
    )

    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to,
      subject: 'Verify Your Email Address',
      html,
      replyTo: EMAIL_CONFIG.replyTo,
    })

    if (error) {
      logger.error({ error, to }, 'Failed to send verification email')
      throw error
    }

    logger.info({ emailId: data?.id, to }, 'Verification email sent')
    return data
  } catch (error) {
    logger.error({ error, to }, 'Error sending verification email')
    throw error
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
) {
  try {
    const html = await render(
      PasswordResetEmail({ resetUrl })
    )

    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to,
      subject: 'Reset Your Password - The Crown',
      html,
      replyTo: EMAIL_CONFIG.replyTo,
    })

    if (error) {
      logger.error({ error, to }, 'Failed to send password reset email')
      throw error
    }

    logger.info({ emailId: data?.id, to }, 'Password reset email sent')
    return data
  } catch (error) {
    logger.error({ error, to }, 'Error sending password reset email')
    throw error
  }
}

/**
 * Send purchase confirmation email
 */
export async function sendPurchaseConfirmationEmail(
  to: string,
  name: string,
  tier: string,
  amount: number,
  paymentId: string,
  chaptersUnlocked: string
) {
  try {
    const html = await render(
      PurchaseConfirmationEmail({ 
        name, 
        tier, 
        amount, 
        paymentId, 
        chaptersUnlocked 
      })
    )

    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to,
      subject: `Purchase Confirmed - ${tier.charAt(0).toUpperCase() + tier.slice(1)} Pack Unlocked! 🎉`,
      html,
      replyTo: EMAIL_CONFIG.replyTo,
    })

    if (error) {
      logger.error({ error, to }, 'Failed to send purchase confirmation email')
      throw error
    }

    logger.info({ emailId: data?.id, to, tier }, 'Purchase confirmation email sent')
    return data
  } catch (error) {
    logger.error({ error, to }, 'Error sending purchase confirmation email')
    throw error
  }
}

/**
 * Send login alert email (optional security feature)
 */
export async function sendLoginAlertEmail(
  to: string,
  name: string,
  loginTime: string,
  ipAddress?: string,
  device?: string,
  location?: string
) {
  try {
    const html = await render(
      LoginAlertEmail({ name, loginTime, ipAddress, device, location })
    )

    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to,
      subject: 'New Login to Your Account - The Crown',
      html,
      replyTo: EMAIL_CONFIG.replyTo,
    })

    if (error) {
      logger.error({ error, to }, 'Failed to send login alert email')
      throw error
    }

    logger.info({ emailId: data?.id, to }, 'Login alert email sent')
    return data
  } catch (error) {
    logger.error({ error, to }, 'Error sending login alert email')
    throw error
  }
}