import { readdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { query } from '../config/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationFiles = readdirSync(__dirname)
  .filter((file) => file.endsWith('.sql'))
  .sort();

const guildsOnly = process.argv.includes('--guilds-only');
const leagueOnly = process.argv.includes('--league-only');
const announcementTracksOnly = process.argv.includes('--announcement-tracks-only');
const taxiOnly = process.argv.includes('--taxi-only');

async function migrate() {
  try {
    console.log('Running migrations...');
    const filesToRun = guildsOnly ? migrationFiles.filter((file) => file === '010_guilds.sql') : leagueOnly ? migrationFiles.filter((file) => ['016_lungesliga.sql', '019_league_delete_history.sql', '020_remove_orphan_league_goals.sql', '021_league_house_categories.sql'].includes(file)) : announcementTracksOnly ? migrationFiles.filter((file) => file === '017_announcement_tracks.sql') : taxiOnly ? migrationFiles.filter((file) => ['022_lost_found_auto_cleanup_and_taxi.sql', '023_taxi_request_seats.sql', '024_taxi_seat_request_board.sql'].includes(file)) : migrationFiles;
    for (const file of filesToRun) {
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
