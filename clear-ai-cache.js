const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:tPYfJKsFIevm@ep-nameless-dew-a4bi7xc6-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
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
