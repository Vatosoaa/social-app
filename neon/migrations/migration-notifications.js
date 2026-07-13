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
  console.log('Connected to PostgreSQL for notifications migration...');

  try {
    // 1. Create notifications table
    console.log('Creating "notifications" table...');
    await client.sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        notifier_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL, -- 'follow', 'reaction', 'comment'
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        comment_id INTEGER,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('Table "notifications" checked/created.');

    // 2. Clear any old notifications to start fresh
    await client.sql`TRUNCATE TABLE notifications CASCADE;`;

    // 3. Query existing users and posts to seed some notifications
    const { rows: users } = await client.sql`SELECT id, name FROM users LIMIT 3;`;
    const { rows: posts } = await client.sql`SELECT id, user_id FROM posts LIMIT 3;`;

    if (users.length >= 2) {
      console.log('Seeding mock notifications...');
      // User 1 receives notification from User 2
      const user1 = users[0].id;
      const user2 = users[1].id;
      
      // Let's add a follow notification
      await client.sql`
        INSERT INTO notifications (recipient_id, notifier_id, type)
        VALUES (${user1}, ${user2}, 'follow')
      `;

      // Let's add a reaction notification on user 1's post if they have one
      const user1Post = posts.find(p => p.user_id === user1);
      if (user1Post) {
        await client.sql`
          INSERT INTO notifications (recipient_id, notifier_id, type, post_id)
          VALUES (${user1}, ${user2}, 'reaction', ${user1Post.id})
        `;
      }

      // User 2 receives notifications from User 1
      await client.sql`
        INSERT INTO notifications (recipient_id, notifier_id, type)
        VALUES (${user2}, ${user1}, 'follow')
      `;

      if (users[2]) {
        const user3 = users[2].id;
        // User 2 receives comment notification from User 3 on their post
        const user2Post = posts.find(p => p.user_id === user2);
        if (user2Post) {
          await client.sql`
            INSERT INTO notifications (recipient_id, notifier_id, type, post_id)
            VALUES (${user2}, ${user3}, 'comment', ${user2Post.id})
          `;
        }
      }
      console.log('Mock notifications seeded successfully!');
    }

    console.log('Database notifications migration completed successfully! 🎉');
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
