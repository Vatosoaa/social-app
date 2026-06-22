const fs = require('fs');
const path = require('path');

// Load .env manually
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value;
      }
    });
    console.log('Loaded .env successfully');
  } else {
    console.log('.env file not found');
  }
} catch (err) {
  console.error('Error loading .env file:', err);
}

if (!process.env.POSTGRES_URL) {
  console.error('Error: POSTGRES_URL is not defined in .env');
  process.exit(1);
}

const { db } = require('@vercel/postgres');

async function runMigration() {
  const client = await db.connect();
  console.log('Connected to PostgreSQL to add new profile fields...');

  try {
    console.log('Altering "users" table to add new columns...');
    await client.sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS role VARCHAR(255),
      ADD COLUMN IF NOT EXISTS experience_level VARCHAR(255),
      ADD COLUMN IF NOT EXISTS favorite_artists VARCHAR(255),
      ADD COLUMN IF NOT EXISTS favorite_genre VARCHAR(255),
      ADD COLUMN IF NOT EXISTS software_equipment VARCHAR(255),
      ADD COLUMN IF NOT EXISTS music_mood VARCHAR(255),
      ADD COLUMN IF NOT EXISTS city_region VARCHAR(255),
      ADD COLUMN IF NOT EXISTS availability VARCHAR(255),
      ADD COLUMN IF NOT EXISTS badges TEXT,
      ADD COLUMN IF NOT EXISTS tags TEXT,
      ADD COLUMN IF NOT EXISTS social_youtube TEXT,
      ADD COLUMN IF NOT EXISTS social_instagram TEXT,
      ADD COLUMN IF NOT EXISTS social_tiktok TEXT,
      ADD COLUMN IF NOT EXISTS social_facebook TEXT,
      ADD COLUMN IF NOT EXISTS social_gmail TEXT;
    `;
    console.log('Table "users" updated successfully.');
    console.log('Database migration completed! 🎉');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.release();
    console.log('Database connection closed.');
  }
}

runMigration().catch(err => {
  console.error('Unexpected migration error:', err);
});
