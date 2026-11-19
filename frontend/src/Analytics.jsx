import "./Analytics.css";
import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function fetchAdminData(path) {
  const token = localStorage.getItem("campusconnect_token");
  if (!token) throw new Error("Your admin session has expired. Please sign in again.");
  const response = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || body.message || `Request failed (${response.status})`);
  return body;
}
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = ["#9B7BFF", "#35D6E8", "#FFB86B", "#FF729F", "#72D6A0"];

function Analytics() {
  const [students, setStudents] = useState([]);
  const [applicationAnalytics, setApplicationAnalytics] = useState(null);

  const [loading, setLoading] = useState(true);
  const [applicationLoading, setApplicationLoading] = useState(true);

  const [error, setError] = useState("");
  const [applicationError, setApplicationError] = useState("");

  useEffect(() => {
    fetchAdminData("/students")
      .then((data) => {
        setStudents(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Fetch application analytics
  useEffect(() => {
    fetchAdminData("/application-analytics")
      .then((data) => {
        setApplicationAnalytics(data);
      })
      .catch((err) => {
        setApplicationError(err.message);
      })
      .finally(() => {
        setApplicationLoading(false);
      });
  }, []);

  // Student analytics
  const departmentData = Object.values(
    students.reduce((result, student) => {
      const department = student.department || "Other";

      if (!result[department]) {
        result[department] = { department, students: 0 };
      }

      result[department].students += 1;
      return result;
    }, {})
  );

  const semesterData = Object.values(
    students.reduce((result, student) => {
      const semester = `Semester ${student.semester || "Unknown"}`;

      if (!result[semester]) {
        result[semester] = { name: semester, value: 0 };
      }

      result[semester].value += 1;
      return result;
    }, {})
  );

  const cgpaData = students.map((student, index) => ({
    name: student.name || `Student ${index + 1}`,
    cgpa: Number(student.cgpa) || 0,
  }));

  // Application analytics
  const statusData = applicationAnalytics?.statusCounts || [];
  const monthlyData = (applicationAnalytics?.monthlyApplications || []).map(
    (item) => {
      const [year, month] = (item.month || "").split("-");
      const date = new Date(Number(year), Number(month) - 1);

      return {
        month: item.month
          ? date.toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            })
          : "Unknown",
        totalApplications: item.totalApplications,
      };
    }
  );

  if (loading) {
    return <div className="analytics-message">Loading analytics...</div>;
  }

  if (error) {
    return (
      <div className="analytics-message">
        <h3>Unable to load analytics</h3>
        <p>{error}</p>
        <p>Check that the backend and MySQL are running, then sign in again with an Admin account.</p>
      </div>
    );
  }

  return (
    <section className="analytics-page">
      <div className="analytics-heading">
        <div>
          <p className="analytics-eyebrow">DATA INSIGHTS</p>
          <h2>Analytics Overview</h2>
          <p>Insights generated from your student and application database.</p>
        </div>

        <div className="analytics-total">
          <span>Total Students</span>
          <strong>{students.length}</strong>
        </div>
      </div>

      {/* APPLICATION SUMMARY */}
      <div className="analytics-grid">
        <div className="analytics-card">
          <h3>Total Applications</h3>
          <p>All internship applications</p>

          <div className="analytics-total">
            <strong>
              {applicationLoading
                ? "..."
                : applicationError
                ? "--"
                : applicationAnalytics?.totalApplications ?? 0}
            </strong>
          </div>

          {applicationError && (
            <p className="analytics-empty">{applicationError}</p>
          )}
        </div>

        <div className="analytics-card">
          <h3>Application Status</h3>
          <p>Applications grouped by status</p>

          {applicationLoading ? (
            <p className="analytics-empty">Loading application data...</p>
          ) : applicationError ? (
            <p className="analytics-empty">{applicationError}</p>
          ) : statusData.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="totalApplications"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {statusData.map((entry, index) => (
                    <Cell
                      key={entry.status}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="analytics-empty">No application data available.</p>
          )}
        </div>

        <div className="analytics-card analytics-wide">
          <h3>Monthly Applications</h3>
          <p>Number of applications received each month</p>

          {applicationLoading ? (
            <p className="analytics-empty">Loading application data...</p>
          ) : applicationError ? (
            <p className="analytics-empty">{applicationError}</p>
          ) : monthlyData.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#34344A" />
                <XAxis dataKey="month" stroke="#A5A5B8" />
                <YAxis allowDecimals={false} stroke="#A5A5B8" />
                <Tooltip />
                <Bar
                  dataKey="totalApplications"
                  name="Applications"
                  fill="#35D6E8"
                  radius={[7, 7, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="analytics-empty">No monthly data available.</p>
          )}
        </div>

        {/* EXISTING STUDENT ANALYTICS */}
        <div className="analytics-card">
          <h3>Students by Department</h3>
          <p>Department-wise student distribution</p>

          {departmentData.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={departmentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#34344A" />
                <XAxis dataKey="department" stroke="#A5A5B8" />
                <YAxis allowDecimals={false} stroke="#A5A5B8" />
                <Tooltip />
                <Bar
                  dataKey="students"
                  fill="#9B7BFF"
                  radius={[7, 7, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="analytics-empty">No department data available.</p>
          )}
        </div>

        <div className="analytics-card">
          <h3>Semester Distribution</h3>
          <p>Students across semesters</p>

          {semesterData.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={semesterData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {semesterData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="analytics-empty">No semester data available.</p>
          )}
        </div>

        <div className="analytics-card analytics-wide">
          <h3>Student CGPA Comparison</h3>
          <p>CGPA of students in your database</p>

          {cgpaData.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={cgpaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#34344A" />
                <XAxis dataKey="name" stroke="#A5A5B8" />
                <YAxis domain={[0, 10]} stroke="#A5A5B8" />
                <Tooltip />
                <Bar
                  dataKey="cgpa"
                  fill="#35D6E8"
                  radius={[7, 7, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="analytics-empty">No CGPA data available.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export default Analytics;

