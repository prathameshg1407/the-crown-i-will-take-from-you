// types/paypal.d.ts
declare module '@paypal/checkout-server-sdk' {
  export namespace core {
    class PayPalHttpClient {
      constructor(environment: SandboxEnvironment | LiveEnvironment)
      execute<T = unknown>(request: unknown): Promise<{ result: T; statusCode: number }>
    }

    class SandboxEnvironment {
      constructor(clientId: string, clientSecret: string)
    }

    class LiveEnvironment {
      constructor(clientId: string, clientSecret: string)
    }
  }

  export namespace orders {
    class OrdersCreateRequest {
      prefer(preference: string): void
      requestBody(body: OrdersCreateRequestBody): void
    }

    class OrdersCaptureRequest {
      constructor(orderId: string)
      requestBody(body: Record<string, unknown>): void
    }

    interface OrdersCreateRequestBody {
      intent: 'CAPTURE' | 'AUTHORIZE'
      purchase_units: PurchaseUnit[]
      application_context?: ApplicationContext
    }

    interface PurchaseUnit {
      reference_id?: string
      description?: string
      custom_id?: string
      amount: {
        currency_code: string
        value: string
      }
    }

    interface ApplicationContext {
      brand_name?: string
      landing_page?: 'LOGIN' | 'BILLING' | 'NO_PREFERENCE'
      user_action?: 'CONTINUE' | 'PAY_NOW'
      shipping_preference?: 'NO_SHIPPING' | 'GET_FROM_FILE' | 'SET_PROVIDED_ADDRESS'
      return_url?: string
      cancel_url?: string
    }

    interface OrderResult {
      id: string
      status: 'CREATED' | 'SAVED' | 'APPROVED' | 'VOIDED' | 'COMPLETED' | 'PAYER_ACTION_REQUIRED'
      links?: Array<{
        href: string
        rel: string
        method: string
      }>
    }

    interface CaptureResult {
      id: string
      status: 'COMPLETED' | 'DECLINED' | 'PARTIALLY_REFUNDED' | 'PENDING' | 'REFUNDED' | 'FAILED'
      purchase_units: Array<{
        reference_id?: string
        payments: {
          captures: Array<{
            id: string
            status: string
            amount: {
              currency_code: string
              value: string
            }
          }>
        }
      }>
      payer?: {
        email_address?: string
        payer_id?: string
        name?: {
          given_name?: string
          surname?: string
        }
      }
    }
  }
}