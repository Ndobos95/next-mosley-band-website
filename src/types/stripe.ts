// TypeScript interfaces for Stripe cache data shape (t3dotgg pattern)

export interface StripeCustomerCache {
  customerId: string;
  payments: StripePaymentData[];
  totals: PaymentTotals;
  enrollments: StudentEnrollments;
  lastSync: string;
}

export interface StripePaymentData {
  id: string;
  amount: number; // in cents
  status: 'succeeded' | 'failed' | 'pending' | 'refunded';
  created: number; // Unix timestamp
  description: string;
  metadata: {
    studentName?: string;
    category?: 'Band Fees' | 'Spring Trip' | 'Equipment' | 'Donation';
    increment?: string; // e.g. "1 of 18" for Spring Trip payments
    notes?: string;
  };
}

export interface PaymentTotals {
  bandFeesPaid: number; // in cents
  tripPaid: number;     // in cents  
  equipmentPaid: number; // in cents
  donationsPaid: number; // in cents
}

// Student enrollment tracking interfaces
export interface StudentEnrollment {
  studentId: string;
  studentName: string;
  categories: {
    [K in PaymentCategory]?: {
      enrolled: boolean;
      enrolledAt: string; // ISO timestamp
      totalOwed: number; // in cents
      amountPaid: number; // in cents
    };
  };
}

export interface StudentEnrollments {
  [studentId: string]: StudentEnrollment;
}

export interface EnrollmentRequest {
  studentId: string;
  category: PaymentCategory;
}

export interface EnrollmentResponse {
  success: boolean;
  enrollment?: StudentEnrollment;
  error?: string;
}

// Payment categories configuration (hardcoded as per requirements)
export const PAYMENT_CATEGORIES = {
  BAND_FEES: {
    name: 'Band Fees',
    totalAmount: 25000, // $250.00
    increment: 25000,   // Pay in full
  },
  SPRING_TRIP: {
    name: 'Spring Trip', 
    totalAmount: 90000, // $900.00
    increment: 5000,    // $50.00 increments
  },
  EQUIPMENT: {
    name: 'Equipment',
    totalAmount: 15000, // $150.00
    increment: 2500,    // $25.00 increments
  }
} as const;

export type PaymentCategory = keyof typeof PAYMENT_CATEGORIES;