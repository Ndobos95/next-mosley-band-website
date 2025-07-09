"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"

interface AddStudentFormProps {
  onStudentAdded: () => void
}

export function AddStudentForm({ onStudentAdded }: AddStudentFormProps) {
  const [name, setName] = useState("")
  const [instrument, setInstrument] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{
    type: "success" | "pending" | "error"
    message: string
  } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !instrument.trim()) return

    setIsSubmitting(true)
    setFeedback(null)

    try {
      // Call the real API endpoint
      const response = await fetch('/api/students/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, instrument })
      })

      const data = await response.json()

      if (response.ok) {
        if (data.success) {
          setFeedback({
            type: "success",
            message: data.message
          })
        } else {
          setFeedback({
            type: "pending",
            message: data.message
          })
        }
        setName("")
        setInstrument("")
        onStudentAdded()
      } else {
        setFeedback({
          type: "error",
          message: data.error || "An error occurred. Please try again."
        })
      }
    } catch {
      setFeedback({
        type: "error",
        message: "An error occurred. Please try again."
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Add Student</CardTitle>
        <CardDescription>
          Enter your student&apos;s information to link them to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="studentName">Student Name</Label>
            <Input
              id="studentName"
              type="text"
              placeholder="Enter student's full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="instrument">Instrument</Label>
            <Input
              id="instrument"
              type="text"
              placeholder="Enter instrument"
              value={instrument}
              onChange={(e) => setInstrument(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !name.trim() || !instrument.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding Student...
              </>
            ) : (
              "Add Student"
            )}
          </Button>
        </form>

        {feedback && (
          <Alert className={`mt-4 ${
            feedback.type === "success" ? "border-green-200 bg-green-50" : 
            feedback.type === "pending" ? "border-yellow-200 bg-yellow-50" : 
            "border-red-200 bg-red-50"
          }`}>
            {feedback.type === "success" ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : feedback.type === "pending" ? (
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={
              feedback.type === "success" ? "text-green-800" : 
              feedback.type === "pending" ? "text-yellow-800" : 
              "text-red-800"
            }>
              {feedback.message}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}