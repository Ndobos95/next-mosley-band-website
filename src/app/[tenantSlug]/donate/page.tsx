import { Metadata } from 'next'
import { DonationForm } from '@/components/donation-form'

export const metadata: Metadata = {
  title: 'Donate - Support Our Band Program',
  description: 'Support our band program with a donation. Help us provide instruments, travel opportunities, and musical education for our students.',
  openGraph: {
    title: 'Donate - Support Our Band Program',
    description: 'Support our band program with a donation. Help us provide instruments, travel opportunities, and musical education for our students.',
    type: 'website',
  },
}

export default function DonatePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Support Our Band Program
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Your donation helps provide instruments, fund travel opportunities, and support musical education for our talented students.
          </p>
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-card rounded-lg p-6 shadow-sm border">
              <div className="text-2xl mb-2">🎺</div>
              <h3 className="font-semibold mb-2">Instruments</h3>
              <p className="text-sm text-muted-foreground">Help purchase and maintain quality instruments for students who need them.</p>
            </div>
            <div className="bg-card rounded-lg p-6 shadow-sm border">
              <div className="text-2xl mb-2">✈️</div>
              <h3 className="font-semibold mb-2">Travel & Competitions</h3>
              <p className="text-sm text-muted-foreground">Support travel expenses for competitions, festivals, and performance opportunities.</p>
            </div>
            <div className="bg-card rounded-lg p-6 shadow-sm border">
              <div className="text-2xl mb-2">📚</div>
              <h3 className="font-semibold mb-2">Music Education</h3>
              <p className="text-sm text-muted-foreground">Fund sheet music, educational materials, and enrichment programs.</p>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto">
          <DonationForm />
        </div>

        <div className="text-center mt-12 text-sm text-muted-foreground">
          <p>All donations go directly to supporting our band program and students.</p>
          <p>Thank you for your generosity!</p>
        </div>
      </div>
    </div>
  )
}