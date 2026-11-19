# Final evaluation checklist

## Before demonstration
- [ ] MySQL service is running and `SmartInternshipDB` exists.
- [ ] Existing core tables are present: students, companies, internships, applications, interviews, skills.
- [ ] Run `schema_additions.sql` once to create `users` (additive migration; do not drop existing tables).
- [ ] Root `.env` has valid DB credentials, a private JWT_SECRET, and admin credentials.
- [ ] Run `npm install` in root and `npm install` in `frontend`.
- [ ] Run `npm run admin` in root if an Admin account does not already exist.
- [ ] Start backend with `npm start` and frontend with `npm run dev`.
- [ ] Verify `/health`, Admin login, Analytics, Student login, internship application, and MySQL row insertion.

## Important
The project ZIP cannot contain your personal database or credentials. The evaluator environment must have a compatible MySQL database and schema. Exact concurrent-user capacity has not been load-tested. Do not claim a specific user capacity without a load test.
