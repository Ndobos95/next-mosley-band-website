"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Check, ChevronsUpDown, Link, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface UnclaimedStudent {
  id: string
  name: string
  instrument: string
  source: string
}

interface LinkStudentDialogProps {
  parentName: string
  studentName: string
  relationshipId: string
  onSuccess: () => void
}

export function LinkStudentDialog({ 
  parentName, 
  studentName, 
  relationshipId, 
  onSuccess 
}: LinkStudentDialogProps) {
  const [open, setOpen] = useState(false)
  const [comboboxOpen, setComboboxOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<UnclaimedStudent | null>(null)
  const [unclaimedStudents, setUnclaimedStudents] = useState<UnclaimedStudent[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const fetchUnclaimedStudents = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/director/students/unclaimed')
      const data = await response.json()
      
      if (response.ok) {
        setUnclaimedStudents(data.students)
      } else {
        console.error('Failed to fetch unclaimed students:', data.error)
      }
    } catch (error) {
      console.error('Error fetching unclaimed students:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchUnclaimedStudents()
    }
  }, [open])

  const handleLink = async () => {
    if (!selectedStudent) return

    try {
      setSubmitting(true)
      const response = await fetch(`/api/director/students/${relationshipId}/link`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetStudentId: selectedStudent.id })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Successfully linked student:', result.message)
        setOpen(false)
        setSelectedStudent(null)
        onSuccess()
      } else {
        const error = await response.json()
        console.error('Failed to link student:', error.error)
      }
    } catch (error) {
      console.error('Error linking student:', error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8">
          <Link className="h-3 w-3 mr-1" />
          Link
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Link Student to Roster</DialogTitle>
          <DialogDescription>
            Link <strong>{parentName}</strong>&apos;s registration for &quot;<strong>{studentName}</strong>&quot; to an existing student in the roster.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select existing roster student:</label>
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboboxOpen}
                  className="w-full justify-between"
                  disabled={loading}
                >
                  {selectedStudent ? (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{selectedStudent.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {selectedStudent.instrument}
                      </Badge>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      {loading ? "Loading..." : "Search for a student..."}
                    </span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search students..." />
                  <CommandList>
                    <CommandEmpty>No unclaimed students found.</CommandEmpty>
                    <CommandGroup>
                      {unclaimedStudents.map((student) => (
                        <CommandItem
                          key={student.id}
                          value={`${student.name} ${student.instrument}`}
                          onSelect={() => {
                            setSelectedStudent(student)
                            setComboboxOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedStudent?.id === student.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex items-center gap-2 flex-1">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{student.name}</span>
                            <Badge variant="outline" className="text-xs ml-auto">
                              {student.instrument}
                            </Badge>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {selectedStudent && (
            <div className="p-3 bg-muted rounded-md">
              <div className="text-sm font-medium mb-1">Link Preview:</div>
              <div className="text-sm text-muted-foreground">
                {parentName} will be linked to <strong>{selectedStudent.name}</strong> ({selectedStudent.instrument})
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleLink} 
            disabled={!selectedStudent || submitting}
          >
            {submitting ? "Linking..." : "Link Student"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}