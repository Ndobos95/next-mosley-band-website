import bandConfig from '../../config/band.json'

export interface PaymentCategory {
  id: string
  name: string
  description: string
  amount: number // in cents
  allowPartialPayment: boolean
  required: boolean
}

export interface BandConfig {
  organization: {
    name: string
    shortName: string
    contactEmail: string
    phone: string
    website: string
  }
  branding: {
    primaryColor: string
    secondaryColor: string
    accentColor: string
    logoUrl: string
    faviconUrl: string
  }
  features: {
    payments: boolean
    fileManager: boolean
    calendar: boolean
    analytics: boolean
  }
  payments: {
    stripePublishableKey: string
    categories: PaymentCategory[]
  }
  calendar: {
    googleCalendarId: string
    publicView: boolean
  }
  analytics: {
    umamiWebsiteId: string
    umamiUrl: string
  }
}

export const config: BandConfig = bandConfig as BandConfig

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}