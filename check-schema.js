const { Client } = require('pg');
require('dotenv').config();

async function checkSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected!\n');

  // Check brands columns
  const brands = await client.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'brands' ORDER BY ordinal_position"
  );
  console.log('=== BRANDS columns ===');
  brands.rows.forEach(r => console.log('  ', r.column_name, '-', r.data_type));

  // Check social_accounts unique constraints
  const constraints = await client.query(
    "SELECT conname FROM pg_constraint WHERE conrelid = 'social_accounts'::regclass AND contype = 'u'"
  );
  console.log('\n=== SOCIAL_ACCOUNTS UNIQUE CONSTRAINTS ===');
  constraints.rows.forEach(r => console.log('  ', r.conname));

  // Counts
  const cc = await client.query("SELECT count(*) FROM creators");
  const bc = await client.query("SELECT count(*) FROM brands");
  const sc = await client.query("SELECT count(*) FROM social_accounts");
  console.log('\nCounts: creators=' + cc.rows[0].count + ', brands=' + bc.rows[0].count + ', socials=' + sc.rows[0].count);

  // Check indexes
  const indexes = await client.query(
    "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname"
  );
  console.log('\n=== ALL INDEXES ===');
  console.log(indexes.rows.map(r => r.indexname).join(', '));

  // Check foreign keys
  const fks = await client.query(`
    SELECT conname, conrelid::regclass AS table_name
    FROM pg_constraint 
    WHERE contype = 'f' AND connamespace = 'public'::regnamespace
    ORDER BY conname
  `);
  console.log('\n=== FOREIGN KEYS ===');
  fks.rows.forEach(r => console.log(`  ${r.conname} on ${r.table_name}`));

  // Check views
  const views = await client.query(
    "SELECT table_name FROM information_schema.views WHERE table_schema = 'public'"
  );
  console.log('\n=== VIEWS ===');
  console.log(views.rows.map(r => r.table_name).join(', '));

  // Check check constraints
  const checks = await client.query(`
    SELECT conname, conrelid::regclass AS table_name
    FROM pg_constraint 
    WHERE contype = 'c' AND connamespace = 'public'::regnamespace
    ORDER BY conname
  `);
  console.log('\n=== CHECK CONSTRAINTS ===');
  checks.rows.forEach(r => console.log(`  ${r.conname} on ${r.table_name}`));

  await client.end();
}

checkSchema().catch(e => { console.error(e.message); process.exit(1); });
