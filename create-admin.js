
require("dotenv").config();

const bcrypt = require("bcryptjs");
const pool = require("./db");

async function createAdmin() {
  try {
    const name = process.env.ADMIN_NAME;
    const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
    const password = process.env.ADMIN_PASSWORD;

    if (!name || !email || !password) {
      throw new Error("ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD are required in .env");
    }

    if (password.length < 12) {
      throw new Error("Admin password must be at least 12 characters.");
    }

    const [existing] = await pool.execute(
      "SELECT user_id FROM users WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      console.log("Admin account already exists.");
      return;
    }

    const hash = await bcrypt.hash(password, 12);

    await pool.execute(
      `INSERT INTO users
       (full_name, email, password_hash, role)
       VALUES (?, ?, ?, 'admin')`,
      [name, email, hash]
    );

    console.log("Admin account created successfully.");
    console.log("Login email:", email);
    console.log("Use the password saved in your .env file.");
  } catch (error) {
    console.error("Admin creation failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

createAdmin();
