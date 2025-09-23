// Helper functions for working with Stripe cache (t3dotgg pattern)

import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import type { StripeCustomerCache, PaymentTotals, StripePaymentData, StudentEnrollments, PaymentCategory } from '@/types/stripe';
import { PAYMENT_CATEGORIES } from '@/types/stripe';

/**
 * Get user's Stripe cache data (single source of truth)
 */
export async function getUserStripeData(userId: string): Promise<StripeCustomerCache | null> {
  const cache = await prisma.stripeCache.findUnique({
    where: { userId }
  });

  if (!cache) return null;

  // Type assertion - we control the shape through syncStripeDataToUser
  return cache.data as unknown as StripeCustomerCache;
}

/**
 * Helper to get payment totals for a user
 */
export async function getUserPaymentTotals(userId: string): Promise<PaymentTotals> {
  const stripeData = await getUserStripeData(userId);
  
  return stripeData?.totals ?? {
    bandFeesPaid: 0,
    tripPaid: 0,
    equipmentPaid: 0,
    donationsPaid: 0
  };
}

/**
 * Helper to get payment history for a user
 */
export async function getUserPaymentHistory(userId: string) {
  const stripeData = await getUserStripeData(userId);
  return stripeData?.payments ?? [];
}

/**
 * Helper to calculate outstanding balances
 */
export async function getUserOutstandingBalances(userId: string) {
  const totals = await getUserPaymentTotals(userId);
  
  return {
    bandFeesOwed: Math.max(0, 25000 - totals.bandFeesPaid), // $250
    tripOwed: Math.max(0, 90000 - totals.tripPaid),         // $900  
    equipmentOwed: Math.max(0, 15000 - totals.equipmentPaid) // $150
  };
}

/**
 * Create Stripe customer for new user (t3dotgg pattern)
 * Called during user registration
 */
export async function createStripeCustomerForUser(userId: string): Promise<string | null> {
  try {
    // Get user data
    const user = await prisma.users.findUnique({
      where: { id: userId }
    });

    if (!user) {
      console.error(`User ${userId} not found`);
      return null;
    }

    if (user.stripeCustomerId) {
      console.log(`User ${userId} already has Stripe customer: ${user.stripeCustomerId}`);
      return user.stripeCustomerId;
    }

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name || undefined,
      metadata: {
        userId: userId,
        role: user.role
      }
    });

    // Update user with customer ID
    await prisma.users.update({
      where: { id: userId },
      data: {
        stripeCustomerId: customer.id,
        updatedAt: new Date()
      }
    });

    console.log(`✅ Created Stripe customer ${customer.id} for user ${userId}`);
    return customer.id;

  } catch (error) {
    console.error(`❌ Failed to create Stripe customer for user ${userId}:`, error);
    return null;
  }
}

/**
 * Core t3dotgg sync function - Single source of truth for Stripe data
 * Fetches ALL customer data from Stripe and caches it in database
 */
export async function syncStripeDataToUser(userId: string): Promise<StripeCustomerCache | null> {
  try {
    // 1. Get user and their Stripe customer ID
    const user = await prisma.users.findUnique({
      where: { id: userId }
    });
    
    if (!user || !user.stripeCustomerId) {
      console.log(`User ${userId} has no Stripe customer ID`);
      return null;
    }
    
    // 2. Fetch ALL customer data from Stripe API
    // Note: Checkout sessions create payment intents with metadata, so we should get those
    const [customer, paymentIntents, checkoutSessions] = await Promise.all([
      stripe.customers.retrieve(user.stripeCustomerId),
      stripe.paymentIntents.list({
        customer: user.stripeCustomerId,
        limit: 100
      }),
      stripe.checkout.sessions.list({
        customer: user.stripeCustomerId,
        limit: 100 // Get checkout sessions to access their metadata
      })
    ]);
    
    if (customer.deleted) {
      console.log(`Stripe customer ${user.stripeCustomerId} was deleted`);
      return null;
    }
    
    // 3. Transform payment data - need to merge checkout session metadata with payment intents
    // Create a map of payment intent ID to checkout session metadata
    const sessionMetadataMap = new Map();
    checkoutSessions.data.forEach(session => {
      if (session.payment_intent && session.metadata) {
        sessionMetadataMap.set(session.payment_intent, session.metadata);
      }
    });

    // Transform payment intents, using checkout session metadata when available
    const payments: StripePaymentData[] = paymentIntents.data.map(pi => {
      // Use checkout session metadata if available, otherwise use payment intent metadata
      const metadata = sessionMetadataMap.get(pi.id) || pi.metadata || {};
      
      return {
        id: pi.id,
        amount: pi.amount,
        status: pi.status as StripePaymentData['status'],
        created: pi.created,
        description: pi.description || '',
        metadata: {
          studentName: metadata.studentName,
          category: metadata.category as StripePaymentData['metadata']['category'],
          increment: metadata.increment,
          notes: metadata.notes
        }
      };
    });
    
    // 4. Calculate totals by category
    const totals: PaymentTotals = {
      bandFeesPaid: 0,
      tripPaid: 0,
      equipmentPaid: 0,
      donationsPaid: 0
    };
    
    payments.forEach(payment => {
      if (payment.status === 'succeeded') {
        switch (payment.metadata.category) {
          case 'Band Fees':
            totals.bandFeesPaid += payment.amount;
            break;
          case 'Spring Trip':
            totals.tripPaid += payment.amount;
            break;
          case 'Equipment':
            totals.equipmentPaid += payment.amount;
            break;
          case 'Donation':
            totals.donationsPaid += payment.amount;
            break;
        }
      }
    });
    
    // 5. Parse enrollments from customer metadata and update with payment totals
    const baseEnrollments = parseEnrollmentsFromMetadata(customer.metadata || {});
    
    // Update amountPaid from actual payment totals
    
    const enrollments: StudentEnrollments = {};
    for (const [studentId, studentData] of Object.entries(baseEnrollments)) {
      enrollments[studentId] = {
        ...studentData,
        categories: {}
      };
      
      for (const [category, categoryData] of Object.entries(studentData.categories)) {
        // Calculate amount paid for THIS SPECIFIC student in THIS category
        // Payment metadata stores the enum key (e.g., 'BAND_FEES'), not display name
        
        // Filter payments for this specific student and category
        const studentPayments = payments.filter(payment => 
          payment.status === 'succeeded' && 
          payment.metadata.category === category &&
          payment.metadata.studentName === studentData.studentName
        );
        
        const amountPaid = studentPayments.reduce((sum, payment) => sum + payment.amount, 0);
        
        enrollments[studentId].categories[category as keyof typeof enrollments[string]['categories']] = {
          ...categoryData,
          amountPaid // Use calculated amount from student-specific payments
        };
      }
    }
    
    // 5.5. Sync calculated payment amounts to database tables (t3dotgg pattern)
    for (const [studentId, studentData] of Object.entries(enrollments)) {
      for (const [categoryKey, categoryData] of Object.entries(studentData.categories)) {
        const categoryName = PAYMENT_CATEGORIES[categoryKey as keyof typeof PAYMENT_CATEGORIES].name;

        // Find the enrollment record in the database
        const enrollment = await prisma.studentPaymentEnrollments.findFirst({
          where: {
            studentId: studentId,
            paymentCategories: {
              name: categoryName
            }
          },
          select: {
            id: true,
            amountPaid: true
          }
        });

        if (enrollment) {
          // Update the amountPaid field with calculated value from Stripe
          await prisma.studentPaymentEnrollments.update({
            where: { id: enrollment.id },
            data: {
              amountPaid: categoryData.amountPaid,
              updatedAt: new Date()
            }
          });
        }
      }
    }
    
    // 6. Create cache data structure
    const cacheData: StripeCustomerCache = {
      customerId: user.stripeCustomerId,
      payments,
      totals,
      enrollments,
      lastSync: new Date().toISOString()
    };
    
    // 7. Upsert to StripeCache table (single source of truth)
    await prisma.stripeCache.upsert({
      where: { userId },
      create: {
        id: crypto.randomUUID(),
        userId,
        data: JSON.parse(JSON.stringify(cacheData)),
        updatedAt: new Date()
      },
      update: {
        data: JSON.parse(JSON.stringify(cacheData)),
        updatedAt: new Date()
      }
    });
    
    console.log(`✅ Synced Stripe data for user ${userId}: ${payments.length} payments`);
    return cacheData;
    
  } catch (error) {
    console.error(`❌ Failed to sync Stripe data for user ${userId}:`, error);
    return null;
  }
}

/**
 * Parse enrollment data from Stripe customer metadata
 */
function parseEnrollmentsFromMetadata(metadata: Record<string, string>): StudentEnrollments {
  try {
    const enrollmentsJson = metadata.enrollments;
    if (!enrollmentsJson) return {};
    
    return JSON.parse(enrollmentsJson) as StudentEnrollments;
  } catch (error) {
    console.error('Failed to parse enrollments from metadata:', error);
    return {};
  }
}

/**
 * Helper to get enrollment data for a user
 */
export async function getUserEnrollments(userId: string): Promise<StudentEnrollments> {
  const stripeData = await getUserStripeData(userId);
  return stripeData?.enrollments ?? {};
}

/**
 * Enroll a student in a payment category
 */
export async function enrollStudentInCategory(
  userId: string,
  studentId: string,
  studentName: string,
  category: PaymentCategory
): Promise<boolean> {
  try {
    // Get user and their Stripe customer ID
    const user = await prisma.users.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      console.error(`User ${userId} not found`);
      return false;
    }
    
    // Create Stripe customer if they don't have one
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      stripeCustomerId = await createStripeCustomerForUser(userId);
      if (!stripeCustomerId) {
        console.error(`Failed to create Stripe customer for user ${userId}`);
        return false;
      }
    }
    
    // Get current enrollments
    const currentEnrollments = await getUserEnrollments(userId);
    
    // Check if already enrolled
    if (currentEnrollments[studentId]?.categories[category]?.enrolled) {
      console.log(`Student ${studentName} already enrolled in ${category}`);
      return true; // Already enrolled, consider it success
    }
    
    // Update enrollments
    const updatedEnrollments = { ...currentEnrollments };
    
    if (!updatedEnrollments[studentId]) {
      updatedEnrollments[studentId] = {
        studentId,
        studentName,
        categories: {}
      };
    }
    
    // Add enrollment for this category
    const categoryConfig = PAYMENT_CATEGORIES[category];
    updatedEnrollments[studentId].categories[category] = {
      enrolled: true,
      enrolledAt: new Date().toISOString(),
      totalOwed: categoryConfig.totalAmount,
      amountPaid: 0
    };
    
    // Create database enrollment record
    const paymentCategory = await prisma.paymentCategories.findUnique({
      where: { name: categoryConfig.name }
    });

    if (paymentCategory) {
      await prisma.studentPaymentEnrollments.upsert({
        where: {
          studentId_categoryId: {
            studentId: studentId,
            categoryId: paymentCategory.id
          }
        },
        create: {
          id: crypto.randomUUID(),
          studentId: studentId,
          categoryId: paymentCategory.id,
          totalOwed: categoryConfig.totalAmount,
          amountPaid: 0,
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        update: {
          totalOwed: categoryConfig.totalAmount,
          status: 'ACTIVE',
          updatedAt: new Date()
        }
      });
    }
    
    // Update Stripe customer metadata
    await stripe.customers.update(stripeCustomerId, {
      metadata: {
        enrollments: JSON.stringify(updatedEnrollments)
      }
    });
    
    // Sync the updated data
    await syncStripeDataToUser(userId);
    
    console.log(`✅ Enrolled student ${studentName} in ${category} for user ${userId}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Failed to enroll student in category:`, error);
    return false;
  }
}


/**
 * Unenroll a student from a payment category
 */
export async function unenrollStudentFromCategory(
  userId: string,
  studentId: string,
  category: PaymentCategory
): Promise<boolean> {
  try {
    // Get user and their Stripe customer ID
    const user = await prisma.users.findUnique({
      where: { id: userId }
    });
    
    if (!user || !user.stripeCustomerId) {
      console.error(`User ${userId} has no Stripe customer ID`);
      return false;
    }
    
    // Get current enrollments
    const currentEnrollments = await getUserEnrollments(userId);
    
    // Update enrollments
    const updatedEnrollments = { ...currentEnrollments };
    
    if (updatedEnrollments[studentId]?.categories[category]) {
      delete updatedEnrollments[studentId].categories[category];
      
      // If no categories remain, remove the student entirely
      if (Object.keys(updatedEnrollments[studentId].categories).length === 0) {
        delete updatedEnrollments[studentId];
      }
    }
    
    // Update Stripe customer metadata
    await stripe.customers.update(user.stripeCustomerId, {
      metadata: {
        enrollments: JSON.stringify(updatedEnrollments)
      }
    });
    
    // Sync the updated data
    await syncStripeDataToUser(userId);
    
    console.log(`✅ Unenrolled student from ${category} for user ${userId}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Failed to unenroll student from category:`, error);
    return false;
  }
}