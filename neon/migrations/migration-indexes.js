const fs = require('fs');
const path = require('path');

// Load .env manually
try {
  let envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) envPath = path.join(__dirname, '..', '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
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
  console.log('Connected to PostgreSQL for indexes migration...');

  try {
    // --- posts table ---
    console.log('Creating indexes on "posts"...');
    await client.sql`CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id)`;
    await client.sql`CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC)`;
    await client.sql`CREATE INDEX IF NOT EXISTS idx_posts_media_type ON posts(media_type) WHERE media_type IS NOT NULL`;
    console.log('  posts indexes OK');

    // --- likes table ---
    console.log('Creating indexes on "likes"...');
    await client.sql`CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id)`;
    await client.sql`CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id)`;
    console.log('  likes indexes OK');

    // --- comments table ---
    console.log('Creating indexes on "comments"...');
    await client.sql`CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id)`;
    await client.sql`CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL`;
    console.log('  comments indexes OK');

    // --- favorites table ---
    console.log('Creating indexes on "favorites"...');
    await client.sql`CREATE INDEX IF NOT EXISTS idx_favorites_post_id ON favorites(post_id)`;
    await client.sql`CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id)`;
    console.log('  favorites indexes OK');

    // --- stories table ---
    console.log('Creating indexes on "stories"...');
    await client.sql`CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id)`;
    await client.sql`CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories(created_at DESC)`;
    console.log('  stories indexes OK');

    // --- story_views table ---
    console.log('Creating indexes on "story_views"...');
    await client.sql`CREATE INDEX IF NOT EXISTS idx_story_views_story_id ON story_views(story_id)`;
    await client.sql`CREATE INDEX IF NOT EXISTS idx_story_views_user_id ON story_views(user_id)`;
    console.log('  story_views indexes OK');

    // --- friendships table ---
    console.log('Creating indexes on "friendships"...');
    await client.sql`CREATE INDEX IF NOT EXISTS idx_friendships_user_id1 ON friendships(user_id1)`;
    await client.sql`CREATE INDEX IF NOT EXISTS idx_friendships_user_id2 ON friendships(user_id2)`;
    console.log('  friendships indexes OK');

    // --- friend_requests table ---
    console.log('Creating indexes on "friend_requests"...');
    await client.sql`CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver_id ON friend_requests(receiver_id)`;
    await client.sql`CREATE INDEX IF NOT EXISTS idx_friend_requests_sender_id ON friend_requests(sender_id)`;
    await client.sql`CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status) WHERE status = 'pending'`;
    console.log('  friend_requests indexes OK');

    // --- follows table ---
    console.log('Creating indexes on "follows"...');
    await client.sql`CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id)`;
    await client.sql`CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id)`;
    console.log('  follows indexes OK');

    // --- conversations table ---
    console.log('Creating indexes on "conversations"...');
    await client.sql`CREATE INDEX IF NOT EXISTS idx_conversations_user1_id ON conversations(user1_id)`;
    await client.sql`CREATE INDEX IF NOT EXISTS idx_conversations_user2_id ON conversations(user2_id)`;
    console.log('  conversations indexes OK');

    // --- messages table ---
    console.log('Creating indexes on "messages"...');
    await client.sql`CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id, created_at DESC)`;
    await client.sql`CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id)`;
    await client.sql`CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status) WHERE status <> 'seen'`;
    console.log('  messages indexes OK');

    // --- notifications table ---
    console.log('Creating indexes on "notifications"...');
    await client.sql`CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id)`;
    await client.sql`CREATE INDEX IF NOT EXISTS idx_notifications_post_id ON notifications(post_id) WHERE post_id IS NOT NULL`;
    await client.sql`CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read) WHERE is_read = FALSE`;
    console.log('  notifications indexes OK');

    // --- groups tables (if they exist) ---
    console.log('Creating indexes on groups tables (if they exist)...');
    try {
      await client.sql`CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id)`;
      await client.sql`CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id)`;
      await client.sql`CREATE INDEX IF NOT EXISTS idx_group_posts_group_id ON group_posts(group_id, created_at DESC)`;
      console.log('  groups indexes OK');
    } catch {
      console.log('  groups tables not found, skipping (expected if not initialized yet)');
    }

    console.log('\n✅ All indexes created successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await client.release();
    console.log('Database connection closed.');
  }
}

runMigration().catch(err => {
  console.error('Unexpected migration error:', err);
  process.exit(1);
});
