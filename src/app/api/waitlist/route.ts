import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Here you would typically:
    // 1. Store the email in your database
    // 2. Send a confirmation email
    // 3. Add to your email marketing service
    // 4. Log the signup for analytics

    // For now, we'll just simulate success
    console.log('Waitlist signup:', email)

    // TODO: Implement actual waitlist storage
    // Example: await prisma.waitlist.create({ data: { email, createdAt: new Date() } })

    return NextResponse.json(
      { message: 'Successfully added to waitlist' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Waitlist signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
