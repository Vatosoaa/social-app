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
  console.log('Connected to PostgreSQL for friends migration...');

  try {
    // 1. Alter users table to add birthday, school, workplace
    console.log('Adding birthday, school, and workplace columns to "users" table...');
    await client.sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS birthday DATE,
      ADD COLUMN IF NOT EXISTS school VARCHAR(255),
      ADD COLUMN IF NOT EXISTS workplace VARCHAR(255);
    `;
    console.log('Columns added successfully.');

    // 2. Create friend_requests table
    console.log('Creating "friend_requests" table...');
    await client.sql`
      CREATE TABLE IF NOT EXISTS friend_requests (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_friend_request UNIQUE (sender_id, receiver_id),
        CONSTRAINT no_self_friend_request CHECK (sender_id <> receiver_id)
      );
    `;
    console.log('Table "friend_requests" created.');

    // 3. Create friendships table
    console.log('Creating "friendships" table...');
    await client.sql`
      CREATE TABLE IF NOT EXISTS friendships (
        id SERIAL PRIMARY KEY,
        user_id1 INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_id2 INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_friendship UNIQUE (user_id1, user_id2),
        CONSTRAINT user_id_order CHECK (user_id1 < user_id2)
      );
    `;
    console.log('Table "friendships" created.');

    // 4. Update existing users with test details
    console.log('Updating existing users with profile info...');
    await client.sql`
      UPDATE users SET 
        birthday = '1995-06-22',
        city_region = 'Paris, France',
        school = 'Sorbonne',
        workplace = 'Google',
        role = 'Développeur Fullstack'
      WHERE email = 'jean.dupont@example.com';
    `;
    await client.sql`
      UPDATE users SET 
        birthday = '1998-10-15',
        city_region = 'Paris, France',
        school = 'Sorbonne',
        workplace = 'Vercel',
        role = 'UI/UX Designer'
      WHERE email = 'marie.martin@example.com';
    `;
    await client.sql`
      UPDATE users SET 
        birthday = '1993-02-12',
        city_region = 'Lyon, France',
        school = 'INSA Lyon',
        workplace = 'Google',
        role = 'Product Manager'
      WHERE email = 'thomas.dubois@example.com';
    `;

    // 5. Create additional test users for rich suggestions/requests
    console.log('Adding additional mock users for suggestions...');
    const dummyPwdHash = 'e207917f8e7150a00045f272a818c3db:07a977ba22bc30a9e7fdeec81dbd928236d936ef3eb135f29d2cd58682e0fb5c59f515ee040ef36e053a48e7e1781297df3158c558c42667389a9f939e9489aa'; // password123 with random salt
    
    await client.sql`
      INSERT INTO users (email, password_hash, name, bio, avatar_url, birthday, city_region, school, workplace, role)
      VALUES 
      ('lucas.bernard@example.com', ${dummyPwdHash}, 'Lucas Bernard', 'Fan de musique, piano et dev web 🎹.', 'https://api.dicebear.com/7.x/adventurer/svg?seed=Lucas', '1994-06-22', 'Paris, France', 'Sorbonne', 'Google', 'Lead Developer'),
      ('emma.petit@example.com', ${dummyPwdHash}, 'Emma Petit', 'Chanteuse lyrique & Product Designer.', 'https://api.dicebear.com/7.x/adventurer/svg?seed=Emma', '1997-04-18', 'Paris, France', 'Sorbonne', 'Vercel', 'Lead Designer'),
      ('sophie.dubois@example.com', ${dummyPwdHash}, 'Sophie Dubois', 'Guitariste rock & dev mobile iOS 🎸.', 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sophie', '1996-08-30', 'Lyon, France', 'INSA Lyon', 'Apple', 'iOS Architect')
      ON CONFLICT (email) DO NOTHING;
    `;

    // 6. Fetch user IDs to seed relationships
    const { rows: users } = await client.sql`SELECT id, email FROM users;`;
    const userMap = {};
    users.forEach(u => { userMap[u.email] = u.id; });

    const jean = userMap['jean.dupont@example.com'];
    const marie = userMap['marie.martin@example.com'];
    const thomas = userMap['thomas.dubois@example.com'];
    const lucas = userMap['lucas.bernard@example.com'];
    const emma = userMap['emma.petit@example.com'];
    const sophie = userMap['sophie.dubois@example.com'];

    if (jean && marie && thomas && lucas && emma && sophie) {
      console.log('Seeding mock friendships and requests...');
      
      // Clear existing to avoid duplicate conflicts during testing
      await client.sql`DELETE FROM friendships;`;
      await client.sql`DELETE FROM friend_requests;`;

      // Seed Friendships (ensure id1 < id2)
      const friendshipsToInsert = [
        [jean, marie],
        [jean, thomas],
        [marie, thomas],
        [marie, emma],
        [thomas, sophie]
      ];

      for (const [idA, idB] of friendshipsToInsert) {
        const id1 = Math.min(idA, idB);
        const id2 = Math.max(idA, idB);
        await client.sql`
          INSERT INTO friendships (user_id1, user_id2) 
          VALUES (${id1}, ${id2})
          ON CONFLICT (user_id1, user_id2) DO NOTHING;
        `;
      }

      // Seed Friend Requests (Lucas -> Jean, Emma -> Jean, Sophie -> Marie)
      await client.sql`
        INSERT INTO friend_requests (sender_id, receiver_id)
        VALUES 
        (${lucas}, ${jean}),
        (${emma}, ${jean}),
        (${sophie}, ${marie})
        ON CONFLICT (sender_id, receiver_id) DO NOTHING;
      `;

      console.log('Seeding complete.');
    }

    console.log('Database migration completed successfully! 🎉');
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
