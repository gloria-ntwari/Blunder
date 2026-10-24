import { readdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { query } from '../config/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationFiles = readdirSync(__dirname)
  .filter((file) => file.endsWith('.sql'))
  .sort();

async function migrate() {
  try {
    console.log('Running migrations...');
    for (const file of migrationFiles) {
      console.log(`Running ${file}...`);
      try {
        await query(readFileSync(join(__dirname, file), 'utf-8'));
      } catch (err) {
        // Existing deployments already ran the initial schema migration.
        // Its enum creation is not idempotent, so continue with later migrations.
        if (file === '001_init.sql' && /already exists/i.test(err.message)) {
          console.warn('Initial schema already exists; continuing with incremental migrations.');
          continue;
        }
        throw err;
      }
    }
    console.log('✅ Migrations complete');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
}

migrate();
