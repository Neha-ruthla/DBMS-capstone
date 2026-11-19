-- CampusConnect authentication table.
-- Additive only: this script does NOT drop, truncate, or reset existing tables/data.
USE SmartInternshipDB;

CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'student', 'company') NOT NULL DEFAULT 'student',
    student_id INT NULL UNIQUE,
    company_id INT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_student FOREIGN KEY (student_id)
      REFERENCES students(student_id) ON DELETE SET NULL,
    CONSTRAINT fk_user_company FOREIGN KEY (company_id)
      REFERENCES companies(company_id) ON DELETE SET NULL
);
