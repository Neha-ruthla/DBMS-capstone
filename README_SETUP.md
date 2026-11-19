# CampusConnect — Role-Based Internship Management System

This package keeps the existing CampusConnect website and adds clear role-based portals, server-side permissions and a lighter lavender/white visual theme.

## Role-based access

### Admin portal
- Admin signs in by selecting **Admin** on the login screen.
- Admin can view analytics and manage students, companies, internships, applications and interviews.
- Admin has create, edit and delete access to management records.
- Admin accounts cannot be created through public registration. Create the admin account using the setup script below.

### Student portal
- Student signs in by selecting **Student**.
- Students can view their own profile, explore internships, apply, and track only their own applications.
- Students cannot edit or delete student/company/internship/application records through the management APIs.

### Company portal
- Company signs in by selecting **Company**.
- Companies can post internships for their own company and view applicants for their own opportunities.
- Companies can update application status only for applications connected to their own internships.
- Companies cannot edit/delete student records or manage another company's data.

These permissions are enforced by the Express API as well as the interface. Hiding a button in the browser is not the only protection.

## Requirements
- Node.js 20.19+ (22 LTS recommended)
- npm
- MySQL Server and MySQL Workbench

## 1. Configure environment
1. In the project root, copy `.env.example` and rename the copy to `.env`.
2. Set your MySQL `DB_PASSWORD`, `DB_USER`, `DB_HOST`, `DB_PORT` and `DB_NAME`.
3. Set a long, private random `JWT_SECRET`.
4. Set `ADMIN_NAME`, `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Admin password must be at least 12 characters.
5. Keep `.env` private. Never upload it to GitHub or share it in screenshots.

## 2. Database setup
- Keep your existing `students`, `companies`, `internships`, `applications`, `interviews` and `skills` tables.
- Open `schema_additions.sql` in MySQL Workbench and execute it. It creates the `users` authentication table if it does not exist and does not drop or truncate existing data.
- The database itself is not included in this ZIP.

## 3. Install dependencies
Double-click `INSTALL_DEPENDENCIES.bat`, or run from the project root:

```bash
npm install
cd frontend
npm install
```

## 4. Create the admin account
From the project root, run:

```bash
node create-admin.js
```

Use the admin email and password configured in `.env`. If the admin account already exists, the script reports that it exists; it does not reset the password.

## 5. Start CampusConnect
Double-click `START_CAMPUSCONNECT.bat`. Keep both terminal windows open. Open the Vite URL printed in the frontend terminal (usually `http://localhost:5173`, or 5174/5175 if the port is busy).

## 6. Create accounts and sign in
- Student and Company accounts can be created using **Create account**. Select the matching role first.
- Admin is not a public registration option. Use the admin credentials created in Step 4.
- At login, select the correct role tile before entering credentials. The API checks the account's actual role.

## 7. Test the roles
1. Sign in as Admin. Confirm that the management sidebar, CRUD pages and analytics are available.
2. Log out, register/sign in as Student. Confirm the student portal shows internships, apply action, profile and own application list. No admin edit/delete controls should appear.
3. Log out, register/sign in as Company. Confirm company dashboard can post internships and review applicants for its own opportunities.
4. Try opening an admin management API as Student/Company; it should return `403 Forbidden` (or `401` if not logged in).

## Security notes
- Admin management CRUD routes require a valid admin token.
- Student and Company routes are role-protected and scope data to the logged-in account.
- Public registration accepts only `student` and `company`; it rejects `admin`.
- Do not use `npm audit fix --force` as a quick fix; it can introduce breaking dependency changes.

## Validation
Backend JavaScript syntax and frontend JSX syntax were checked while assembling this package. A live MySQL end-to-end test still needs to be run on your computer with your own database and credentials.

## Latest update: Analytics and Student Portal
- Analytics requests now send the saved admin Bearer token to `/students` and `/application-analytics`, and use `VITE_API_URL` when configured.
- If Analytics reports an expired session, sign out and sign in again using an Admin account.
- The Student Overview has been refreshed with campus photography, visual summary cards, quick links and opportunity highlights. Student permissions and existing API workflows are unchanged.
