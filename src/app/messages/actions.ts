'use server'

import { db } from '@/lib/drizzle'
import { messages } from '@/db/schema'
import { headers } from 'next/headers'
import { resolveTenantFromHeaders } from '@/lib/tenancy'
import { revalidatePath } from 'next/cache'

export async function createMessage(formData: FormData) {
  const content = formData.get('content') as string
  
  if (!content || content.trim().length === 0) {
    throw new Error('Message content is required')
  }

  const tenant = await resolveTenantFromHeaders(await headers())
  if (!tenant) throw new Error('Tenant not found')
  await db.insert(messages).values({
    tenantId: tenant.id,
    content: content.trim(),
  })

  revalidatePath('/messages')
}