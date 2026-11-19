
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("./db");

const router = express.Router();

function createToken(user) {
  return jwt.sign(
    {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
}

// REGISTER: Student or Company only
router.post("/register", async (req, res) => {
  let connection;

  try {
    const {
      full_name,
      email,
      password,
      role,
      department,
      cgpa,
      semester,
      company_name,
      industry,
    } = req.body;

    if (!full_name || !email || !password || !role) {
      return res.status(400).json({
        error: "Name, email, password and role are required.",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
  return res.status(400).json({
    error: "Enter a valid email address.",
  });
}
    if (String(password).length < 8) {
      return res.status(400).json({
        error: "Password must contain at least 8 characters.",
      });
    }

    if (!["student", "company"].includes(role)) {
      return res.status(400).json({
        error: "Public registration is available for students and companies only.",
      });
    }

    if (role === "company" && !company_name) {
      return res.status(400).json({
        error: "Company name is required.",
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [existingUsers] = await connection.execute(
      "SELECT user_id FROM users WHERE email = ?",
      [normalizedEmail]
    );

    if (existingUsers.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        error: "An account with this email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    let studentId = null;
    let companyId = null;

    if (role === "student") {
      // Link an existing student record if the email already exists.
      const [existingStudents] = await connection.execute(
        "SELECT student_id FROM students WHERE email = ?",
        [normalizedEmail]
      );

      if (existingStudents.length > 0) {
        studentId = existingStudents[0].student_id;
      } else {
        const [studentResult] = await connection.execute(
          `INSERT INTO students
           (name, email, department, cgpa, semester)
           VALUES (?, ?, ?, ?, ?)`,
          [
            full_name.trim(),
            normalizedEmail,
            department || null,
            cgpa === "" || cgpa === undefined ? null : Number(cgpa),
            semester === "" || semester === undefined ? null : Number(semester),
          ]
        );

        studentId = studentResult.insertId;
      }
    }

    if (role === "company") {
      // Link an existing company record if its HR email matches.
      const [existingCompanies] = await connection.execute(
        "SELECT company_id FROM companies WHERE hr_email = ?",
        [normalizedEmail]
      );

      if (existingCompanies.length > 0) {
        companyId = existingCompanies[0].company_id;
      } else {
        const [companyResult] = await connection.execute(
          `INSERT INTO companies (company_name, industry, hr_email)
           VALUES (?, ?, ?)`,
          [company_name.trim(), industry || null, normalizedEmail]
        );

        companyId = companyResult.insertId;
      }
    }

    const [userResult] = await connection.execute(
      `INSERT INTO users
       (full_name, email, password_hash, role, student_id, company_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        full_name.trim(),
        normalizedEmail,
        passwordHash,
        role,
        studentId,
        companyId,
      ]
    );

    await connection.commit();

    const user = {
      user_id: userResult.insertId,
      full_name: full_name.trim(),
      email: normalizedEmail,
      role,
      student_id: studentId,
      company_id: companyId,
    };

    const token = createToken(user);

    return res.status(201).json({
      message: "Registration successful.",
      token,
      user,
    });
  } catch (error) {
    if (connection) await connection.rollback();

    console.error("Registration error:", error);

    return res.status(500).json({
      error: "Registration failed.",
      details: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
});

// LOGIN: Admin, Student or Company
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required.",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const [users] = await pool.execute(
      `SELECT user_id, full_name, email, password_hash,
              role, student_id, company_id, is_active
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [normalizedEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({
        error: "Invalid email or password.",
      });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(403).json({
        error: "This account is inactive. Contact the administrator.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        error: "Invalid email or password.",
      });
    }

    const safeUser = {
      user_id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      student_id: user.student_id,
      company_id: user.company_id,
    };

    const token = createToken(safeUser);

    return res.json({
      message: "Login successful.",
      token,
      user: safeUser,
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      error: "Login failed.",
    });
  }
});

// AUTHENTICATION MIDDLEWARE
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      error: "Authentication required. Please log in.",
    });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({
      error: "Invalid or expired token. Please log in again.",
    });
  }
}

// ROLE AUTHORIZATION MIDDLEWARE
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "You do not have permission to access this resource.",
      });
    }

    next();
  };
}

// GET CURRENT LOGGED-IN USER
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.execute(
      `SELECT user_id, full_name, email, role, student_id, company_id
       FROM users
       WHERE user_id = ? AND is_active = TRUE`,
      [req.user.user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "User account not found." });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({ error: "Unable to fetch user profile." });
  }
});

module.exports = {
  router,
  authenticateToken,
  authorizeRoles,
};
