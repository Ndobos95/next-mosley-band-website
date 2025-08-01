import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getSession } from '@/lib/auth-server'
import { stripe } from '@/lib/stripe'
import { EmailService } from '@/lib/email'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

/**
 * Server action to handle payment confirmation emails
 */
async function handlePaymentEmails(sessionId: string) {
  const session = await getSession()
  
  try {
    // Fetch the checkout session from Stripe
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'customer']
    })

    if (!checkoutSession.payment_intent) {
      console.error('No payment intent found for session:', sessionId)
      return { success: false, error: 'No payment intent found' }
    }

    const paymentIntentId = typeof checkoutSession.payment_intent === 'string' 
      ? checkoutSession.payment_intent 
      : checkoutSession.payment_intent.id

    // Find the payment in our database
    const payment = await prisma.payment.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
      include: {
        category: true,
        enrollment: {
          include: {
            student: true
          }
        }
      }
    })

    const guestPayment = await prisma.guestPayment.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
      include: {
        category: true,
        matchedStudent: true
      }
    })

    let paymentRecord = payment || guestPayment
    
    // Fallback: Look for guest payments with temp IDs
    if (!paymentRecord) {
      const tempGuestPayments = await prisma.guestPayment.findMany({
        where: {
          stripePaymentIntentId: {
            startsWith: 'temp_'
          }
        },
        include: {
          category: true,
          matchedStudent: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      })
      
      const sessionAmount = checkoutSession.amount_total
      const recentTime = new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
      
      const matchingGuestPayment = tempGuestPayments.find(gp => 
        gp.amount === sessionAmount && 
        gp.createdAt >= recentTime
      )
      
      if (matchingGuestPayment) {
        paymentRecord = await prisma.guestPayment.update({
          where: { id: matchingGuestPayment.id },
          data: { stripePaymentIntentId: paymentIntentId },
          include: {
            category: true,
            matchedStudent: true
          }
        })
      }
    }
    
    if (!paymentRecord) {
      console.error(`Payment record not found for session ${sessionId}, payment intent ${paymentIntentId}`)
      return { success: false, error: 'Payment record not found' }
    }

    // Skip if email already sent
    if (paymentRecord.emailSent) {
      console.log('Email already sent for payment:', paymentIntentId)
      return { success: true, emailResult: { success: true } }
    }

    // Construct email data
    let emailData
    if (payment) {
      // Authenticated payment
      const parentUser = session?.user
      if (!parentUser) {
        return { success: false, error: 'User session not found for authenticated payment' }
      }

      emailData = {
        parentEmail: parentUser.email,
        parentName: parentUser.name || 'Parent',
        studentName: payment.enrollment.student.name,
        categoryName: payment.category.name,
        amount: payment.amount,
        paymentIntentId: paymentIntentId,
        paymentDate: new Date()
      }
    } else if (guestPayment || ('parentEmail' in paymentRecord)) {
      // Guest payment
      const guestRecord = guestPayment || (paymentRecord as unknown as typeof guestPayment)
      
      if (guestRecord) {
        emailData = {
          parentEmail: guestRecord.parentEmail,
          parentName: guestRecord.parentName,
          studentName: guestRecord.matchedStudent?.name || guestRecord.studentName,
          categoryName: guestRecord.category.name,
          amount: guestRecord.amount,
          paymentIntentId: paymentIntentId,
          paymentDate: new Date()
        }
      }
    }
    
    if (!emailData) {
      return { success: false, error: 'Could not construct email data' }
    }

    // Send notification emails (both parent confirmation and booster notification)
    const emailResult = await EmailService.sendPaymentNotificationEmails(emailData)
    
    // Update email status in database
    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          emailSent: emailResult.success,
          emailError: emailResult.success ? null : (emailResult.confirmationResult.error || emailResult.boosterResult.error || 'Unknown error')
        }
      })
    } else if (guestPayment) {
      await prisma.guestPayment.update({
        where: { id: guestPayment.id },
        data: {
          emailSent: emailResult.success,
          emailError: emailResult.success ? null : (emailResult.confirmationResult.error || emailResult.boosterResult.error || 'Unknown error')
        }
      })
    }

    return { success: true, emailResult }
    
  } catch (error) {
    console.error('Error handling payment emails:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

async function PaymentSuccessContent({ sessionId }: { sessionId: string }) {
  // Handle payment emails server-side
  const emailResult = await handlePaymentEmails(sessionId)
  
  try {
    // Fetch the checkout session from Stripe for display purposes
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'customer']
    })

    if (!checkoutSession.payment_intent) {
      throw new Error('No payment intent found')
    }

    const paymentIntentId = typeof checkoutSession.payment_intent === 'string' 
      ? checkoutSession.payment_intent 
      : checkoutSession.payment_intent.id

    // Find the payment in our database for display
    const payment = await prisma.payment.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
      include: {
        category: true,
        enrollment: {
          include: {
            student: true
          }
        }
      }
    })

    const guestPayment = await prisma.guestPayment.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
      include: {
        category: true,
        matchedStudent: true
      }
    })

    let paymentRecord = payment || guestPayment
    
    // Fallback: Look for guest payments with temp IDs if no record found
    if (!paymentRecord) {
      const tempGuestPayments = await prisma.guestPayment.findMany({
        where: {
          stripePaymentIntentId: {
            startsWith: 'temp_'
          }
        },
        include: {
          category: true,
          matchedStudent: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      })
      
      const sessionAmount = checkoutSession.amount_total
      const recentTime = new Date(Date.now() - 10 * 60 * 1000)
      
      const matchingGuestPayment = tempGuestPayments.find(gp => 
        gp.amount === sessionAmount && 
        gp.createdAt >= recentTime
      )
      
      if (matchingGuestPayment) {
        paymentRecord = await prisma.guestPayment.update({
          where: { id: matchingGuestPayment.id },
          data: { stripePaymentIntentId: paymentIntentId },
          include: {
            category: true,
            matchedStudent: true
          }
        })
      }
    }
    
    if (!paymentRecord) {
      console.error(`Payment record not found for session ${sessionId}, payment intent ${paymentIntentId}`)
      throw new Error('Payment record not found')
    }

    const amountFormatted = `$${(paymentRecord.amount / 100).toFixed(2)}`
    // Get student name from the found payment record
    const studentName = payment?.enrollment.student.name || 
                       ('matchedStudent' in paymentRecord ? paymentRecord.matchedStudent?.name : undefined) || 
                       ('studentName' in paymentRecord ? paymentRecord.studentName : undefined) || 
                       'Student'

    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-green-700">Payment Successful!</CardTitle>
            <CardDescription>
              Your payment has been processed successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Payment Details</h3>
              <div className="space-y-1 text-sm">
                <div><strong>Student:</strong> {studentName}</div>
                <div><strong>Category:</strong> {paymentRecord.category.name}</div>
                <div><strong>Amount:</strong> {amountFormatted}</div>
                <div><strong>Reference:</strong> {paymentIntentId}</div>
              </div>
            </div>

            {!emailResult.success && (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
                  <div>
                    <p className="text-sm text-yellow-700">
                      Your payment was successful, but we couldn&apos;t send the confirmation email. 
                      You can view your payment history in your dashboard.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {emailResult.success && emailResult.emailResult && emailResult.emailResult.success && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-blue-500 mr-2" />
                  <div>
                    <p className="text-sm text-blue-700">
                      Payment confirmed! Confirmation emails have been sent to you and the program coordinators.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="text-center pt-4">
              <Link href="/dashboard">
                <Button>View Dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  } catch (error) {
    console.error('Payment success page error:', error)
    console.error('Debug info:', {
      sessionId,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-16 w-16 text-red-500" />
            </div>
            <CardTitle className="text-2xl text-red-700">Payment Status Unknown</CardTitle>
            <CardDescription>
              We&apos;re having trouble verifying your payment status.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-gray-600">
              If you were charged, your payment was likely successful. Please check your dashboard 
              or contact support if you have concerns.
            </p>
            
            <div className="text-center pt-4">
              <Link href="/dashboard">
                <Button>View Dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
}

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const params = await searchParams
  const sessionId = params.session_id

  if (!sessionId) {
    redirect('/dashboard')
  }

  return (
    <Suspense fallback={
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <Card>
          <CardContent className="p-8 text-center">
            <p>Processing payment confirmation...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <PaymentSuccessContent sessionId={sessionId} />
    </Suspense>
  )
}