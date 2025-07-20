"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CreditCard } from "lucide-react"

interface PaymentCategory {
  id: string
  name: string
  description: string | null
  fullAmount: number
  allowIncrements: boolean
  incrementAmount: number | null
}

interface GuestPaymentFormProps {
  categories: PaymentCategory[]
}

export function GuestPaymentForm({ categories }: GuestPaymentFormProps) {
  const [formData, setFormData] = useState({
    parentName: "",
    parentEmail: "",
    studentName: "",
    categoryId: "",
    amount: "",
    notes: ""
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [studentMatch, setStudentMatch] = useState<{found: boolean, message: string} | null>(null)

  const selectedCategory = categories.find(c => c.id === formData.categoryId)

  const handleStudentNameChange = async (studentName: string) => {
    setFormData(prev => ({ ...prev, studentName }))
    
    if (studentName.length >= 3) {
      try {
        const response = await fetch('/api/students/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentName })
        })
        
        const result = await response.json()
        setStudentMatch(result)
      } catch (error) {
        console.error('Error checking student match:', error)
      }
    } else {
      setStudentMatch(null)
    }
  }

  const getPaymentAmountOptions = () => {
    if (!selectedCategory) return []
    
    const options = []
    
    if (selectedCategory.allowIncrements && selectedCategory.incrementAmount) {
      // Add increment options
      for (let amount = selectedCategory.incrementAmount; amount <= selectedCategory.fullAmount; amount += selectedCategory.incrementAmount) {
        options.push({
          value: amount.toString(),
          label: `$${(amount / 100).toFixed(2)}`
        })
      }
    } else {
      // Full amount only
      options.push({
        value: selectedCategory.fullAmount.toString(),
        label: `$${(selectedCategory.fullAmount / 100).toFixed(2)}`
      })
    }
    
    return options
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch('/api/payments/guest-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentName: formData.parentName,
          parentEmail: formData.parentEmail,
          studentName: formData.studentName,
          categoryId: formData.categoryId,
          amount: parseInt(formData.amount),
          notes: formData.notes || undefined
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Payment failed')
      }

      // Redirect to Stripe Checkout
      if (result.url) {
        window.location.href = result.url
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Payment failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Guest Payment
        </CardTitle>
        <CardDescription>
          Make a payment without creating an account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="parentName">Parent/Guardian Name</Label>
            <Input
              id="parentName"
              value={formData.parentName}
              onChange={(e) => setFormData(prev => ({ ...prev, parentName: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="parentEmail">Email Address</Label>
            <Input
              id="parentEmail"
              type="email"
              value={formData.parentEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, parentEmail: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="studentName">Student Name</Label>
            <Input
              id="studentName"
              value={formData.studentName}
              onChange={(e) => handleStudentNameChange(e.target.value)}
              placeholder="Enter student's full legal name"
              required
            />
            {studentMatch && (
              <Alert className={studentMatch.found ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{studentMatch.message}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Payment Category</Label>
            <Select value={formData.categoryId} onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value, amount: "" }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name} - ${(category.fullAmount / 100).toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCategory && (
            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount</Label>
              <Select value={formData.amount} onValueChange={(value) => setFormData(prev => ({ ...prev, amount: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment amount" />
                </SelectTrigger>
                <SelectContent>
                  {getPaymentAmountOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any additional notes about this payment"
              rows={3}
            />
          </div>

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || !formData.parentName || !formData.parentEmail || !formData.studentName || !formData.categoryId || !formData.amount}
          >
            {isLoading ? "Processing..." : "Continue to Payment"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}