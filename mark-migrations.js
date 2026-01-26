const { Client } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

const migrationFiles = [
  '001_initial_schema.sql',
  '002_create_collaborations.sql',
  '003_create_ai_reports.sql',
  '004_update_ai_reports_uuid.sql'
];

async function markMigrationsAsExecuted() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Connecting to Neon database...');
    await client.connect();
    console.log('✅ Connected!\n');

    console.log('📝 Marking migrations as executed...\n');

    for (const filename of migrationFiles) {
      // Check if already recorded
      const { rows } = await client.query(
        'SELECT filename FROM migrations WHERE filename = $1',
        [filename]
      );

      if (rows.length === 0) {
        await client.query(
          'INSERT INTO migrations (filename) VALUES ($1)',
          [filename]
        );
        console.log(`✅ Recorded: ${filename}`);
      } else {
        console.log(`⏭️  Already recorded: ${filename}`);
      }
    }

    console.log('\n🎉 All migrations are now tracked!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

markMigrationsAsExecuted();
