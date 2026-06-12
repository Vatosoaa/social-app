const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function seed() {
  const client = await db.connect();
  console.log('Connected to PostgreSQL database');

  try {
    // Drop table if exists to update schema
    console.log('Dropping existing "users" table to recreate it with the new schema...');
    await client.sql`DROP TABLE IF EXISTS users CASCADE;`;
    
    console.log('Creating "users" table with new schema...');
    await client.sql`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        bio TEXT,
        avatar_url TEXT,
        reset_token VARCHAR(255),
        reset_token_expires TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('Table "users" created.');

    console.log('Inserting mock users...');
    const hashedPwd = hashPassword('password123');
    
    // Insert some mock users with predefined avatar images (using UI avatars or nice placeholders)
    await client.sql`
      INSERT INTO users (email, password_hash, name, bio, avatar_url) VALUES
      ('jean.dupont@example.com', ${hashedPwd}, 'Jean Dupont', 'Développeur passionné par Next.js et Tailwind CSS 🚀. Aime partager son savoir !', 'https://api.dicebear.com/7.x/adventurer/svg?seed=Jean'),
      ('marie.martin@example.com', ${hashedPwd}, 'Marie Martin', 'Designer UI/UX & Freelance. Créatrice d interfaces élégantes et fluides. ✨🎨', 'https://api.dicebear.com/7.x/adventurer/svg?seed=Marie'),
      ('thomas.dubois@example.com', ${hashedPwd}, 'Thomas Dubois', 'Product Manager. Fan de tech, de caféine et de méthodologies agiles. ☕💻', 'https://api.dicebear.com/7.x/adventurer/svg?seed=Thomas');
    `;
    console.log('Mock users inserted successfully.');

  } catch (error) {
    console.error('Error running query:', error);
  } finally {
    await client.release();
    console.log('Database connection closed.');
  }
}

seed().catch(err => {
  console.error('Unexpected seeding error:', err);
});
