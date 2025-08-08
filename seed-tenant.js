// Quick script to seed default tenant
const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');

async function seedTenant() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool);

  try {
    // Insert default tenant
    const result = await db.execute(`
      INSERT INTO tenants (slug, name) 
      VALUES ('default', 'Default Band Program')
      ON CONFLICT (slug) DO NOTHING
      RETURNING id, slug, name;
    `);

    console.log('✅ Default tenant seeded:', result.rows[0] || 'Already exists');
    
    // Also seed some basic payment categories
    await db.execute(`
      INSERT INTO payment_categories (id, name, description, full_amount, allow_increments, increment_amount) 
      VALUES 
        ('BAND_FEES', 'Band Fees', 'Annual band participation fees', 25000, false, null),
        ('SPRING_TRIP', 'Spring Trip', 'Spring band trip expenses', 90000, true, 5000),
        ('EQUIPMENT', 'Equipment', 'Band equipment and supplies', 15000, true, 2500)
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('✅ Payment categories seeded');

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
  } finally {
    await pool.end();
  }
}

seedTenant();