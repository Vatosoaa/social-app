const { db } = require('@vercel/postgres');
const fs = require('fs');
const path = require('path');

// Load .env manually
try {
  let envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    envPath = path.join(__dirname, '..', '.env');
  }
  if (!fs.existsSync(envPath)) {
    envPath = path.join(__dirname, '..', '..', '.env');
  }
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let val = match[2] || '';
        val = val.replace(/['"]/g, '').trim();
        process.env[match[1]] = val;
      }
    });
  }
} catch (e) {
  console.error(e);
}

async function run() {
  const client = await db.connect();
  try {
    console.log('Altering stories table to add music columns...');
    await client.sql`
      ALTER TABLE stories 
      ADD COLUMN IF NOT EXISTS music_url TEXT,
      ADD COLUMN IF NOT EXISTS music_title TEXT,
      ADD COLUMN IF NOT EXISTS music_artist TEXT;
    `;
    console.log('Database altered successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.release();
  }
}
run();
