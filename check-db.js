const { Client } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

async function checkDatabase() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Connecting to Neon database...');
    await client.connect();
    console.log('✅ Connected!\n');

    // Check what tables exist
    const { rows: tables } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📊 Existing tables:');
    tables.forEach(t => console.log(`  - ${t.table_name}`));
    console.log('');

    // Check migrations table
    const migrationsExists = tables.some(t => t.table_name === 'migrations');
    if (migrationsExists) {
      const { rows: migrations } = await client.query(
        'SELECT filename, executed_at FROM migrations ORDER BY executed_at'
      );
      console.log('📋 Executed migrations:');
      migrations.forEach(m => console.log(`  ✅ ${m.filename} (${m.executed_at})`));
    } else {
      console.log('⚠️  No migrations tracking table found');
    }
    console.log('');

    // Check ai_analysis_reports table structure
    const aiReportsExists = tables.some(t => t.table_name === 'ai_analysis_reports');
    if (aiReportsExists) {
      const { rows: columns } = await client.query(`
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns
        WHERE table_name = 'ai_analysis_reports'
        ORDER BY ordinal_position
      `);
      console.log('🔍 ai_analysis_reports columns:');
      columns.forEach(c => {
        const type = c.character_maximum_length 
          ? `${c.data_type}(${c.character_maximum_length})`
          : c.data_type;
        console.log(`  - ${c.column_name}: ${type}`);
      });
    } else {
      console.log('⚠️  ai_analysis_reports table does not exist yet');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkDatabase();
