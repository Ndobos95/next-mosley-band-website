"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Heart, Search, Calendar } from "lucide-react"

interface Donation {
  id: string
  parentName: string
  parentEmail: string
  amount: number
  notes: string
  status: string
  createdAt: string
}

interface DonationData {
  donations: Donation[]
  totals: {
    count: number
    amount: number
  }
}

export function DonationsOverview() {
  const [donationData, setDonationData] = useState<DonationData | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const fetchDonations = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/donations', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setDonationData(data)
      } else {
        console.error('Failed to fetch donations:', response.status)
      }
    } catch (error) {
      console.error('Error fetching donations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDonations()
  }, [])

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Filter donations based on search term
  const filteredDonations = donationData?.donations.filter(donation =>
    donation.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    donation.parentEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    donation.notes.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Donations Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
            <Heart className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {donationData ? formatCurrency(donationData.totals.amount) : '$0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              From {donationData?.totals.count || 0} donation{donationData?.totals.count !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {donationData?.donations.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Total donations received
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Donations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            All Donations
          </CardTitle>
          <CardDescription>
            Complete history of donations received through the donation page
          </CardDescription>
          
          {/* Search */}
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search donations by name, email, or message..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Donor</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDonations.length > 0 ? (
                filteredDonations.map((donation) => (
                  <TableRow key={donation.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{donation.parentName}</div>
                        <div className="text-sm text-muted-foreground">{donation.parentEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-green-600">
                      {formatCurrency(donation.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={donation.notes}>
                        {donation.notes}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(donation.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={donation.status === 'COMPLETED' ? 'default' : 'secondary'}
                        className={donation.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {donation.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {searchTerm ? 'No donations match your search.' : 'No donations received yet.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          
          {searchTerm && filteredDonations.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Showing {filteredDonations.length} of {donationData?.donations.length || 0} donations
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}