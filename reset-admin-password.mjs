/**
 * reset-admin-password.mjs
 * Resets the password for an admin user in the database.
 *
 * Usage:
 *   NEW_PASSWORD=yourNewPassword node reset-admin-password.mjs
 *   NEW_PASSWORD=yourNewPassword ADMIN_EMAIL=you@example.com node reset-admin-password.mjs
 *
 * Run once via Railway shell or locally with DATABASE_URL pointing to production.
 */

import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL;
if (!url) { console.error("❌  DATABASE_URL not set"); process.exit(1); }

const newPassword = process.env.NEW_PASSWORD;
if (!newPassword) { console.error("❌  NEW_PASSWORD not set (e.g. NEW_PASSWORD=secret node reset-admin-password.mjs)"); process.exit(1); }

const adminEmail = process.env.ADMIN_EMAIL;

const conn = await mysql.createConnection(url);

// Show all users so the operator can confirm who will be updated
const [allUsers] = await conn.execute(
  "SELECT id, email, name, role, passwordHash IS NOT NULL AS hasPassword FROM users ORDER BY id"
);
console.log("\n📋  Current users in DB:");
console.table(allUsers);

let targetEmail = adminEmail;
if (!targetEmail) {
  // Default to the first admin user found
  const adminUser = allUsers.find(u => u.role === "admin" || u.role === "owner");
  if (!adminUser || !adminUser.email) {
    console.error("❌  No admin/owner user found. Pass ADMIN_EMAIL=<email> explicitly.");
    await conn.end();
    process.exit(1);
  }
  targetEmail = adminUser.email;
  console.log(`\nℹ️  No ADMIN_EMAIL specified — targeting first admin: ${targetEmail}`);
}

const hash = await bcrypt.hash(newPassword, 12);

const [result] = await conn.execute(
  "UPDATE users SET passwordHash = ?, loginMethod = 'email' WHERE email = ?",
  [hash, targetEmail]
);

if (result.affectedRows === 0) {
  console.error(`❌  No user found with email: ${targetEmail}`);
  await conn.end();
  process.exit(1);
}

console.log(`\n✅  Password reset for ${targetEmail}. You can now log in.`);
await conn.end();
