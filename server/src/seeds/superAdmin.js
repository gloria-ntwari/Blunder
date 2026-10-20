import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

import { query } from '../config/db.js';

async function seed() {
  const { SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, SUPER_ADMIN_NAME } = process.env;

  if (!SUPER_ADMIN_EMAIL || !SUPER_ADMIN_PASSWORD) {
    console.error('Missing SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD in .env');
    process.exit(1);
  }

  const hash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12);

  const existing = await query('SELECT id FROM users WHERE email = $1', [SUPER_ADMIN_EMAIL]);
  if (existing.rows.length > 0) {
    console.log('Super admin already exists. Skipping seed.');
    process.exit(0);
  }

  await query(
    `INSERT INTO users (full_name, email, password_hash, role, is_verified)
     VALUES ($1, $2, $3, 'super_admin', TRUE)`,
    [SUPER_ADMIN_NAME || 'Super Admin', SUPER_ADMIN_EMAIL, hash]
  );

  console.log(`✅ Super admin seeded: ${SUPER_ADMIN_EMAIL}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
