# CampusConnect — Smart Internship Management System

CampusConnect is a role-based web application for managing campus internship opportunities, student applications and interviews. It provides an Admin workspace and a Student portal, with a Company API/portal workflow retained in the backend.

> Academic project note: this repository has been syntax-checked and the frontend production build should be run locally before evaluation. A successful build does not prove production database capacity or concurrent-user performance; those require deployment-specific tests.

## Features

### Admin
- Dashboard overview and analytics for students and applications
- Create, view, update and delete student, company, internship, application and interview records
- Calendar, reports, notifications, profile, help and support workspace pages
- Protected management APIs requiring an Admin bearer token

### Student
- Student registration and login
- Internship discovery and application submission
- Personal application tracking and profile view
- Saved internships stored in that browser's local storage
- Student-specific data access enforced by backend routes

### Company API workflow
- Company registration and login supported by the backend
- Company-scoped internship creation and applicant/application management endpoints
- A public company login option may not be exposed in the current UI build; do not present it as a visible UI feature unless you enable it.

### Technical highlights
- React + Vite frontend
- Node.js + Express REST API
- MySQL with `mysql2` connection pooling
- Password hashing with bcryptjs and JWT authentication
- Role-based API authorization, parameterized SQL queries and input checks
- Configurable CORS for local and deployed frontend origins
- Health endpoint at `/health`

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Recharts |
| Backend | Node.js, Express |
| Database | MySQL |
| Database driver | mysql2/promise |
| Authentication | JSON Web Token, bcryptjs |
| Configuration | dotenv |

## Project structure

```text
CampusConnect/
├── server.js                 # Express app, REST endpoints, CORS and health check
├── auth.routes.js            # Registration, login, JWT authentication
├── db.js                     # MySQL connection pool
├── create-admin.js           # Creates the initial Admin account
├── reset-admin-password.js  # Admin password reset utility
├── schema_additions.sql      # Additive users-table migration
├── package.json
├── .env.example
├── .gitignore
├── README.md
├── README_SETUP.md
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── App.css
        ├── Analytics.jsx
        ├── Analytics.css
        ├── index.css
        └── assets/
```

## Requirements

- Node.js 20.19+ (Node 22 LTS recommended)
- npm
- MySQL 8.x (or a compatible MySQL server)
- MySQL Workbench is optional but useful for running the SQL migration

## Local installation

### 1. Get the source

Download the ZIP or clone the GitHub repository, then open a terminal in the `CampusConnect` root folder (the folder containing `server.js`).

### 2. Install backend dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env` in the project root. On Windows CMD:

```bat
copy .env.example .env
```

Edit `.env` and set your real MySQL credentials, a private JWT secret, and an admin password of at least 12 characters. Never commit `.env` to GitHub.

### 4. Prepare the database

Create a MySQL database named `SmartInternshipDB`. The project expects the existing core tables:

- `students`
- `companies`
- `internships`
- `applications`
- `interviews`
- `skills`

The exact columns used by the application are visible in `server.js` and the existing database schema. Preserve your existing data. Then run `schema_additions.sql` in MySQL Workbench to add the `users` authentication table. This migration references `students(student_id)` and `companies(company_id)`, so those tables must exist first.

### 5. Create the Admin account

```bash
npm run admin
```

The script reads `ADMIN_NAME`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env`. If the email already exists, it does not overwrite the existing account.

### 6. Install frontend dependencies

```bash
cd frontend
npm install
```

### 7. Configure the frontend API URL

For local development, no extra file is needed; the frontend defaults to `http://localhost:3000`.

For a deployed backend, create `frontend/.env` containing:

```env
VITE_API_URL=https://YOUR-BACKEND-HOST
```

Do not add a trailing slash. Vite environment variables are embedded at build time, so rebuild/redeploy the frontend after changing this value.

### 8. Run the application

Terminal 1, project root:

```bash
npm start
```

Terminal 2, `frontend` folder:

```bash
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

## Demo checklist

1. Open `http://localhost:3000/health`; expect `{ "status": "ok", ... }`.
2. Open `http://localhost:3000/test-db`; expect a successful database connection and table list. This endpoint is diagnostic and should be access-restricted or disabled for a public production deployment.
3. Sign in using the Admin account created above.
4. Check Analytics and each Admin CRUD page.
5. Register a Student account; explore an internship, apply, and view My Applications.
6. Confirm that a Student cannot access Admin-only APIs (expected HTTP 403).
7. Verify that the new application row appears in MySQL Workbench.

## Deployment outline

### Backend (Render / Railway / similar)

- Create a web service from the repository and set its root directory to the repository root.
- Build command: `npm install`
- Start command: `npm start`
- Add the backend environment variables from `.env.example` in the host dashboard.
- Use a reachable managed MySQL database. Set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`; set `DB_SSL=true` only if the provider requires TLS and provides a valid CA configuration.
- Set `CORS_ALLOWED_ORIGINS` to the exact deployed frontend origin, e.g. `https://your-app.vercel.app` (no trailing slash).
- Create the Admin account using the host's shell/console with `npm run admin`, after the database schema is ready.
- Verify `https://YOUR-BACKEND-HOST/health`.

### Frontend (Vercel)

- Import the same GitHub repository into Vercel.
- Set Root Directory to `frontend`.
- Framework preset: Vite.
- Build command: `npm run build`.
- Output directory: `dist`.
- Add environment variable `VITE_API_URL=https://YOUR-BACKEND-HOST`.
- Deploy, then add the final Vercel domain to backend `CORS_ALLOWED_ORIGINS` and redeploy/restart the backend if needed.

## Security and known limitations

- Keep `.env`, database passwords, JWT secrets and admin credentials private. Do not commit them or paste them into chat/screenshots.
- The `/test-db` diagnostic endpoint reveals table names; remove or protect it before public production use.
- Saved internships currently use browser local storage and are not synchronized across devices.
- The current UI has student and admin sign-in choices; company workflows exist in backend routes but the company UI is not exposed in this build.
- Exact maximum users and concurrent-user capacity have not been load-tested. Capacity depends on the selected hosting plan, database resources, schema/indexes and traffic patterns.
- Use HTTPS in production. Rotate any credential that has previously been exposed.

## Troubleshooting

- **Unable to fetch data:** verify backend `/health`, database credentials, `VITE_API_URL`, CORS origin and active login token.
- **Access denied for MySQL:** verify DB username/password and remote database access permissions.
- **CORS error:** set `CORS_ALLOWED_ORIGINS` to the exact frontend origin, then restart backend.
- **Analytics says session expired:** sign out and sign in again as Admin.
- **Build fails:** run `npm install` in `frontend`, then `npm run build`; use Node 20.19+ or Node 22 LTS.

## License

Academic project. Add an appropriate license before redistributing publicly.
