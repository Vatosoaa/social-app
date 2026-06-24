const fs = require('fs');
const path = require('path');

// Load .env manually to avoid extra dependencies
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
  console.log('Connected to PostgreSQL to add new Facebook-like profile fields...');

  try {
    console.log('Altering "users" table to add new columns...');
    await client.sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS gender_pronouns VARCHAR(255),
      ADD COLUMN IF NOT EXISTS relationship_status VARCHAR(255),
      ADD COLUMN IF NOT EXISTS languages VARCHAR(255),
      ADD COLUMN IF NOT EXISTS job_title VARCHAR(255),
      ADD COLUMN IF NOT EXISTS skills TEXT,
      ADD COLUMN IF NOT EXISTS phone VARCHAR(255),
      ADD COLUMN IF NOT EXISTS hometown VARCHAR(255),
      ADD COLUMN IF NOT EXISTS website VARCHAR(255),
      ADD COLUMN IF NOT EXISTS social_linkedin VARCHAR(255),
      ADD COLUMN IF NOT EXISTS hobbies TEXT,
      ADD COLUMN IF NOT EXISTS interests TEXT;
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
