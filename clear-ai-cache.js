const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_NvtcA1GIHFC0@ep-morning-rain-anbmhzys-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function clearCache() {
  try {
    await client.connect();
    console.log('🔌 Connected to database');

    const result = await client.query('DELETE FROM ai_analysis_reports');
    console.log(`✅ Cleared ${result.rowCount} cached AI analysis records`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

clearCache();
