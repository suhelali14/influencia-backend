// Quick migration script to update AI reports table
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  // Read connection from .env or use defaults
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'influencia_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '1234',
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    const sql = fs.readFileSync(
      path.join(__dirname, 'migrations', '004_update_ai_reports_uuid.sql'),
      'utf8'
    );

    console.log('🔄 Running migration...');
    await client.query(sql);
    console.log('✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
