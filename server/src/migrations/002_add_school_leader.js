import { query } from '../config/db.js';

async function run() {
  try {
    // 1. Add 'school_leader' to user_role enum if not exists
    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumtypid = 'user_role'::regtype
          AND enumlabel = 'school_leader'
        ) THEN
          ALTER TYPE user_role ADD VALUE 'school_leader';
        END IF;
      END$$;
    `);
    console.log("✅ Added 'school_leader' to user_role enum");

    // 2. Add class_year column to announcements, events, deadlines if not exists
    await query(`
      ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_class VARCHAR(50);
      ALTER TABLE events ADD COLUMN IF NOT EXISTS target_class VARCHAR(50);
      ALTER TABLE deadlines ADD COLUMN IF NOT EXISTS target_class VARCHAR(50);
    `);
    console.log("✅ Added target_class column to announcements, events, and deadlines");

    // 3. Fix any double-stringified food_menu items
    const foodRows = await query('SELECT id, items FROM food_menu');
    for (const row of foodRows.rows) {
      if (typeof row.items === 'string') {
        try {
          let parsed = JSON.parse(row.items);
          if (typeof parsed === 'string') parsed = JSON.parse(parsed);
          await query('UPDATE food_menu SET items = $1 WHERE id = $2', [JSON.stringify(parsed), row.id]);
        } catch (e) {
          console.error('Error parsing row:', row.id, e.message);
        }
      }
    }
    console.log("✅ Cleaned up food_menu items");

    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
}

run();
