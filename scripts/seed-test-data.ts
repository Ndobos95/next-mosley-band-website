// @ts-nocheck
/**
 * Script to seed test data for multi-tenant SaaS platform
 * Run with: npx tsx src/scripts/seed-test-data.ts
 */

// Load environment variables FIRST before any imports that need them
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Now import everything else after env is loaded
import { inviteCodes, tenants, users, memberships, students } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';

// Create database connection directly
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pgPool);

// Create Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role key for admin operations
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function seedTestData() {
  console.log('🌱 Starting test data seeding...');

  // Check required environment variables
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set in .env.local');
    process.exit(1);
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Supabase environment variables not set in .env.local');
    process.exit(1);
  }

  try {
    // 1. Create test invite codes
    console.log('Creating invite codes...');
    const testCodes = [
      { 
        code: 'TEST-2024', 
        schoolName: 'Test School',
        directorEmail: 'director@testschool.edu',
        used: false,
        expiresAt: new Date('2024-12-31'), 
        createdAt: new Date() 
      },
      { 
        code: 'DEMO-2024', 
        schoolName: 'Demo Academy',
        directorEmail: 'director@demoacademy.edu',
        used: false,
        expiresAt: new Date('2024-12-31'), 
        createdAt: new Date() 
      },
      { 
        code: 'SCHOOL1-2024', 
        schoolName: 'First School',
        directorEmail: 'director@firstschool.edu',
        used: false,
        expiresAt: new Date('2024-12-31'), 
        createdAt: new Date() 
      },
      { 
        code: 'BETA-2024', 
        schoolName: 'Beta High School',
        directorEmail: 'director@betahigh.edu',
        used: false,
        expiresAt: new Date('2024-12-31'), 
        createdAt: new Date() 
      },
    ];

    for (const code of testCodes) {
      await db.insert(inviteCodes)
        .values(code)
        .onConflictDoNothing();
    }
    console.log('✅ Invite codes created');

    // 2. Create test tenants
    console.log('Creating test tenants...');
    const testTenants = [
      {
        slug: 'default',
        name: 'Default School',
        schoolName: 'Default High School',
        schoolAddress: '123 Main St, Default City, DC 12345',
        schoolPhone: '555-0100',
        schoolEmail: 'admin@defaultschool.edu',
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        slug: 'riverside',
        name: 'Riverside High',
        schoolName: 'Riverside High School',
        schoolAddress: '456 River Rd, Riverside, CA 90210',
        schoolPhone: '555-0200',
        schoolEmail: 'band@riverside.edu',
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        slug: 'northview',
        name: 'Northview Academy',
        schoolName: 'Northview Academy',
        schoolAddress: '789 North Ave, Northview, NY 10001',
        schoolPhone: '555-0300',
        schoolEmail: 'music@northview.edu',
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const createdTenants = [];
    for (const tenant of testTenants) {
      const existing = await db.select().from(tenants).where(eq(tenants.slug, tenant.slug)).limit(1);
      if (existing.length === 0) {
        const [created] = await db.insert(tenants).values(tenant).returning();
        createdTenants.push(created);
        console.log(`✅ Created tenant: ${tenant.name}`);
      } else {
        createdTenants.push(existing[0]);
        console.log(`⏭️  Tenant already exists: ${tenant.name}`);
      }
    }

    // 3. Create test users for each tenant
    console.log('Creating test users...');
    for (const tenant of createdTenants) {
      // Create a director for each tenant
      const directorEmail = `director@${tenant.slug}.edu`;
      const existingDirector = await db.select().from(users).where(eq(users.email, directorEmail)).limit(1);
      
      let directorId: string;
      if (existingDirector.length === 0) {
        // Create user in Supabase Auth
        const { data: authUser, error } = await supabaseAdmin.auth.admin.createUser({
          email: directorEmail,
          password: 'password123',
          email_confirm: true,
          user_metadata: {
            name: `${tenant.name} Director`,
            tenantId: tenant.id
          }
        });

        if (error) {
          console.error(`❌ Failed to create director auth: ${error.message}`);
          continue;
        }

        // Create user in database with Supabase Auth ID
        const [director] = await db.insert(users).values({
          id: authUser.user.id,
          email: directorEmail,
          displayName: `${tenant.name} Director`,
          role: 'DIRECTOR',
          tenantId: tenant.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning();
        directorId = director.id;
        console.log(`✅ Created director: ${directorEmail}`);
      } else {
        directorId = existingDirector[0].id;
        console.log(`⏭️  Director already exists: ${directorEmail}`);
      }

      // Create membership for director
      await db.insert(memberships).values({
        userId: directorId,
        tenantId: tenant.id,
        role: 'DIRECTOR',
        createdAt: new Date(),
      }).onConflictDoNothing();

      // Create a booster for each tenant
      const boosterEmail = `booster@${tenant.slug}.edu`;
      const existingBooster = await db.select().from(users).where(eq(users.email, boosterEmail)).limit(1);
      
      let boosterId: string;
      if (existingBooster.length === 0) {
        // Create user in Supabase Auth
        const { data: authUser, error } = await supabaseAdmin.auth.admin.createUser({
          email: boosterEmail,
          password: 'password123',
          email_confirm: true,
          user_metadata: {
            name: `${tenant.name} Booster`,
            tenantId: tenant.id
          }
        });

        if (error) {
          console.error(`❌ Failed to create booster auth: ${error.message}`);
          continue;
        }

        const [booster] = await db.insert(users).values({
          id: authUser.user.id,
          email: boosterEmail,
          displayName: `${tenant.name} Booster`,
          role: 'BOOSTER',
          tenantId: tenant.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning();
        boosterId = booster.id;
        console.log(`✅ Created booster: ${boosterEmail}`);
      } else {
        boosterId = existingBooster[0].id;
        console.log(`⏭️  Booster already exists: ${boosterEmail}`);
      }

      // Create membership for booster
      await db.insert(memberships).values({
        userId: boosterId,
        tenantId: tenant.id,
        role: 'BOOSTER',
        createdAt: new Date(),
      }).onConflictDoNothing();

      // Create 2 test parents for each tenant
      for (let i = 1; i <= 2; i++) {
        const parentEmail = `parent${i}@${tenant.slug}.edu`;
        const existingParent = await db.select().from(users).where(eq(users.email, parentEmail)).limit(1);
        
        let parentId: string;
        if (existingParent.length === 0) {
          // Create user in Supabase Auth
          const { data: authUser, error } = await supabaseAdmin.auth.admin.createUser({
            email: parentEmail,
            password: 'password123',
            email_confirm: true,
            user_metadata: {
              name: `${tenant.name} Parent ${i}`,
              tenantId: tenant.id
            }
          });

          if (error) {
            console.error(`❌ Failed to create parent auth: ${error.message}`);
            continue;
          }

          const [parent] = await db.insert(users).values({
            id: authUser.user.id,
            email: parentEmail,
            displayName: `${tenant.name} Parent ${i}`,
            role: 'PARENT',
            tenantId: tenant.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          }).returning();
          parentId = parent.id;
          console.log(`✅ Created parent: ${parentEmail}`);
        } else {
          parentId = existingParent[0].id;
          console.log(`⏭️  Parent already exists: ${parentEmail}`);
        }

        // Create membership for parent
        await db.insert(memberships).values({
          userId: parentId,
          tenantId: tenant.id,
          role: 'PARENT',
          createdAt: new Date(),
        }).onConflictDoNothing();
      }
    }

    // 4. Create sample students for each tenant
    console.log('Creating test students...');
    const instruments = ['Flute', 'Clarinet', 'Trumpet', 'Trombone', 'Percussion', 'Saxophone'];
    
    for (const tenant of createdTenants) {
      for (let i = 1; i <= 5; i++) {
        const studentName = `Student ${i} ${tenant.slug.charAt(0).toUpperCase()}${tenant.slug.slice(1)}`;
        const instrument = instruments[Math.floor(Math.random() * instruments.length)];
        
        const existingStudent = await db.select().from(students)
          .where(eq(students.tenantId, tenant.id))
          .where(eq(students.name, studentName))
          .limit(1);
        
        if (existingStudent.length === 0) {
          await db.insert(students).values({
            id: randomUUID(),
            name: studentName,
            instrument,
            tenantId: tenant.id,
            source: 'ROSTER',
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          console.log(`✅ Created student: ${studentName} (${tenant.name})`);
        } else {
          console.log(`⏭️  Student already exists: ${studentName} (${tenant.name})`);
        }
      }
    }

    console.log('\n🎉 Test data seeding complete!');
    console.log('\n📝 Test Credentials:');
    console.log('All passwords: password123');
    console.log('\nTest URLs:');
    console.log('- http://default.localhost:3000');
    console.log('- http://riverside.localhost:3000');
    console.log('- http://northview.localhost:3000');
    console.log('\nTest Invite Codes:');
    console.log('- TEST-2024 (Test School)');
    console.log('- DEMO-2024 (Demo Academy)');
    console.log('- SCHOOL1-2024 (First School)');
    console.log('- BETA-2024 (Beta High School)');
    console.log('\nTest Accounts per tenant:');
    console.log('- director@[tenant-slug].edu');
    console.log('- booster@[tenant-slug].edu');
    console.log('- parent1@[tenant-slug].edu');
    console.log('- parent2@[tenant-slug].edu');

  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    await pgPool.end();
    process.exit(1);
  }

  await pgPool.end();
  process.exit(0);
}

// Run the seeding
seedTestData();