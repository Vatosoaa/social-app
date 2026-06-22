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
  console.log('Connected to PostgreSQL for stories migration...');

  try {
    // 1. Create stories table
    console.log('Creating "stories" table...');
    await client.sql`
      CREATE TABLE IF NOT EXISTS stories (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        media_url TEXT NOT NULL,
        media_type VARCHAR(50) DEFAULT 'image',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('Table "stories" checked/created.');

    // 2. Create story_views table
    console.log('Creating "story_views" table...');
    await client.sql`
      CREATE TABLE IF NOT EXISTS story_views (
        story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (story_id, user_id)
      );
    `;
    console.log('Table "story_views" checked/created.');

    // 3. Clear any existing stories to avoid duplicate seeds during local setup
    await client.sql`TRUNCATE TABLE stories CASCADE;`;

    // 4. Query existing users to seed some mock stories
    const { rows: users } = await client.sql`SELECT id, email FROM users;`;
    const userMap = {};
    users.forEach(u => {
      userMap[u.email] = u.id;
    });

    const jeanId = userMap['jean.dupont@example.com'];
    const marieId = userMap['marie.martin@example.com'];
    const thomasId = userMap['thomas.dubois@example.com'];

    if (jeanId || marieId || thomasId) {
      console.log('Seeding mock stories...');
      
      if (jeanId) {
        // Jean's stories: a code image and a nature image
        await client.sql`
          INSERT INTO stories (user_id, media_url, media_type, created_at)
          VALUES (
            ${jeanId}, 
            'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1000&auto=format&fit=crop', 
            'image', 
            NOW() - INTERVAL '4 hours'
          );
        `;
        await client.sql`
          INSERT INTO stories (user_id, media_url, media_type, created_at)
          VALUES (
            ${jeanId}, 
            'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1000&auto=format&fit=crop', 
            'image', 
            NOW() - INTERVAL '3 hours'
          );
        `;
      }

      if (marieId) {
        // Marie's story: a city image
        await client.sql`
          INSERT INTO stories (user_id, media_url, media_type, created_at)
          VALUES (
            ${marieId}, 
            'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=1000&auto=format&fit=crop', 
            'image', 
            NOW() - INTERVAL '2 hours'
          );
        `;
      }

      if (thomasId) {
        // Thomas's story: a video
        await client.sql`
          INSERT INTO stories (user_id, media_url, media_type, created_at)
          VALUES (
            ${thomasId}, 
            'https://www.w3schools.com/html/mov_bbb.mp4', 
            'video', 
            NOW() - INTERVAL '1 hours'
          );
        `;
      }

      console.log('Mock stories seeded successfully!');
    } else {
      console.log('No seed users found in the database. Skipping story seeding.');
    }

    console.log('Database stories migration completed successfully! 🎉');
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
