const { Client } = require('pg');
require('dotenv').config();

async function checkSocialAccountsTable() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  
  const result = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_name = 'social_accounts' 
    ORDER BY ordinal_position
  `);
  
  console.log('social_accounts table structure:');
  result.rows.forEach(col => {
    console.log(`  ${col.column_name}: ${col.data_type}`);
  });
  
  await client.end();
}

checkSocialAccountsTable().catch(console.error);
