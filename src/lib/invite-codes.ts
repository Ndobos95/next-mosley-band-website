// Invite code management functions for multi-tenant onboarding

import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'

interface CreateInviteCodeParams {
  schoolName: string
  directorEmail: string
  expiresInDays?: number
}

export async function createInviteCode({
  schoolName,
  directorEmail,
  expiresInDays = 30
}: CreateInviteCodeParams) {
  const code = nanoid(12).toUpperCase()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresInDays)

  const invite = await prisma.invite_codes.create({
    data: {
      code,
      school_name: schoolName,
      director_email: directorEmail,
      expires_at: expiresAt,
      used: false
    }
  })

  return {
    id: invite.id,
    code: invite.code,
    schoolName: invite.school_name,
    directorEmail: invite.director_email,
    used: invite.used,
    usedAt: invite.used_at,
    expiresAt: invite.expires_at,
    createdAt: invite.created_at
  }
}

export async function listInviteCodes() {
  const invites = await prisma.invite_codes.findMany({
    include: {
      tenants: true
    },
    orderBy: {
      created_at: 'desc'
    }
  })

  return invites.map(invite => ({
    id: invite.id,
    code: invite.code,
    schoolName: invite.school_name,
    directorEmail: invite.director_email,
    used: invite.used,
    usedAt: invite.used_at,
    expiresAt: invite.expires_at,
    createdAt: invite.created_at,
    tenantSlug: invite.tenants?.slug,
    tenantName: invite.tenants?.name
  }))
}

export async function validateInviteCode(code: string) {
  const invite = await prisma.invite_codes.findUnique({
    where: { code },
    include: {
      tenants: true
    }
  })

  if (!invite) {
    return { valid: false, error: 'Invalid invite code' }
  }

  if (invite.used) {
    return { valid: false, error: 'Invite code has already been used' }
  }

  if (new Date() > invite.expires_at) {
    return { valid: false, error: 'Invite code has expired' }
  }

  return {
    valid: true,
    invite: {
      id: invite.id,
      code: invite.code,
      schoolName: invite.school_name,
      directorEmail: invite.director_email,
      expiresAt: invite.expires_at
    }
  }
}

export async function markInviteCodeAsUsed(code: string, tenantId: string) {
  await prisma.invite_codes.update({
    where: { code },
    data: {
      used: true,
      used_at: new Date(),
      tenant_id: tenantId
    }
  })
}

export const generateInviteCode = createInviteCode // Legacy export