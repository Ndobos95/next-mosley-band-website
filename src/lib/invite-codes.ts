import { db } from '@/lib/drizzle'
import { inviteCodes, tenants } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'

export interface InviteCodeData {
  schoolName: string
  directorEmail: string
  code?: string // Optional custom code
  expiresInDays?: number // Default 30 days
}

export interface ValidationResult {
  valid: boolean
  invite?: {
    id: string
    code: string
    schoolName: string
    directorEmail: string
    expiresAt: Date
  }
  error?: string
}

/**
 * Generate a unique invite code
 */
function generateUniqueCode(): string {
  // Generate format: SCHOOL-YYYY-XXXX (e.g., LINCOLN-2024-A8B9)
  const year = new Date().getFullYear()
  const suffix = nanoid(4).toUpperCase()
  return `BAND-${year}-${suffix}`
}

/**
 * Create a new invite code
 */
export async function createInviteCode(data: InviteCodeData) {
  const code = data.code || generateUniqueCode()
  const expiresAt = new Date(Date.now() + (data.expiresInDays || 30) * 24 * 60 * 60 * 1000)

  // Check if custom code already exists
  if (data.code) {
    const existing = await db
      .select()
      .from(inviteCodes)
      .where(eq(inviteCodes.code, data.code))
      .limit(1)
    
    if (existing.length > 0) {
      throw new Error('Invite code already exists')
    }
  }

  const result = await db.insert(inviteCodes).values({
    code,
    schoolName: data.schoolName,
    directorEmail: data.directorEmail,
    expiresAt,
  }).returning()

  return result[0]
}

/**
 * Validate an invite code
 */
export async function validateInviteCode(code: string): Promise<ValidationResult> {
  try {
    const result = await db
      .select()
      .from(inviteCodes)
      .where(eq(inviteCodes.code, code))
      .limit(1)

    if (result.length === 0) {
      return { valid: false, error: 'Invite code not found' }
    }

    const invite = result[0]

    // Check if already used
    if (invite.used) {
      return { valid: false, error: 'Invite code has already been used' }
    }

    // Check if expired
    if (new Date() > invite.expiresAt) {
      return { valid: false, error: 'Invite code has expired' }
    }

    return {
      valid: true,
      invite: {
        id: invite.id,
        code: invite.code,
        schoolName: invite.schoolName,
        directorEmail: invite.directorEmail,
        expiresAt: invite.expiresAt,
      }
    }
  } catch (error) {
    console.error('Error validating invite code:', error)
    return { valid: false, error: 'Failed to validate invite code' }
  }
}

/**
 * Mark invite code as used and link to tenant
 */
export async function markInviteCodeAsUsed(code: string, tenantId: string) {
  try {
    const updateData: any = {
      used: true,
      usedAt: new Date(),
      tenantId,
    }
    
    await db
      .update(inviteCodes)
      .set(updateData)
      .where(
        and(
          eq(inviteCodes.code, code),
          eq(inviteCodes.used, false)
        )
      )
    
    return true
  } catch (error) {
    console.error('Error marking invite code as used:', error)
    return false
  }
}

/**
 * List all invite codes (for admin interface)
 */
export async function listInviteCodes() {
  try {
    return await db
      .select({
        id: inviteCodes.id,
        code: inviteCodes.code,
        schoolName: inviteCodes.schoolName,
        directorEmail: inviteCodes.directorEmail,
        used: inviteCodes.used,
        usedAt: inviteCodes.usedAt,
        expiresAt: inviteCodes.expiresAt,
        createdAt: inviteCodes.createdAt,
        tenantSlug: tenants.slug,
        tenantName: tenants.name,
      })
      .from(inviteCodes)
      .leftJoin(tenants, eq(inviteCodes.tenantId, tenants.id))
      .orderBy(inviteCodes.createdAt)
  } catch (error) {
    console.error('Error listing invite codes:', error)
    return []
  }
}