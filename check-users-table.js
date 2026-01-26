const { Client } = require('pg');
require('dotenv').config();

async function checkUsersTable() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  
  const result = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    ORDER BY ordinal_position
  `);
  
  console.log('Users table structure:');
  result.rows.forEach(col => {
    console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default || ''}`);
  });
  
  await client.end();
}

checkUsersTable().catch(console.error);
