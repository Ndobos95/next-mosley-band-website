import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createMessage } from './actions'

export default async function MessagesPage() {
  const messages = await prisma.message.findMany({
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Messages</h1>
      <p className="text-muted-foreground mb-8">
        SQLite persistence test - these messages should survive container restarts
      </p>
      
      {/* Add Message Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Add New Message</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createMessage} className="space-y-4">
            <div>
              <Label htmlFor="content">Message Content</Label>
              <Input
                id="content"
                name="content"
                placeholder="Enter your message..."
                required
              />
            </div>
            <Button type="submit">Add Message</Button>
          </form>
        </CardContent>
      </Card>
      
      <div className="space-y-4">
        {messages.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No messages yet. Run the seed script to add some test data.
              </p>
            </CardContent>
          </Card>
        ) : (
          messages.map((message) => (
            <Card key={message.id}>
              <CardHeader>
                <CardTitle className="text-lg">Message #{message.id}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-2">{message.content}</p>
                <p className="text-sm text-muted-foreground">
                  Created: {message.createdAt.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  Updated: {message.updatedAt.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      
      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">Database Info:</h3>
        <p className="text-sm text-muted-foreground">
          Total messages: {messages.length}
        </p>
        <p className="text-sm text-muted-foreground">
          Database file: {process.env.DATABASE_URL || 'Not configured'}
        </p>
      </div>
    </div>
  )
}