
require("dotenv").config();

const bcrypt = require("bcryptjs");
const pool = require("./db");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Enter your new admin password: ", async (password) => {
  try {
    if (!password || password.length < 12) {
      throw new Error("Password must be at least 12 characters.");
    }

    const email = "admin@campusconnect.com";
    const hash = await bcrypt.hash(password, 12);

    const [result] = await pool.execute(
      `UPDATE users
       SET password_hash = ?
       WHERE email = ? AND role = 'admin'`,
      [hash, email]
    );

    if (result.affectedRows === 0) {
      console.log("Admin account not found.");
    } else {
      console.log("Admin password updated successfully!");
    }
  } catch (error) {
    console.error("Password reset failed:", error.message);
  } finally {
    rl.close();
    await pool.end();
  }
});
