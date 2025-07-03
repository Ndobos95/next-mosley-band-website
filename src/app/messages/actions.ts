'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function createMessage(formData: FormData) {
  const content = formData.get('content') as string
  
  if (!content || content.trim().length === 0) {
    throw new Error('Message content is required')
  }

  await prisma.message.create({
    data: {
      content: content.trim()
    }
  })

  revalidatePath('/messages')
}