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

async function seed() {
  const client = await db.connect();
  console.log('Connected to PostgreSQL database');

  try {
    console.log('Creating "users" table if it does not exist...');
    await client.sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('Table "users" created or already exists.');

    const { rows } = await client.sql`SELECT COUNT(*) FROM users;`;
    const count = parseInt(rows[0].count, 10);
    
    if (count === 0) {
      console.log('Inserting mock users...');
      await client.sql`
        INSERT INTO users (name, email) VALUES
        ('Jean Dupont', 'jean.dupont@example.com'),
        ('Marie Martin', 'marie.martin@example.com'),
        ('Thomas Dubois', 'thomas.dubois@example.com')
        ON CONFLICT (email) DO NOTHING;
      `;
      console.log('Mock users inserted.');
    } else {
      console.log(`Table already has ${count} users. Skipping insertion.`);
    }

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
