
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("./db");
const { router: authRouter, authenticateToken, authorizeRoles } = require("./auth.routes");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware and CORS: add deployed frontend URLs to CORS_ALLOWED_ORIGINS.
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
const defaultOrigins = [
  "http://localhost:5173", "http://localhost:5174", "http://localhost:5175",
  "http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://127.0.0.1:5175",
];
const configuredOrigins = (process.env.CORS_ALLOWED_ORIGINS || "")
  .split(",").map((origin) => origin.trim()).filter(Boolean);
const allowedOrigins = new Set([...defaultOrigins, ...configuredOrigins]);
app.use(cors({
  origin(origin, callback) {
    // Requests without Origin include health checks and server-to-server calls.
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by CampusConnect CORS policy."));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// AUTH ROUTES (registration, login and current-user profile)
app.use("/api/auth", authRouter);

// DATABASE TABLE CONFIGURATION
const resources = {
  students: {
    table: "students",
    id: "student_id",
    required: ["name", "email"],
    fields: [
      "name",
      "email",
      "department",
      "cgpa",
      "semester",
      "resume_link",
    ],
  },

  companies: {
    table: "companies",
    id: "company_id",
    required: ["company_name"],
    fields: ["company_name", "industry", "hr_email"],
  },

  internships: {
    table: "internships",
    id: "internship_id",
    required: ["title", "company_id"],
    fields: [
      "company_id",
      "title",
      "duration_months",
      "skills",
      "required_skills",
    ],
  },

  applications: {
    table: "applications",
    id: "application_id",
    required: ["student_id", "internship_id"],
    fields: [
      "student_id",
      "internship_id",
      "application_date",
      "status",
    ],
  },

  interviews: {
    table: "interviews",
    id: "interview_id",
    required: ["application_id"],
    fields: [
      "application_id",
      "interview_date",
      "interview_mode",
      "result",
    ],
  },
};

// GET TABLE COLUMNS
async function getTableColumns(table) {
  const [columns] = await pool.query(
    `SHOW COLUMNS FROM \`${table}\``
  );

  return columns.map((column) => column.Field);
}

// HOME API
app.get("/health", (req, res) => res.status(200).json({ status: "ok", service: "CampusConnect API" }));

app.get("/", (req, res) => {
  res.json({
    message: "CampusConnect API is running successfully!",
    database: "SmartInternshipDB",
  });
});

// DATABASE TEST API
app.get("/test-db", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    const [tables] = await pool.query("SHOW TABLES");

    res.json({
      message: "Database connected successfully!",
      tables,
    });
  } catch (error) {
    console.error("Database test error:", error);

    res.status(500).json({
      error: "Database connection failed",
      details: error.message,
    });
  }
});

// GENERIC GET
async function getRecords(req, res, config) {
  try {
    const [records] = await pool.query(
      `SELECT * FROM \`${config.table}\`
       ORDER BY \`${config.id}\` DESC`
    );

    res.json(records);
  } catch (error) {
    console.error(`GET ${config.table} error:`, error);

    res.status(500).json({
      error: "Unable to fetch records.",
    });
  }
}

// GENERIC GET BY ID
async function getRecordById(req, res, config) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: "Invalid record ID.",
      });
    }

    const [records] = await pool.execute(
      `SELECT * FROM \`${config.table}\`
       WHERE \`${config.id}\` = ?`,
      [id]
    );

    if (records.length === 0) {
      return res.status(404).json({
        error: "Record not found.",
      });
    }

    res.json(records[0]);
  } catch (error) {
    console.error(`GET ${config.table} by ID error:`, error);

    res.status(500).json({
      error: "Unable to fetch record.",
    });
  }
}

// GENERIC POST
async function createRecord(req, res, config) {
  try {
    const body = req.body || {};

    const missingFields = config.required.filter(
      (field) =>
        body[field] === undefined ||
        body[field] === null ||
        String(body[field]).trim() === ""
    );

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: "Required fields are missing.",
        fields: missingFields,
      });
    }

    const actualColumns = await getTableColumns(config.table);

    const fields = config.fields.filter(
      (field) =>
        actualColumns.includes(field) &&
        body[field] !== undefined
    );

    if (fields.length === 0) {
      return res.status(400).json({
        error: "No valid fields were provided.",
      });
    }

    const values = fields.map((field) => body[field]);

    const columnNames = fields
      .map((field) => `\`${field}\``)
      .join(", ");

    const placeholders = fields.map(() => "?").join(", ");

    const sql = `
      INSERT INTO \`${config.table}\` (${columnNames})
      VALUES (${placeholders})
    `;

    const [result] = await pool.execute(sql, values);

    const [newRecord] = await pool.execute(
      `SELECT * FROM \`${config.table}\`
       WHERE \`${config.id}\` = ?`,
      [result.insertId]
    );

    res.status(201).json({
      message: "Record created successfully.",
      record: newRecord[0],
    });
  } catch (error) {
    console.error(`POST ${config.table} error:`, error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: "This record already exists.",
      });
    }

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({
        error: "Related record does not exist.",
      });
    }

    res.status(500).json({
      error: "Unable to create record.",
      details: error.message,
    });
  }
}

// GENERIC PUT
async function updateRecord(req, res, config) {
  try {
    const id = Number(req.params.id);
    const body = req.body || {};

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: "Invalid record ID.",
      });
    }

    const actualColumns = await getTableColumns(config.table);

    const fields = config.fields.filter(
      (field) =>
        actualColumns.includes(field) &&
        body[field] !== undefined
    );

    if (fields.length === 0) {
      return res.status(400).json({
        error: "No valid fields provided for updating.",
      });
    }

    const values = fields.map((field) => body[field]);

    const assignments = fields
      .map((field) => `\`${field}\` = ?`)
      .join(", ");

    const [result] = await pool.execute(
      `UPDATE \`${config.table}\`
       SET ${assignments}
       WHERE \`${config.id}\` = ?`,
      [...values, id]
    );

    if (result.affectedRows === 0) {
      const [existing] = await pool.execute(
        `SELECT * FROM \`${config.table}\`
         WHERE \`${config.id}\` = ?`,
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          error: "Record not found.",
        });
      }
    }

    const [updatedRecord] = await pool.execute(
      `SELECT * FROM \`${config.table}\`
       WHERE \`${config.id}\` = ?`,
      [id]
    );

    res.json({
      message: "Record updated successfully.",
      record: updatedRecord[0],
    });
  } catch (error) {
    console.error(`PUT ${config.table} error:`, error);

    res.status(500).json({
      error: "Unable to update record.",
      details: error.message,
    });
  }
}

// GENERIC DELETE
async function deleteRecord(req, res, config) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: "Invalid record ID.",
      });
    }

    const [result] = await pool.execute(
      `DELETE FROM \`${config.table}\`
       WHERE \`${config.id}\` = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: "Record not found.",
      });
    }

    res.json({
      message: "Record deleted successfully.",
    });
  } catch (error) {
    console.error(`DELETE ${config.table} error:`, error);

    if (
      error.code === "ER_ROW_IS_REFERENCED_2" ||
      error.code === "ER_ROW_IS_REFERENCED"
    ) {
      return res.status(409).json({
        error: "This record is linked to other records.",
      });
    }

    res.status(500).json({
      error: "Unable to delete record.",
      details: error.message,
    });
  }
}

// REGISTER CRUD ROUTES
Object.values(resources).forEach((config) => {
  const path = `/${config.table}`;

  app.get(path, authenticateToken, authorizeRoles("admin"), (req, res) =>
    getRecords(req, res, config)
  );

  app.get(`${path}/:id`, authenticateToken, authorizeRoles("admin"), (req, res) =>
    getRecordById(req, res, config)
  );

  app.post(path, authenticateToken, authorizeRoles("admin"), (req, res) =>
    createRecord(req, res, config)
  );

  app.put(`${path}/:id`, authenticateToken, authorizeRoles("admin"), (req, res) =>
    updateRecord(req, res, config)
  );

  app.delete(`${path}/:id`, authenticateToken, authorizeRoles("admin"), (req, res) =>
    deleteRecord(req, res, config)
  );
});

// SKILLS API
app.get("/skills", authenticateToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const [records] = await pool.query(
      "SELECT * FROM skills ORDER BY skill_id DESC"
    );

    res.json(records);
  } catch (error) {
    console.error("GET skills error:", error);

    res.status(500).json({
      error: "Unable to fetch skills.",
    });
  }
});

// INTERNSHIPS WITH COMPANY NAMES
app.get("/internships-with-companies", authenticateToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const [records] = await pool.query(`
      SELECT i.*, c.company_name
      FROM internships i
      LEFT JOIN companies c
        ON i.company_id = c.company_id
      ORDER BY i.internship_id DESC
    `);

    res.json(records);
  } catch (error) {
    console.error("Internship join error:", error);

    res.status(500).json({
      error: "Unable to fetch internships with company details.",
    });
  }
});

// APPLICATION ANALYTICS
app.get("/application-analytics", authenticateToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const [totalResult] = await pool.query(`
      SELECT COUNT(*) AS totalApplications
      FROM applications
    `);

    const [statusResult] = await pool.query(`
      SELECT status, COUNT(*) AS totalApplications
      FROM applications
      GROUP BY status
      ORDER BY status
    `);

    const [monthlyResult] = await pool.query(`
      SELECT
        DATE_FORMAT(application_date, '%Y-%m') AS month,
        COUNT(*) AS totalApplications
      FROM applications
      WHERE application_date IS NOT NULL
      GROUP BY DATE_FORMAT(application_date, '%Y-%m')
      ORDER BY month ASC
    `);

    res.json({
      totalApplications: Number(totalResult[0].totalApplications),

      statusCounts: statusResult.map((item) => ({
        status: item.status || "Unknown",
        totalApplications: Number(item.totalApplications),
      })),

      monthlyApplications: monthlyResult.map((item) => ({
        month: item.month,
        totalApplications: Number(item.totalApplications),
      })),
    });
  } catch (error) {
    console.error("Application analytics error:", error);

    res.status(500).json({
      error: "Unable to fetch application analytics.",
      details: error.message,
    });
  }
});

// STUDENT PORTAL: current student's profile, internships and applications
app.get("/api/student/dashboard", authenticateToken, authorizeRoles("student"), async (req, res) => {
  try {
    const [users] = await pool.execute(
      "SELECT student_id FROM users WHERE user_id = ? AND role = 'student' AND is_active = TRUE",
      [req.user.user_id]
    );
    if (!users.length || !users[0].student_id) return res.status(404).json({ error: "Student profile is not linked to this account." });
    const studentId = users[0].student_id;
    const [profileRows] = await pool.execute("SELECT * FROM students WHERE student_id = ?", [studentId]);
    const [internshipRows] = await pool.query(`
      SELECT i.*, c.company_name
      FROM internships i LEFT JOIN companies c ON c.company_id = i.company_id
      ORDER BY i.internship_id DESC
    `);
    const [applicationRows] = await pool.execute(`
      SELECT a.*, i.title AS internship_title, c.company_name
      FROM applications a
      LEFT JOIN internships i ON i.internship_id = a.internship_id
      LEFT JOIN companies c ON c.company_id = i.company_id
      WHERE a.student_id = ? ORDER BY a.application_id DESC
    `, [studentId]);
    res.json({ profile: profileRows[0], internships: internshipRows, applications: applicationRows });
  } catch (error) {
    console.error("Student dashboard error:", error);
    res.status(500).json({ error: "Unable to load student dashboard." });
  }
});

app.post("/api/student/applications", authenticateToken, authorizeRoles("student"), async (req, res) => {
  try {
    const internshipId = Number(req.body?.internship_id);
    if (!Number.isInteger(internshipId) || internshipId < 1) return res.status(400).json({ error: "Select a valid internship." });
    const [users] = await pool.execute("SELECT student_id FROM users WHERE user_id = ? AND role = 'student' AND is_active = TRUE", [req.user.user_id]);
    if (!users.length || !users[0].student_id) return res.status(404).json({ error: "Student profile not found." });
    const studentId = users[0].student_id;
    const [internshipsFound] = await pool.execute("SELECT internship_id FROM internships WHERE internship_id = ?", [internshipId]);
    if (!internshipsFound.length) return res.status(404).json({ error: "Internship not found." });
    const [existing] = await pool.execute("SELECT application_id FROM applications WHERE student_id = ? AND internship_id = ?", [studentId, internshipId]);
    if (existing.length) return res.status(409).json({ error: "You have already applied for this internship." });
    const [result] = await pool.execute(
      "INSERT INTO applications (student_id, internship_id, application_date, status) VALUES (?, ?, CURDATE(), 'Pending')",
      [studentId, internshipId]
    );
    res.status(201).json({ message: "Application submitted successfully.", application_id: result.insertId });
  } catch (error) {
    console.error("Student application error:", error);
    res.status(500).json({ error: "Unable to submit application." });
  }
});

// COMPANY PORTAL: internships owned by the logged-in company and their applicants
app.get("/api/company/dashboard", authenticateToken, authorizeRoles("company"), async (req, res) => {
  try {
    const [users] = await pool.execute("SELECT company_id FROM users WHERE user_id = ? AND role = 'company' AND is_active = TRUE", [req.user.user_id]);
    if (!users.length || !users[0].company_id) return res.status(404).json({ error: "Company profile is not linked to this account." });
    const companyId = users[0].company_id;
    const [internships] = await pool.execute("SELECT * FROM internships WHERE company_id = ? ORDER BY internship_id DESC", [companyId]);
    const [applicants] = await pool.execute(`
      SELECT a.application_id, a.application_date, a.status, s.student_id, s.name, s.email, s.department, s.cgpa,
             i.title AS internship_title
      FROM applications a
      JOIN students s ON s.student_id = a.student_id
      JOIN internships i ON i.internship_id = a.internship_id
      WHERE i.company_id = ? ORDER BY a.application_id DESC
    `, [companyId]);
    res.json({ internships, applicants });
  } catch (error) {
    console.error("Company dashboard error:", error);
    res.status(500).json({ error: "Unable to load company dashboard." });
  }
});

app.post("/api/company/internships", authenticateToken, authorizeRoles("company"), async (req, res) => {
  try {
    const title = String(req.body?.title || "").trim();
    if (!title) return res.status(400).json({ error: "Internship title is required." });
    const [users] = await pool.execute("SELECT company_id FROM users WHERE user_id = ? AND role = 'company' AND is_active = TRUE", [req.user.user_id]);
    if (!users.length || !users[0].company_id) return res.status(404).json({ error: "Company profile not found." });
    const [result] = await pool.execute(
      "INSERT INTO internships (company_id, title, duration_months, skills, required_skills) VALUES (?, ?, ?, ?, ?)",
      [users[0].company_id, title, req.body.duration_months ? Number(req.body.duration_months) : null, req.body.skills || null, req.body.required_skills || null]
    );
    res.status(201).json({ message: "Internship posted successfully.", internship_id: result.insertId });
  } catch (error) {
    console.error("Post internship error:", error);
    res.status(500).json({ error: "Unable to post internship." });
  }
});

app.patch("/api/company/applications/:id", authenticateToken, authorizeRoles("company"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const status = String(req.body?.status || "");
    if (!Number.isInteger(id) || id < 1 || !["Pending", "Shortlisted", "Selected", "Rejected"].includes(status)) return res.status(400).json({ error: "Invalid application or status." });
    const [users] = await pool.execute("SELECT company_id FROM users WHERE user_id = ? AND role = 'company' AND is_active = TRUE", [req.user.user_id]);
    if (!users.length || !users[0].company_id) return res.status(404).json({ error: "Company profile not found." });
    const [result] = await pool.execute(`
      UPDATE applications a JOIN internships i ON i.internship_id = a.internship_id
      SET a.status = ? WHERE a.application_id = ? AND i.company_id = ?
    `, [status, id, users[0].company_id]);
    if (!result.affectedRows) return res.status(404).json({ error: "Application not found for this company." });
    res.json({ message: "Application status updated." });
  } catch (error) {
    console.error("Application status update error:", error);
    res.status(500).json({ error: "Unable to update application status." });
  }
});

// UNKNOWN ROUTE — ALWAYS KEEP AT THE END
app.use((req, res) => {
  res.status(404).json({
    error: "API endpoint not found.",
    path: req.originalUrl,
  });
});

// GLOBAL ERROR HANDLER
app.use((error, req, res, next) => {
  console.error("Unexpected server error:", error);

  res.status(500).json({
    error: "Internal server error.",
  });
});

// START SERVER
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`CampusConnect API listening on port ${PORT}`);
});

// Graceful shutdown helps hosted platforms close database connections cleanly.
async function shutdown(signal) {
  console.log(`${signal} received. Shutting down CampusConnect...`);
  server.close(async () => {
    try { await pool.end(); } catch (error) { console.error("Database pool shutdown error:", error.message); }
    process.exit(0);
  });
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
