import { db } from './src/lib/drizzle'
import { userProfiles } from './src/db/schema'
import { eq } from 'drizzle-orm'

async function checkRole() {
  const profile = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.email, 'director@riverside.edu'))
    .limit(1)
  
  console.log('Director profile:', profile[0])
  process.exit(0)
}

checkRole().catch(console.error)