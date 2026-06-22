const fs = require('fs');
const path = require('path');

// Load .env manually
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?/);
      if (match) {
        let value = match[2] || '';
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[match[1]] = value;
      }
    });
    console.log('✅ .env chargé');
  }
} catch (err) {
  console.error('Erreur chargement .env:', err);
}

if (!process.env.POSTGRES_URL) {
  console.error('❌ POSTGRES_URL non défini');
  process.exit(1);
}

const { db } = require('@vercel/postgres');

async function reset() {
  const client = await db.connect();
  console.log('🔌 Connecté à la base de données...');
  try {
    // Delete story_views first (FK constraint), then stories
    await client.sql`DELETE FROM story_views`;
    console.log('🗑️  story_views vidée');
    await client.sql`DELETE FROM stories`;
    console.log('🗑️  stories vidée');
    // Reset auto-increment sequences
    await client.sql`ALTER SEQUENCE stories_id_seq RESTART WITH 1`;
    console.log('🔄 Séquence stories_id réinitialisée');
    console.log('✅ Base de données stories réinitialisée avec succès !');
  } catch (err) {
    console.error('❌ Erreur:', err.message);
  } finally {
    await client.release();
  }
}

reset().catch(console.error);
