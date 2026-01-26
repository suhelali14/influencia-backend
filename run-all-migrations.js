const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

const migrationFiles = [
  '001_initial_schema.sql',
  '002_create_collaborations.sql',
  '003_create_ai_reports.sql',
  '004_update_ai_reports_uuid.sql'
];

async function runMigrations() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Connecting to Neon database...');
    await client.connect();
    console.log('✅ Connected!\n');

    // Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('📋 Migrations tracking table ready\n');

    // Get already executed migrations
    const { rows: executedMigrations } = await client.query(
      'SELECT filename FROM migrations'
    );
    const executedSet = new Set(executedMigrations.map(m => m.filename));

    // Run each migration
    for (const filename of migrationFiles) {
      if (executedSet.has(filename)) {
        console.log(`⏭️  Skipping ${filename} (already executed)`);
        continue;
      }

      console.log(`🚀 Running migration: ${filename}`);
      const filePath = path.join(__dirname, 'migrations', filename);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        // Begin transaction
        await client.query('BEGIN');
        
        // Execute migration
        await client.query(sql);
        
        // Record migration
        await client.query(
          'INSERT INTO migrations (filename) VALUES ($1)',
          [filename]
        );
        
        // Commit transaction
        await client.query('COMMIT');
        console.log(`✅ Successfully executed ${filename}\n`);
      } catch (error) {
        // Rollback on error
        await client.query('ROLLBACK');
        console.error(`❌ Error executing ${filename}:`, error.message);
        throw error;
      }
    }

    console.log('🎉 All migrations completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

runMigrations();
