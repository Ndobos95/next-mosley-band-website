"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Heart, Loader2 } from "lucide-react"

const PRESET_AMOUNTS = [25, 50, 100, 250, 500] // in dollars

export function DonationForm() {
  const [formData, setFormData] = useState({
    donorName: '',
    donorEmail: '',
    organization: '',
    amount: '',
    message: ''
  })
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handlePresetClick = (amount: number) => {
    setSelectedPreset(amount)
    setFormData(prev => ({ ...prev, amount: amount.toString() }))
    setErrors(prev => ({ ...prev, amount: '' }))
  }

  const handleCustomAmountChange = (value: string) => {
    setSelectedPreset(null)
    setFormData(prev => ({ ...prev, amount: value }))
    setErrors(prev => ({ ...prev, amount: '' }))
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.donorName.trim()) {
      newErrors.donorName = 'Name is required'
    }

    if (!formData.donorEmail.trim()) {
      newErrors.donorEmail = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.donorEmail)) {
      newErrors.donorEmail = 'Please enter a valid email address'
    }

    if (!formData.amount.trim()) {
      newErrors.amount = 'Donation amount is required'
    } else {
      const amount = parseFloat(formData.amount)
      if (isNaN(amount) || amount <= 0) {
        newErrors.amount = 'Please enter a valid amount'
      } else if (amount < 1) {
        newErrors.amount = 'Minimum donation is $1'
      } else if (amount > 10000) {
        newErrors.amount = 'Maximum donation is $10,000'
      }
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Please include a message with your donation'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    
    try {
      // Validate amount conversion
      const amountFloat = parseFloat(formData.amount)
      if (isNaN(amountFloat) || amountFloat <= 0) {
        setErrors({ submit: 'Invalid donation amount' })
        setIsLoading(false)
        return
      }
      
      const response = await fetch('/api/donations/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          donorName: formData.donorName.trim(),
          donorEmail: formData.donorEmail.trim(),
          organization: formData.organization.trim() || null,
          amount: Math.round(amountFloat * 100), // Convert to cents
          message: formData.message.trim()
        }),
      })

      const data = await response.json()

      if (response.ok && data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url
      } else {
        const errorMessage = data?.error || `Server error: ${response.status}`
        console.error('Error creating donation checkout:', {
          status: response.status,
          error: data?.error,
          response: data
        })
        setErrors({ submit: errorMessage })
      }
    } catch (error) {
      console.error('Error submitting donation:', error)
      setErrors({ submit: 'Failed to process donation. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Heart className="h-5 w-5 text-red-500" />
          Make a Donation
        </CardTitle>
        <CardDescription>
          Every contribution makes a difference in our students&apos; musical journey
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Donor Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="donorName">Full Name *</Label>
              <Input
                id="donorName"
                type="text"
                value={formData.donorName}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, donorName: e.target.value }))
                  setErrors(prev => ({ ...prev, donorName: '' }))
                }}
                placeholder="Enter your full name"
                className={errors.donorName ? 'border-red-500' : ''}
              />
              {errors.donorName && (
                <p className="text-sm text-red-500">{errors.donorName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="donorEmail">Email Address *</Label>
              <Input
                id="donorEmail"
                type="email"
                value={formData.donorEmail}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, donorEmail: e.target.value }))
                  setErrors(prev => ({ ...prev, donorEmail: '' }))
                }}
                placeholder="Enter your email address"
                className={errors.donorEmail ? 'border-red-500' : ''}
              />
              {errors.donorEmail && (
                <p className="text-sm text-red-500">{errors.donorEmail}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="organization">Organization/Company (Optional)</Label>
              <Input
                id="organization"
                type="text"
                value={formData.organization}
                onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))}
                placeholder="Company or organization name"
              />
            </div>
          </div>

          {/* Donation Amount */}
          <div className="space-y-4">
            <Label>Donation Amount *</Label>
            
            {/* Preset Amount Buttons */}
            <div className="grid grid-cols-3 gap-2">
              {PRESET_AMOUNTS.map((amount) => (
                <Button
                  key={amount}
                  type="button"
                  variant={selectedPreset === amount ? "default" : "outline"}
                  onClick={() => handlePresetClick(amount)}
                  className="h-12"
                >
                  ${amount}
                </Button>
              ))}
            </div>

            {/* Custom Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="customAmount">Or enter custom amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="customAmount"
                  type="number"
                  min="1"
                  max="10000"
                  step="0.01"
                  value={selectedPreset ? '' : formData.amount}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                  placeholder="0.00"
                  className={`pl-8 ${errors.amount ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.amount && (
                <p className="text-sm text-red-500">{errors.amount}</p>
              )}
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, message: e.target.value }))
                setErrors(prev => ({ ...prev, message: '' }))
              }}
              placeholder="Why are you donating? Any special dedication or message..."
              rows={4}
              className={errors.message ? 'border-red-500' : ''}
            />
            {errors.message && (
              <p className="text-sm text-red-500">{errors.message}</p>
            )}
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-12"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Heart className="mr-2 h-4 w-4" />
                Donate ${formData.amount || '0'}
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            You will be redirected to our secure payment processor to complete your donation.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}