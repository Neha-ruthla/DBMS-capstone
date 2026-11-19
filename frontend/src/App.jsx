
import { useEffect, useMemo, useState } from "react";
import "./App.css";
import Analytics from "./Analytics";
import campusCollaboration from "./assets/campus-collaboration.webp";
import campusStudents from "./assets/campus-students.webp";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

const navigation = [
  { name: "Overview", icon: "◈" },
  { name: "Analytics", icon: "▥" },
  { name: "Students", icon: "♙" },
  { name: "Companies", icon: "▣" },
  { name: "Internships", icon: "✧" },
  { name: "Applications", icon: "▤" },
  { name: "Interviews", icon: "◷" },
  { name: "Explore Internships", icon: "⌕" },
  { name: "Saved Internships", icon: "♡" },
  { name: "Calendar", icon: "▦" },
  { name: "Notifications", icon: "♧" },
  { name: "Reports & Insights", icon: "▤" },
  { name: "My Profile", icon: "♙" },
  { name: "Help Center", icon: "?" },
  { name: "About CampusConnect", icon: "✦" },
  { name: "Contact Support", icon: "✉" },
];

const modules = {
  Students: {
    endpoint: "students",
    id: "student_id",
    fields: [
      { key: "name", label: "Student Name", required: true },
      { key: "email", label: "Email", type: "email" },
      { key: "department", label: "Department" },
      { key: "cgpa", label: "CGPA", type: "number" },
      { key: "semester", label: "Semester", type: "number" },
      { key: "resume_link", label: "Resume Link" },
    ],
  },
  Companies: {
    endpoint: "companies",
    id: "company_id",
    fields: [
      { key: "company_name", label: "Company Name", required: true },
      { key: "industry", label: "Industry" },
      { key: "hr_email", label: "HR Email", type: "email" },
    ],
  },
  Internships: {
    endpoint: "internships",
    id: "internship_id",
    fields: [
      { key: "company_id", label: "Company ID", type: "number" },
      { key: "title", label: "Internship Title", required: true },
      { key: "duration_months", label: "Duration (Months)", type: "number" },
      { key: "skills", label: "Skills" },
      { key: "required_skills", label: "Required Skills" },
    ],
  },
  Applications: {
    endpoint: "applications",
    id: "application_id",
    fields: [
      { key: "student_id", label: "Student ID", type: "number" },
      { key: "internship_id", label: "Internship ID", type: "number" },
      { key: "application_date", label: "Application Date", type: "date" },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: ["Pending", "Selected", "Rejected", "Shortlisted"],
      },
    ],
  },
  Interviews: {
    endpoint: "interviews",
    id: "interview_id",
    fields: [
      { key: "application_id", label: "Application ID", type: "number" },
      { key: "interview_date", label: "Interview Date", type: "date" },
      {
        key: "interview_mode",
        label: "Interview Mode",
        type: "select",
        options: ["Online", "Offline"],
      },
      {
        key: "result",
        label: "Result",
        type: "select",
        options: ["Pending", "Selected", "Rejected"],
      },
    ],
  },
};

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(localStorage.getItem("campusconnect_token")
        ? {
            Authorization: `Bearer ${localStorage.getItem(
              "campusconnect_token"
            )}`,
          }
        : {}),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(
      data?.error || data?.message || `Request failed (${response.status})`
    );
  }

  return data;
}

function DataModule({
  page,
  records,
  onRefresh,
  students,
  companies,
  internships,
  applications,
}) {
  const config = modules[page];

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const filteredRecords = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) return records;

    return records.filter((record) =>
      Object.values(record).some((value) =>
        String(value ?? "").toLowerCase().includes(query)
      )
    );
  }, [records, search]);

  function openAddForm() {
    setEditingId(null);
    setFormData({});
    setError("");
    setMessage("");
    setShowForm(true);
  }

  function openEditForm(record) {
    setEditingId(record[config.id]);
    setFormData({ ...record });
    setError("");
    setMessage("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setFormData({});
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const payload = {};

    config.fields.forEach((field) => {
      const value = formData[field.key];

      if (value !== undefined && value !== "") {
        payload[field.key] =
          field.type === "number" ? Number(value) : value;
      } else {
        payload[field.key] = null;
      }
    });

    try {
      if (editingId !== null) {
        await apiRequest(
          `${API}/${config.endpoint}/${editingId}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );

        setMessage("Record updated successfully.");
      } else {
        await apiRequest(`${API}/${config.endpoint}`, {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setMessage("Record added successfully.");
      }

      closeForm();
      await onRefresh();
    } catch (err) {
      setError(err.message || "Unable to save record.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(record) {
    const id = record[config.id];

    if (
      !window.confirm(
        `Are you sure you want to delete this ${page} record?`
      )
    ) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await apiRequest(`${API}/${config.endpoint}/${id}`, {
        method: "DELETE",
      });

      setMessage("Record deleted successfully.");
      await onRefresh();
    } catch (err) {
      setError(err.message || "Unable to delete record.");
    }
  }

  function getRelatedOptions(field) {
    if (page === "Internships" && field.key === "company_id") {
      return companies.map((item) => ({
        id: item.company_id,
        label: item.company_name || `Company ${item.company_id}`,
      }));
    }

    if (page === "Applications" && field.key === "student_id") {
      return students.map((item) => ({
        id: item.student_id,
        label: item.name || `Student ${item.student_id}`,
      }));
    }

    if (page === "Applications" && field.key === "internship_id") {
      return internships.map((item) => ({
        id: item.internship_id,
        label: item.title || `Internship ${item.internship_id}`,
      }));
    }

    if (page === "Interviews" && field.key === "application_id") {
      return applications.map((item) => ({
        id: item.application_id,
        label: `Application #${item.application_id} · Student #${item.student_id}`,
      }));
    }

    return null;
  }

  return (
    <section className="records-page">
      <div className="records-banner">
        <span className="eyebrow">CAMPUSCONNECT WORKSPACE</span>
        <h1>
          {page} <span>Management</span>
        </h1>
        <p>Manage and maintain your {page.toLowerCase()} records.</p>
      </div>

      <div className="records-panel">
        <div className="panel-heading">
          <div>
            <h2>All {page}</h2>
            <p>{records.length} records in database</p>
          </div>

          <div style={styles.toolbar}>
            <input
              className="search-input"
              type="search"
              placeholder={`Search ${page.toLowerCase()}...`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <button className="primary-btn" onClick={openAddForm}>
              + Add New
            </button>
          </div>
        </div>

        {message && <p style={styles.success}>{message}</p>}
        {error && <p className="error-message">{error}</p>}

        {showForm && (
          <form onSubmit={handleSubmit} style={styles.form}>
            <h3>
              {editingId !== null ? "Edit Record" : `Add ${page}`}
            </h3>

            <div style={styles.formGrid}>
              {config.fields.map((field) => {
                const relatedOptions = getRelatedOptions(field);

                return (
                  <label key={field.key} style={styles.field}>
                    <span>
                      {field.label}
                      {field.required ? " *" : ""}
                    </span>

                    {relatedOptions ? (
                      <select
                        value={formData[field.key] ?? ""}
                        required={field.required}
                        onChange={(event) =>
                          setFormData({
                            ...formData,
                            [field.key]: event.target.value,
                          })
                        }
                        style={styles.input}
                      >
                        <option value="">Select {field.label}</option>
                        {relatedOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label} (ID: {option.id})
                          </option>
                        ))}
                      </select>
                    ) : field.type === "select" ? (
                      <select
                        value={formData[field.key] ?? ""}
                        required={field.required}
                        onChange={(event) =>
                          setFormData({
                            ...formData,
                            [field.key]: event.target.value,
                          })
                        }
                        style={styles.input}
                      >
                        <option value="">Select {field.label}</option>
                        {field.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type || "text"}
                        required={field.required}
                        step={field.type === "number" ? "any" : undefined}
                        value={formData[field.key] ?? ""}
                        onChange={(event) =>
                          setFormData({
                            ...formData,
                            [field.key]: event.target.value,
                          })
                        }
                        style={styles.input}
                      />
                    )}
                  </label>
                );
              })}
            </div>

            <div style={styles.formActions}>
              <button
                type="submit"
                className="primary-btn"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId !== null
                  ? "Update Record"
                  : "Save Record"}
              </button>

              <button
                type="button"
                className="text-btn"
                onClick={closeForm}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {filteredRecords.length === 0 ? (
          <p className="empty-state">
            {records.length === 0
              ? `No ${page.toLowerCase()} records found.`
              : "No matching records found."}
          </p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {Object.keys(filteredRecords[0]).map((key) => (
                    <th key={key}>{key.replaceAll("_", " ")}</th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredRecords.map((record, index) => (
                  <tr key={record[config.id] || index}>
                    {Object.keys(filteredRecords[0]).map((key) => (
                      <td key={key}>
                        {record[key] === null ||
                        record[key] === undefined
                          ? "—"
                          : String(record[key])}
                      </td>
                    ))}

                    <td>
                      <div style={styles.actions}>
                        <button
                          className="text-btn"
                          onClick={() => openEditForm(record)}
                        >
                          Edit
                        </button>

                        <button
                          style={styles.deleteButton}
                          onClick={() => handleDelete(record)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("student");
  const [department, setDepartment] = useState("CSE AI & ML");
  const [semester, setSemester] = useState("3");
  const [cgpa, setCgpa] = useState("");
    const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const isRegister = mode === "register";
      const payload = isRegister
        ? { full_name: fullName.trim(), email, password, role,
            department: role === "student" ? department : undefined,
            semester: role === "student" ? semester : undefined,
            cgpa: role === "student" ? cgpa : undefined }
        : { email, password };
      const result = await apiRequest(`${API}/api/auth/${isRegister ? "register" : "login"}`, {
        method: "POST", body: JSON.stringify(payload),
      });
      if (!isRegister && result.user?.role !== role) {
        throw new Error(`This account is registered as ${result.user?.role}. Select the correct role.`);
      }
      localStorage.setItem("campusconnect_token", result.token);
      localStorage.setItem("campusconnect_user", JSON.stringify(result.user));
      onLogin(result.user);
    } catch (err) { setError(err.message || "Unable to continue. Please try again."); }
    finally { setLoading(false); }
  }

  return (
    <main className="auth-page" style={authStyles.page}><div style={authStyles.glowOne}/><div style={authStyles.glowTwo}/>
      <div className="auth-layout">
        <section className="auth-visual" aria-label="CampusConnect college community">
          <img src={campusCollaboration} alt="College students collaborating on campus" />
          <div className="auth-visual-shade" />
          <div className="auth-visual-copy">
            <span className="auth-visual-kicker">LEARN · CONNECT · GROW</span>
            <h2>Your campus journey,<br /><span>your next opportunity.</span></h2>
            <p>Discover internships, connect with companies and take the next step in your career with CampusConnect.</p>
            <div className="auth-visual-pills"><span>Student opportunities</span><span>Career connections</span></div>
          </div>
        </section>
        <section style={{...authStyles.card, maxWidth: 510}}>
        <div style={authStyles.brandMark}>C</div>
        <p style={authStyles.eyebrow}>CAMPUSCONNECT · INTERNSHIP PORTAL</p>
        <h1 style={authStyles.heading}>{mode === "login" ? <>Welcome <span style={authStyles.gradient}>back.</span></> : <>Create your <span style={authStyles.gradient}>account.</span></>}</h1>
        <p style={authStyles.subheading}>{mode === "login" ? "Sign in to continue your career journey." : "Join CampusConnect and explore opportunities."}</p>
        <div className="role-picker-heading">{mode === "login" ? "Choose your portal to sign in" : "Choose the account you want to create"}</div>
        <div style={{...authStyles.roleRow, gridTemplateColumns: "repeat(2,minmax(0,1fr))"}}>
          {(mode === "login" ? ["student", "admin"] : ["student"]).map(item => (
            <button type="button" key={item} onClick={() => setRole(item)} aria-pressed={role === item} style={{...authStyles.roleButton,...(role===item?authStyles.roleActive:{})}}>
              <span className="role-button-icon">{item === "admin" ? "▦" : item === "student" ? "♙" : "▣"}</span>
              <span>{item[0].toUpperCase()+item.slice(1)}</span>
              <small>{item === "admin" ? "Manage portal" : "Find opportunities"}</small>
            </button>
          ))}
        </div>
        <div className="selected-role-note">{role === "admin" ? "Administrator access · authorised account only" : "Student access · explore opportunities, manage your career journey and get support"}</div>
        <form onSubmit={handleSubmit} style={authStyles.form}>
          {mode === "register" && <label style={authStyles.label}>Full name<input required value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Your full name" style={authStyles.input}/></label>}
          <label style={authStyles.label}>Email address<input type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" style={authStyles.input}/></label>
          {mode === "register" && role === "student" && <div style={authStyles.formGrid}>
            <label style={authStyles.label}>Department<input value={department} onChange={e=>setDepartment(e.target.value)} style={authStyles.input}/></label>
            <label style={authStyles.label}>Semester<input type="number" min="1" max="12" value={semester} onChange={e=>setSemester(e.target.value)} style={authStyles.input}/></label>
            <label style={authStyles.label}>CGPA (optional)<input type="number" min="0" max="10" step="0.01" value={cgpa} onChange={e=>setCgpa(e.target.value)} style={authStyles.input}/></label>
          </div>}
          <label style={authStyles.label}>Password<div style={{position:"relative"}}><input type={showPassword?"text":"password"} required minLength={mode === "register" ? 8 : undefined} value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode === "register" ? "At least 8 characters" : "Enter your password"} style={{...authStyles.input,paddingRight:75}}/><button type="button" onClick={()=>setShowPassword(v=>!v)} style={authStyles.showPassword}>{showPassword?"Hide":"Show"}</button></div></label>
          {error && <p style={authStyles.error}>{error}</p>}
          <button type="submit" disabled={loading} style={authStyles.submit}>{loading ? "Please wait..." : mode === "login" ? "Sign in to CampusConnect →" : "Create account →"}</button>
        </form>
        <p style={{...authStyles.footer, marginTop:20}}>{mode === "login" ? "New to CampusConnect? " : "Already have an account? "}<button type="button" onClick={()=>{const next = mode === "login" ? "register" : "login"; setMode(next); setRole(next === "register" ? "student" : "admin"); setError("");}} style={{border:0,background:"transparent",color:"#c2adff",fontWeight:800,cursor:"pointer"}}>{mode === "login" ? "Create account" : "Sign in"}</button></p>
        <p style={authStyles.footer}>Secure student and administrator access to the CampusConnect portal.</p>
        </section>
      </div>
    </main>
  );
}

function PortalShell({ user, title, onLogout, children }) {
  return <div className="portal-page" style={{minHeight:"100vh",background:"#f7f8fc",color:"#35334c",fontFamily:"Inter,Segoe UI,sans-serif",padding:"28px",boxSizing:"border-box"}}>
    <header style={{maxWidth:1200,margin:"0 auto 22px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap"}}>
      <div><div style={{color:"#7564b0",fontSize:11,fontWeight:800,letterSpacing:2}}>CAMPUSCONNECT · {user.role.toUpperCase()} PORTAL</div><h1 style={{margin:"8px 0",fontSize:30}}>{title}</h1><div style={{color:"#77788d"}}>Welcome, {user.full_name || user.email}</div></div>
      <button onClick={onLogout} style={portalButton}>Logout ↗</button>
    </header>
    <section className="portal-photo-banner">
      <img src={campusStudents} alt="Students walking together on a university campus" />
      <div className="portal-photo-overlay" />
      <div className="portal-photo-copy"><span>YOUR CAMPUS · YOUR FUTURE</span><h2>{user.role === "company" ? "Meet the next generation of talent." : "Make your next opportunity happen."}</h2><p>{user.role === "company" ? "Connect with students, discover emerging skills and grow your team." : "Explore opportunities, build connections and move your career forward."}</p></div>
    </section>
    <main style={{maxWidth:1200,margin:"22px auto 0"}}>{children}</main>
  </div>;
}
const portalButton={border:"1px solid #cfc4e9",borderRadius:10,padding:"11px 16px",background:"#7664b5",color:"white",cursor:"pointer",fontWeight:700};
const portalCard={background:"#ffffff",border:"1px solid #e8e3f2",borderRadius:16,padding:22,minWidth:0};
const portalInput={width:"100%",boxSizing:"border-box",padding:12,borderRadius:9,border:"1px solid #ded8eb",background:"#ffffff",color:"#38354f",marginTop:7};

function StudentDashboard({ user, onLogout }) {
  const [data,setData]=useState({profile:null,internships:[],applications:[]});
  const [busy,setBusy]=useState(true); const [error,setError]=useState(""); const [query,setQuery]=useState("");
  const [page,setPage]=useState("Overview");
  const [savedIds,setSavedIds]=useState(()=>{try{return JSON.parse(localStorage.getItem("cc_student_saved")||"[]");}catch{return [];}});
  const [contact,setContact]=useState({subject:"",message:""}); const [contactMessage,setContactMessage]=useState("");
  async function refresh(){setBusy(true);setError("");try{setData(await apiRequest(`${API}/api/student/dashboard`));}catch(e){setError(e.message);}finally{setBusy(false);}}
  useEffect(()=>{refresh();},[]);
  async function apply(id){try{await apiRequest(`${API}/api/student/applications`,{method:"POST",body:JSON.stringify({internship_id:id})});await refresh();}catch(e){setError(e.message);}}
  function toggleSaved(id){const next=savedIds.includes(Number(id))?savedIds.filter(x=>x!==Number(id)):[...savedIds,Number(id)];setSavedIds(next);localStorage.setItem("cc_student_saved",JSON.stringify(next));}
  const applied=new Set(data.applications.map(a=>Number(a.internship_id)));
  const visible=data.internships.filter(i=>`${i.title||""} ${i.company_name||""} ${i.skills||""} ${i.required_skills||""}`.toLowerCase().includes(query.toLowerCase()));
  const saved=data.internships.filter(i=>savedIds.includes(Number(i.internship_id)));
  const nav=["Overview","Explore Internships","My Applications","Saved Internships","Notifications","My Profile","Help Center","Contact Support","About CampusConnect"];
  const card={background:"#fff",border:"1px solid #e8e3f2",borderRadius:16,padding:22,minWidth:0};
  const btn={border:"1px solid #cfc4e9",borderRadius:10,padding:"10px 15px",background:"#7969b5",color:"white",cursor:"pointer",fontWeight:700};
  const input={width:"100%",boxSizing:"border-box",padding:12,borderRadius:9,border:"1px solid #ded8eb",background:"#fff",color:"#38354f",marginTop:7};
  const heading=<div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap",marginBottom:18}}><div><div style={{fontSize:11,color:"#7564b0",fontWeight:800,letterSpacing:1.6}}>STUDENT WORKSPACE</div><h2 style={{margin:"6px 0",color:"#38354f"}}>{page}</h2></div><button onClick={refresh} style={{...btn,background:"#f1edfa",color:"#66549f"}}>↻ Refresh</button></div>;
  return <div className="student-portal-page" style={{minHeight:"100vh",background:"#f5f4fa",color:"#35334c",fontFamily:"Inter,Segoe UI,sans-serif",padding:22,boxSizing:"border-box"}}>
    <header style={{maxWidth:1200,margin:"0 auto 18px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,flexWrap:"wrap"}}><div><div style={{color:"#7564b0",fontSize:11,fontWeight:800,letterSpacing:2}}>CAMPUSCONNECT · STUDENT PORTAL</div><h1 style={{margin:"6px 0",fontSize:28}}>Your campus, your next step.</h1><div style={{color:"#77788d"}}>Welcome, {user.full_name||user.email}</div></div><button onClick={onLogout} style={btn}>Logout ↗</button></header>
    <section className="portal-photo-banner" style={{maxWidth:1200,margin:"0 auto 18px"}}><img src={campusStudents} alt="Students walking together on a university campus"/><div className="portal-photo-overlay"/><div className="portal-photo-copy"><span>YOUR CAMPUS · YOUR FUTURE</span><h2>Discover opportunities. Build your future.</h2><p>Explore internships, keep track of applications and find support whenever you need it.</p></div></section>
    <div style={{maxWidth:1200,margin:"0 auto",display:"grid",gridTemplateColumns:"minmax(190px,230px) minmax(0,1fr)",gap:18}}>
      <aside style={{...card,padding:12,height:"fit-content"}}><div style={{padding:"10px 12px",fontWeight:800,color:"#7564b0"}}>STUDENT MENU</div>{nav.map(n=><button key={n} onClick={()=>setPage(n)} style={{display:"block",width:"100%",textAlign:"left",padding:"11px 12px",margin:"3px 0",border:0,borderRadius:9,cursor:"pointer",fontWeight:page===n?800:600,color:page===n?"#55458d":"#65647a",background:page===n?"#eee9fa":"transparent"}}>{({Overview:"⌂", "Explore Internships":"⌕","My Applications":"▤","Saved Internships":"♡",Notifications:"♧","My Profile":"♙","Help Center":"?","Contact Support":"✉","About CampusConnect":"✦"})[n]}　{n}</button>)}</aside>
      <main style={{minWidth:0}}>{error&&<p style={{color:"#b64d69",background:"#fff0f3",padding:13,borderRadius:10}}>{error}</p>}{heading}
        {page==="Overview"&&<>
          <section className="student-welcome-panel">
            <div className="student-welcome-copy"><span className="student-section-kicker">YOUR CAREER JOURNEY STARTS HERE</span><h2>Small steps today.<br/><em>Big opportunities tomorrow.</em></h2><p>Explore internships, keep your applications moving and celebrate every milestone along the way.</p><button onClick={()=>setPage("Explore Internships")} className="student-primary-cta">Explore opportunities <span>→</span></button></div>
            <div className="student-welcome-art"><img src={campusCollaboration} alt="Students collaborating and learning together"/><div className="student-art-note"><span>✦</span><div><strong>Stay curious</strong><small>Your next chapter is waiting</small></div></div></div>
          </section>
          <div className="student-stat-grid">{[["My Applications",data.applications.length,"▤","Track every application","#7665b5"],["Open Internships",data.internships.length,"✧","Find your next opportunity","#2f9b91"],["Shortlisted",data.applications.filter(a=>a.status==="Shortlisted").length,"★","You are moving forward","#d18a42"],["Saved",savedIds.length,"♡","Your bookmarked roles","#d36b91"]].map(([label,value,icon,caption,tint])=><div className="student-stat-card" key={label}><div className="student-stat-icon" style={{color:tint,background:`${tint}18`}}>{icon}</div><div className="student-stat-label">{label}</div><strong>{busy?"…":value}</strong><small>{caption}</small></div>)}</div>
          <div className="student-overview-grid"><section className="student-quick-card"><div className="student-card-heading"><div><span className="student-section-kicker">MAKE IT HAPPEN</span><h3>Quick access</h3></div><span className="student-heading-spark">✦</span></div><div className="student-quick-links">{[["Explore Internships","⌕","Find roles that match your skills"],["My Applications","▤","Check your application progress"],["Saved Internships","♡","Revisit opportunities you liked"],["Help Center","?","Get answers and guidance"]].map(([n,icon,desc])=><button key={n} onClick={()=>setPage(n)}><span className="student-quick-icon">{icon}</span><span><strong>{n}</strong><small>{desc}</small></span><b>→</b></button>)}</div></section><section className="student-motivation-card"><img src={campusStudents} alt="University students walking across campus"/><div className="student-motivation-shade"/><div className="student-motivation-copy"><span>YOUR NEXT CHAPTER</span><h3>Build skills.<br/>Find your path.<br/>Make an impact.</h3><p>Every application is a step towards your future.</p></div></section></div>
          <div className="student-note-strip"><span>♧</span><p><strong>A little reminder:</strong> Your progress is personal. Keep exploring, keep learning and take one opportunity at a time.</p></div>
        </>}
        {page==="Explore Internships"&&<section style={card}><div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><p style={{margin:0,color:"#77788d"}}>Search available opportunities and save the ones you like.</p><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search role, company or skill..." style={{...input,maxWidth:300,margin:0}}/></div>{busy?<p>Loading opportunities...</p>:visible.length===0?<p>No internships found.</p>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:13,marginTop:18}}>{visible.map(i=><article className="student-internship-card" key={i.internship_id}><div className="student-internship-art"><img src={campusCollaboration} alt="Students collaborating"/><span>FEATURED OPPORTUNITY</span></div><div className="student-internship-content"><div style={{display:"flex",justifyContent:"space-between",gap:8}}><span style={{fontSize:11,color:"#7969b5",fontWeight:800}}>INTERNSHIP</span><button onClick={()=>toggleSaved(i.internship_id)} style={{border:0,background:"transparent",color:"#7969b5",cursor:"pointer"}}>{savedIds.includes(Number(i.internship_id))?"♥ Saved":"♡ Save"}</button></div><h3>{i.title}</h3><strong style={{color:"#638f9b"}}>{i.company_name||"Company"}</strong><p style={{fontSize:13,color:"#77788d"}}>Duration: {i.duration_months||"—"} months</p><p style={{fontSize:13}}>Skills: {i.required_skills||i.skills||"Not specified"}</p><button disabled={applied.has(Number(i.internship_id))} onClick={()=>apply(i.internship_id)} style={{...btn,opacity:applied.has(Number(i.internship_id)) ? 0.55 : 1}}>{applied.has(Number(i.internship_id))?"Already Applied":"Apply Now →"}</button></div></article>)}</div>}</section>}
        {page==="My Applications"&&<section style={card}><h3 style={{marginTop:0}}>Application tracker</h3>{data.applications.length===0?<p>You have not applied yet. Explore internships to get started.</p>:<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",textAlign:"left"}}><thead><tr>{["Internship","Company","Applied on","Status"].map(x=><th key={x} style={{padding:11,borderBottom:"1px solid #e8e3f2"}}>{x}</th>)}</tr></thead><tbody>{data.applications.map(a=><tr key={a.application_id}>{[a.internship_title,a.company_name,a.application_date?new Date(a.application_date).toLocaleDateString("en-IN"):"—",a.status||"Pending"].map((v,i)=><td key={i} style={{padding:11,borderBottom:"1px solid #eeeaf5"}}>{v||"—"}</td>)}</tr>)}</tbody></table></div>}</section>}
        {page==="Saved Internships"&&<section style={card}>{saved.length===0?<p>No saved internships yet. Use the ♡ Save option in Explore Internships.</p>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:12}}>{saved.map(i=><article key={i.internship_id} style={{border:"1px solid #e8e3f2",borderRadius:12,padding:15}}><h3>{i.title}</h3><p>{i.company_name||"Company"}</p><button style={btn} onClick={()=>setPage("Explore Internships")}>View opportunity</button> <button style={{...btn,background:"#f3eff9",color:"#66549f"}} onClick={()=>toggleSaved(i.internship_id)}>Remove</button></article>)}</div>}</section>}
        {page==="Notifications"&&<section style={card}><h3 style={{marginTop:0}}>Recent activity</h3>{data.applications.length===0?<p>No notifications yet. Your application updates will appear here.</p>:data.applications.map(a=><div key={a.application_id} style={{padding:"13px 0",borderBottom:"1px solid #eeeaf5"}}><strong>Application update · {a.status||"Pending"}</strong><p style={{margin:"5px 0",color:"#77788d"}}>{a.internship_title||"Internship"} · {a.company_name||"Company"}</p></div>)}</section>}
        {page==="My Profile"&&<section style={card}><h3 style={{marginTop:0}}>My profile</h3><p style={{color:"#77788d"}}>Your account details are shown below. Profile editing is restricted in this portal; contact the administrator if a correction is required.</p>{[["Full name",data.profile?.name||user.full_name],["Email",data.profile?.email||user.email],["Department",data.profile?.department],["Semester",data.profile?.semester],["CGPA",data.profile?.cgpa]].map(([k,v])=><div key={k} style={{padding:"12px 0",borderBottom:"1px solid #eeeaf5",display:"flex",justifyContent:"space-between",gap:12}}><span style={{color:"#77788d"}}>{k}</span><strong>{v??"Not added"}</strong></div>)}</section>}
        {page==="Help Center"&&<section style={card}><h3 style={{marginTop:0}}>How can we help?</h3>{[["How do I apply?","Open Explore Internships, choose an opportunity and select Apply Now. You can track it under My Applications."],["Where can I see my application status?","Open My Applications. The latest status appears beside each application."],["Can I edit student or company records?","No. Student accounts can manage their own internship activity only. Contact the administrator for account corrections."],["How do I save an opportunity?","Select the heart-shaped Save control on an internship card. Saved items are stored in this browser."],["How do I contact support?","Open Contact Support and submit your question using the email form."]].map(([q,a])=><details key={q} style={{padding:"13px 0",borderBottom:"1px solid #eeeaf5"}}><summary style={{cursor:"pointer",fontWeight:700}}>{q}</summary><p style={{color:"#77788d",lineHeight:1.6}}>{a}</p></details>)}</section>}
        {page==="Contact Support"&&<section style={{...card,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:22}}><div><span style={{color:"#7969b5",fontWeight:800,fontSize:11}}>STUDENT SUPPORT</span><h3>We're here to help.</h3><p style={{color:"#77788d",lineHeight:1.7}}>Have a question about your account, applications or internships? Send a message to the CampusConnect administrator.</p><p style={{color:"#77788d",fontSize:13}}>Your email app will open with your message. It is not stored in the portal.</p></div><form onSubmit={e=>{e.preventDefault();window.location.href=`mailto:?subject=${encodeURIComponent(contact.subject||"CampusConnect student support")}&body=${encodeURIComponent(`From: ${user.full_name||user.email}\n\n${contact.message}`)}`;setContactMessage("Your email application should open with the message prepared.");}}><label style={{display:"block",fontWeight:700}}>Subject<input required value={contact.subject} onChange={e=>setContact({...contact,subject:e.target.value})} style={input} placeholder="How can we help?"/></label><label style={{display:"block",fontWeight:700,marginTop:12}}>Message<textarea required rows="5" value={contact.message} onChange={e=>setContact({...contact,message:e.target.value})} style={input} placeholder="Write your question..."/></label><button type="submit" style={{...btn,marginTop:12}}>Send support email ↗</button>{contactMessage&&<p style={{color:"#638f9b"}}>{contactMessage}</p>}</form></section>}
        {page==="About CampusConnect"&&<section style={card}><span style={{color:"#7969b5",fontWeight:800,fontSize:11}}>ABOUT THE PLATFORM</span><h2>Connecting campus talent with career opportunities.</h2><p style={{color:"#77788d",lineHeight:1.8}}>CampusConnect is an internship management portal that helps students discover opportunities, submit applications and follow their progress, while administrators coordinate records and internship activity.</p><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12}}>{[["Discover","Explore internships"],["Track","Follow applications"],["Grow","Build your career"]].map(([a,b])=><div key={a} style={{background:"#f7f4fc",padding:16,borderRadius:12}}><strong style={{color:"#7969b5"}}>{a}</strong><p style={{marginBottom:0,color:"#77788d"}}>{b}</p></div>)}</div></section>}
      </main>
    </div>
  </div>;
}

function CompanyDashboard({ user, onLogout }) {
  const [data,setData]=useState({internships:[],applicants:[]}); const [busy,setBusy]=useState(true); const [error,setError]=useState(""); const [form,setForm]=useState({title:"",duration_months:"",skills:"",required_skills:""});
  async function refresh(){setBusy(true);try{setData(await apiRequest(`${API}/api/company/dashboard`));setError("");}catch(e){setError(e.message);}finally{setBusy(false);}}
  useEffect(()=>{refresh();},[]);
  async function post(e){e.preventDefault();try{await apiRequest(`${API}/api/company/internships`,{method:"POST",body:JSON.stringify(form)});setForm({title:"",duration_months:"",skills:"",required_skills:""});await refresh();}catch(e){setError(e.message);}}
  async function update(id,status){try{await apiRequest(`${API}/api/company/applications/${id}`,{method:"PATCH",body:JSON.stringify({status})});await refresh();}catch(e){setError(e.message);}}
  return <PortalShell user={user} title="Company Dashboard" onLogout={onLogout}>
    {error&&<p style={{color:"#b64d69",background:"#fff0f3",padding:13,borderRadius:10}}>{error}</p>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:16,marginBottom:22}}>{[["My Internships",data.internships.length],["Applicants",data.applicants.length],["Pending Review",data.applicants.filter(a=>a.status==="Pending").length]].map(([k,v])=><div key={k} style={portalCard}><div style={{color:"#77788d"}}>{k}</div><strong style={{fontSize:32,color:"#6c9fa9",display:"block",marginTop:10}}>{v}</strong></div>)}</div>
    <form onSubmit={post} style={{...portalCard,marginBottom:22}}><h2 style={{marginTop:0}}>Post an Internship</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>{[["title","Internship title"],["duration_months","Duration (months)"],["skills","Skills"],["required_skills","Required skills"]].map(([k,label])=><label key={k} style={{color:"#c9c8da",fontSize:13}}>{label}<input required={k==="title"} type={k==="duration_months"?"number":"text"} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} style={portalInput}/></label>)}</div><button style={{...portalButton,marginTop:16}}>Publish Internship →</button></form>
    <section style={portalCard}><h2 style={{marginTop:0}}>Applicants</h2>{busy?<p>Loading...</p>:data.applicants.length===0?<p style={{color:"#77788d"}}>No applications received yet.</p>:<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",textAlign:"left"}}><thead><tr>{["Student","Email","Internship","CGPA","Status","Update"].map(x=><th key={x} style={{padding:10,borderBottom:"1px solid #e8e3f2"}}>{x}</th>)}</tr></thead><tbody>{data.applicants.map(a=><tr key={a.application_id}><td style={{padding:10}}>{a.name}</td><td style={{padding:10}}>{a.email}</td><td style={{padding:10}}>{a.internship_title}</td><td style={{padding:10}}>{a.cgpa??"—"}</td><td style={{padding:10}}>{a.status}</td><td style={{padding:10}}><select value={a.status||"Pending"} onChange={e=>update(a.application_id,e.target.value)} style={portalInput}><option>Pending</option><option>Shortlisted</option><option>Selected</option><option>Rejected</option></select></td></tr>)}</tbody></table></div>}</section>
  </PortalShell>;
}

const authStyles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    display: "grid",
    placeItems: "center",
    position: "relative",
    overflow: "hidden",
    padding: "28px 16px",
    boxSizing: "border-box",
    background:
      "radial-gradient(circle at 15% 15%, #f0eaff 0, transparent 35%), radial-gradient(circle at 85% 85%, #e7f6f8 0, transparent 32%), #f7f8fc",
    color: "#35334c",
    fontFamily: "Inter, Segoe UI, sans-serif",
  },
  glowOne: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: "50%",
    background: "rgba(135,91,255,.14)",
    filter: "blur(70px)",
    top: "8%",
    left: "8%",
    pointerEvents: "none",
  },
  glowTwo: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: "50%",
    background: "rgba(0,210,220,.10)",
    filter: "blur(75px)",
    bottom: "5%",
    right: "8%",
    pointerEvents: "none",
  },
  card: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: 460,
    boxSizing: "border-box",
    padding: "42px 38px",
    border: "1px solid #e8e2f5",
    borderRadius: 24,
    background: "rgba(255,255,255,.97)",
    boxShadow: "0 24px 70px rgba(75,61,120,.13)",
    backdropFilter: "blur(18px)",
  },
  brandMark: {
    width: 48,
    height: 48,
    display: "grid",
    placeItems: "center",
    borderRadius: 15,
    background: "linear-gradient(135deg,#9b72ff,#32d6df)",
    color: "#090a16",
    fontWeight: 900,
    fontSize: 25,
    marginBottom: 25,
  },
  eyebrow: {
    color: "#7666b3",
    letterSpacing: 2,
    fontSize: 10,
    fontWeight: 800,
    margin: "0 0 12px",
  },
  heading: {
    fontSize: "clamp(32px,6vw,42px)",
    lineHeight: 1.1,
    margin: 0,
    letterSpacing: -1.5,
  },
  gradient: {
    background: "linear-gradient(90deg,#b18aff,#54e2e5)",
    WebkitBackgroundClip: "text",
    color: "transparent",
  },
  subheading: {
    color: "#73758b",
    margin: "12px 0 26px",
    fontSize: 14,
  },
  roleRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3,1fr)",
    gap: 8,
    marginBottom: 24,
    padding: 5,
    borderRadius: 12,
    background: "#f2effa",
  },
  roleButton: {
    border: "1px solid transparent",
    borderRadius: 9,
    padding: "10px 5px",
    color: "#6f6b83",
    background: "transparent",
    cursor: "pointer",
    fontWeight: 700,
  },
  roleActive: {
    color: "#5b4a94",
    borderColor: "#c9b8ef",
    background: "#e9e1fa",
  },
  form: {
    display: "grid",
    gap: 18,
  },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 },
  label: {
    display: "grid",
    gap: 8,
    color: "#4d4b62",
    fontSize: 13,
    fontWeight: 650,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #ddd7eb",
    borderRadius: 10,
    padding: "13px 14px",
    color: "#343149",
    background: "#fff",
    outline: "none",
    fontSize: 14,
  },
  showPassword: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
    border: 0,
    color: "#9f91d4",
    background: "transparent",
    cursor: "pointer",
    fontWeight: 700,
  },
  error: {
    color: "#ff9bb1",
    background: "rgba(255,90,130,.1)",
    border: "1px solid rgba(255,90,130,.25)",
    padding: 11,
    borderRadius: 9,
    fontSize: 13,
    margin: 0,
  },
  submit: {
    border: 0,
    borderRadius: 11,
    padding: "14px 16px",
    color: "#fff",
    background: "linear-gradient(100deg,#9d83dc,#79cbd0)",
    fontWeight: 850,
    fontSize: 14,
    cursor: "pointer",
    marginTop: 2,
  },
  footer: {
    color: "#777991",
    fontSize: 11,
    textAlign: "center",
    margin: "23px 0 0",
  },
};


function WorkspaceExtension({ page, user, students, companies, internships, applications, interviews }) {
  const [query, setQuery] = useState("");
  const [savedIds, setSavedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("campusconnect_saved_internships") || "[]"); }
    catch { return []; }
  });
  const [openFaq, setOpenFaq] = useState(0);
  const [contact, setContact] = useState({ subject: "", message: "" });
  const [contactMessage, setContactMessage] = useState("");

  function toggleSaved(id) {
    const next = savedIds.includes(Number(id))
      ? savedIds.filter(item => item !== Number(id))
      : [...savedIds, Number(id)];
    setSavedIds(next);
    localStorage.setItem("campusconnect_saved_internships", JSON.stringify(next));
  }

  const savedInternships = internships.filter(item => savedIds.includes(Number(item.internship_id)));
  const searchResults = internships.filter(item => {
    const haystack = `${item.title || ""} ${item.company_name || ""} ${item.skills || ""} ${item.required_skills || ""}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });
  const recentApplications = [...applications].sort((a,b) => new Date(b.application_date || 0) - new Date(a.application_date || 0));
  const upcomingInterviews = [...interviews].sort((a,b) => new Date(a.interview_date || 0) - new Date(b.interview_date || 0));
  const statusCounts = ["Pending", "Shortlisted", "Selected", "Rejected"].map(status => ({
    status,
    count: applications.filter(item => String(item.status || "Pending").toLowerCase() === status.toLowerCase()).length,
  }));
  const totalApplications = applications.length || 1;
  const faqs = [
    ["How do students apply for an internship?", "Students sign in using the Student role, explore available internships and select Apply Now. Their application appears in the application tracker."],
    ["How can a company post an opportunity?", "A company signs in using the Company role and uses the Post an Internship form in its dashboard. The opportunity is then available to students."],
    ["How is an application status updated?", "Company users can review applicants and update their status. Administrators can also manage application records from the Applications workspace."],
    ["Where can interview details be viewed?", "Interview records are available in the Interviews workspace. The Calendar page provides a date-ordered overview of saved interview records."],
    ["Are saved internships shared across devices?", "Saved internships in this version are stored in this browser only. They are not synced to the server or other devices."],
  ];

  const heading = {
    "Explore Internships": ["Discover opportunities", "Search internship records and save opportunities worth exploring."],
    "Saved Internships": ["Your shortlist", "A personal list of internships saved in this browser."],
    "Calendar": ["Interview calendar", "A date-ordered view of interview records stored in CampusConnect."],
    "Notifications": ["Activity center", "Recent application and interview activity derived from your project records."],
    "Reports & Insights": ["Placement insights", "A quick operational snapshot generated from the connected project data."],
    "My Profile": ["Your account", "Account information currently available to CampusConnect."],
    "Help Center": ["How can we help?", "Quick answers to common questions about using the internship portal."],
    "About CampusConnect": ["A bridge between campus and career", "One workspace for students, companies and administrators to manage internship journeys."],
    "Contact Support": ["Contact and feedback", "Share a question or prepare a support email for the project administrator."],
  }[page] || [page, "CampusConnect workspace"];

  return <section className="records-page extension-page">
    <div className="extension-heading">
      <div><span className="eyebrow">CAMPUSCONNECT WORKSPACE</span><h1>{heading[0]}</h1><p>{heading[1]}</p></div>
      <div className="extension-mark">{page === "Explore Internships" ? "⌕" : page === "Calendar" ? "▦" : "✦"}</div>
    </div>

    {page === "Explore Internships" && <>
      <div className="extension-toolbar"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by role, company or skill..."/><span>{searchResults.length} opportunities found</span></div>
      {searchResults.length === 0 ? <div className="extension-empty"><strong>No internships found</strong><p>Try another keyword or add internship records from the Internships workspace.</p></div> : <div className="opportunity-grid">{searchResults.map(item => <article className="opportunity-card" key={item.internship_id}>
        <div className="opportunity-top"><span className="opportunity-icon">✧</span><button className={`save-opportunity ${savedIds.includes(Number(item.internship_id)) ? "is-saved" : ""}`} onClick={()=>toggleSaved(item.internship_id)} title="Save internship">{savedIds.includes(Number(item.internship_id)) ? "♥ Saved" : "♡ Save"}</button></div>
        <span className="eyebrow">INTERNSHIP OPPORTUNITY</span><h3>{item.title || "Untitled internship"}</h3><p className="opportunity-company">{item.company_name || `Company ID: ${item.company_id ?? "Not specified"}`}</p>
        <div className="opportunity-meta"><span>◷ {item.duration_months ? `${item.duration_months} months` : "Duration not specified"}</span><span>⌘ {item.skills || item.required_skills || "Skills not specified"}</span></div>
        <div className="opportunity-footer"><span className="status-pill">Open record</span><span className="record-id">ID #{item.internship_id}</span></div>
      </article>)}</div>}
    </>}

    {page === "Saved Internships" && <>
      <div className="extension-summary-row"><div className="mini-stat"><span>Saved in this browser</span><strong>{savedInternships.length}</strong></div><div className="mini-stat"><span>Total available</span><strong>{internships.length}</strong></div></div>
      {savedInternships.length === 0 ? <div className="extension-empty"><strong>Your shortlist is empty</strong><p>Visit Explore Internships and press ♡ Save on an opportunity to add it here.</p></div> : <div className="opportunity-grid">{savedInternships.map(item=><article className="opportunity-card" key={item.internship_id}><div className="opportunity-top"><span className="opportunity-icon">✧</span><button className="save-opportunity is-saved" onClick={()=>toggleSaved(item.internship_id)}>♥ Remove</button></div><span className="eyebrow">SAVED OPPORTUNITY</span><h3>{item.title}</h3><p className="opportunity-company">{item.company_name || `Company ID: ${item.company_id ?? "Not specified"}`}</p><div className="opportunity-meta"><span>◷ {item.duration_months ? `${item.duration_months} months` : "Duration not specified"}</span><span>⌘ {item.skills || item.required_skills || "Skills not specified"}</span></div><div className="opportunity-footer"><span className="status-pill">Saved</span><span className="record-id">ID #{item.internship_id}</span></div></article>)}</div>}
    </>}

    {page === "Calendar" && <>
      <div className="extension-summary-row"><div className="mini-stat"><span>Interview records</span><strong>{interviews.length}</strong></div><div className="mini-stat"><span>Online interviews</span><strong>{interviews.filter(i=>String(i.interview_mode).toLowerCase()==="online").length}</strong></div><div className="mini-stat"><span>Offline interviews</span><strong>{interviews.filter(i=>String(i.interview_mode).toLowerCase()==="offline").length}</strong></div></div>
      <div className="timeline-list">{upcomingInterviews.length === 0 ? <div className="extension-empty"><strong>No interview records yet</strong><p>When interviews are added in the Interviews workspace, they will appear here.</p></div> : upcomingInterviews.map((item,index)=><article className="timeline-item" key={item.interview_id || index}><div className="timeline-date"><strong>{item.interview_date ? new Date(item.interview_date).toLocaleDateString("en-IN",{day:"2-digit"}) : "—"}</strong><span>{item.interview_date ? new Date(item.interview_date).toLocaleDateString("en-IN",{month:"short",year:"numeric"}) : "No date"}</span></div><div className="timeline-content"><strong>Interview #{item.interview_id}</strong><p>Application #{item.application_id ?? "—"} · {item.interview_mode || "Mode not specified"}</p></div><span className="status-pill">{item.result || "Pending"}</span></article>)}</div>
    </>}

    {page === "Notifications" && <div className="activity-list">
      {recentApplications.length === 0 && interviews.length === 0 ? <div className="extension-empty"><strong>You're all caught up</strong><p>Application and interview activity will appear here when records are available.</p></div> : <>
        {recentApplications.slice(0,8).map((item,index)=><article className="activity-item" key={`app-${item.application_id || index}`}><span className="activity-icon">▤</span><div><strong>Application status: {item.status || "Pending"}</strong><p>Application #{item.application_id ?? "—"} · Student #{item.student_id ?? "—"} · Internship #{item.internship_id ?? "—"}</p></div><time>{item.application_date ? new Date(item.application_date).toLocaleDateString("en-IN") : "Date not recorded"}</time></article>)}
        {interviews.slice(0,8).map((item,index)=><article className="activity-item" key={`int-${item.interview_id || index}`}><span className="activity-icon">◷</span><div><strong>Interview {item.result || "scheduled"}</strong><p>Interview #{item.interview_id ?? "—"} · Application #{item.application_id ?? "—"}</p></div><time>{item.interview_date ? new Date(item.interview_date).toLocaleDateString("en-IN") : "Date not recorded"}</time></article>)}
      </>}
    </div>}

    {page === "Reports & Insights" && <>
      <div className="extension-summary-row four"><div className="mini-stat"><span>Students</span><strong>{students.length}</strong></div><div className="mini-stat"><span>Companies</span><strong>{companies.length}</strong></div><div className="mini-stat"><span>Internships</span><strong>{internships.length}</strong></div><div className="mini-stat"><span>Applications</span><strong>{applications.length}</strong></div></div>
      <div className="report-grid"><article className="report-panel"><div className="panel-heading"><div><span className="eyebrow">APPLICATION BREAKDOWN</span><h2>Application status</h2></div></div>{statusCounts.map(item=><div className="bar-row" key={item.status}><div><span>{item.status}</span><strong>{item.count}</strong></div><div className="bar-track"><span style={{width:`${Math.round(item.count/totalApplications*100)}%`}}/></div></div>)}</article><article className="report-panel"><span className="eyebrow">PORTAL HEALTH</span><h2>Workspace coverage</h2><div className="coverage-list">{[["Student records",students.length],["Company records",companies.length],["Internship records",internships.length],["Interview records",interviews.length]].map(([label,value])=><div key={label}><span>{label}</span><strong>{value} records</strong></div>)}</div><p className="report-note">These insights are calculated from records currently returned by your connected backend.</p></article></div>
    </>}

    {page === "My Profile" && <div className="profile-layout"><div className="profile-feature"><div className="profile-big-avatar">{String(user?.full_name || user?.email || "U").charAt(0).toUpperCase()}</div><span className="eyebrow">CAMPUSCONNECT ACCOUNT</span><h2>{user?.full_name || "CampusConnect User"}</h2><p>{user?.email || "Email not available"}</p><span className="role-chip">{String(user?.role || "user").toUpperCase()}</span></div><div className="profile-details">{[["Full name",user?.full_name], ["Email address",user?.email], ["Account role",user?.role], ["User ID",user?.id ?? user?.user_id ?? "Not provided"]].map(([label,value])=><div className="profile-detail" key={label}><span>{label}</span><strong>{value || "Not provided"}</strong></div>)}<p className="report-note">Profile fields are shown from your authenticated account. Editing account credentials is managed through the authentication service.</p></div></div>}

    {page === "Help Center" && <div className="faq-list">{faqs.map(([question,answer],index)=><article className={`faq-item ${openFaq===index?"faq-open":""}`} key={question}><button onClick={()=>setOpenFaq(openFaq===index?-1:index)}><span>{question}</span><b>{openFaq===index?"−":"+"}</b></button>{openFaq===index&&<p>{answer}</p>}</article>)}</div>}

    {page === "About CampusConnect" && <div className="about-layout"><div className="about-hero"><span className="eyebrow">OUR PURPOSE</span><h2>Turning campus potential into career opportunities.</h2><p>CampusConnect is an internship management portal designed to bring students, companies and college administrators into one coordinated workspace.</p></div><div className="about-values">{[["01","Discover","Help students explore internship opportunities and build their career direction."],["02","Connect","Give companies a structured way to share opportunities and review applicants."],["03","Manage","Help administrators oversee students, companies, applications and interviews." ]].map(([n,title,body])=><article key={n}><span>{n}</span><h3>{title}</h3><p>{body}</p></article>)}</div><div className="about-tech"><span className="eyebrow">TECHNOLOGY STACK</span><div>{["React.js","Vite","Node.js","Express.js","MySQL","REST API"].map(t=><span key={t}>{t}</span>)}</div></div></div>}

    {page === "Contact Support" && <div className="contact-layout"><div className="contact-copy"><span className="eyebrow">WE'RE HERE TO HELP</span><h2>Have a question or suggestion?</h2><p>Use this form to prepare an email to the project support contact. Your message will open in your default email application; it is not stored in the CampusConnect database.</p><div className="contact-note"><strong>Project</strong><span>CampusConnect · Internship Management Portal</span></div></div><form className="contact-form" onSubmit={e=>{e.preventDefault();const subject=encodeURIComponent(contact.subject || "CampusConnect support");const body=encodeURIComponent(contact.message);window.location.href=`mailto:?subject=${subject}&body=${body}`;setContactMessage("Your email application should open with the message prepared.");}}><label>Subject<input required value={contact.subject} onChange={e=>setContact({...contact,subject:e.target.value})} placeholder="How can we help?"/></label><label>Message<textarea required rows="5" value={contact.message} onChange={e=>setContact({...contact,message:e.target.value})} placeholder="Write your question or suggestion..."/></label><button type="submit" className="primary-btn">Prepare email ↗</button>{contactMessage&&<p className="report-note">{contactMessage}</p>}</form></div>}
  </section>;
}

function App() {
  const [activePage, setActivePage] = useState("Overview");

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("campusconnect_user") || "null"
      );
    } catch {
      return null;
    }
  });

  const [students, setStudents] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [internships, setInternships] = useState([]);
  const [applications, setApplications] = useState([]);
  const [interviews, setInterviews] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  async function loadDashboardData() {
    setLoading(true);
    setError("");

    const requests = [
      ["students", setStudents],
      ["companies", setCompanies],
      ["internships", setInternships],
      ["applications", setApplications],
      ["interviews", setInterviews],
    ];

    const results = await Promise.allSettled(
      requests.map(([endpoint]) =>
        apiRequest(`${API}/${endpoint}`)
      )
    );

    let studentError = "";

    results.forEach((result, index) => {
      const [, setter] = requests[index];

      if (result.status === "fulfilled") {
        setter(Array.isArray(result.value) ? result.value : []);
      } else {
        setter([]);

        if (index === 0) {
          studentError =
            result.reason?.message || "Unable to load students.";
        }
      }
    });

    setError(studentError);
    setLoading(false);
  }

  useEffect(() => {
    const token = localStorage.getItem("campusconnect_token");

    if (!token) {
      setLoading(false);
      return;
    }

    apiRequest(`${API}/api/auth/me`)
      .then((result) => {
        setCurrentUser(result.user);
        if (result.user?.role === "admin") loadDashboardData();
        else setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem("campusconnect_token");
        localStorage.removeItem("campusconnect_user");
        setCurrentUser(null);
        setLoading(false);
      });
  }, []);

  const filteredStudents = useMemo(() => {
    const query = search.toLowerCase();

    return students.filter((student) =>
      [
        student.name,
        student.email,
        student.department,
      ].some((value) =>
        String(value || "").toLowerCase().includes(query)
      )
    );
  }, [students, search]);

  const stats = [
    {
      label: "Total Students",
      value: students.length,
      icon: "♙",
      color: "purple",
      note: "Registered students",
    },
    {
      label: "Companies",
      value: companies.length,
      icon: "▣",
      color: "cyan",
      note: "Partner companies",
    },
    {
      label: "Internships",
      value: internships.length,
      icon: "✧",
      color: "pink",
      note: "Available opportunities",
    },
    {
      label: "Applications",
      value: applications.length,
      icon: "▤",
      color: "orange",
      note: "Application tracking",
    },
  ];

  function renderPage() {
    if (activePage === "Analytics") {
      return <Analytics />;
    }

    if (["Explore Internships", "Saved Internships", "Calendar", "Notifications", "Reports & Insights", "My Profile", "Help Center", "About CampusConnect", "Contact Support"].includes(activePage)) {
      return <WorkspaceExtension page={activePage} user={currentUser} students={students} companies={companies} internships={internships} applications={applications} interviews={interviews} />;
    }

    if (modules[activePage]) {
      const data = {
        Students: students,
        Companies: companies,
        Internships: internships,
        Applications: applications,
        Interviews: interviews,
      };

      return (
        <DataModule
          page={activePage}
          records={data[activePage]}
          onRefresh={loadDashboardData}
          students={students}
          companies={companies}
          internships={internships}
          applications={applications}
        />
      );
    }

    if (activePage === "Overview") {
      return (
        <>
          <section className="hero">
            <div className="hero-content">
              <span className="eyebrow">
                CAMPUSCONNECT · MANAGEMENT PORTAL
              </span>

              <h1>
                Build your <span>career journey.</span>
              </h1>

              <p>
                Manage students, discover internship opportunities and
                connect talent with the right companies.
              </p>

              <button
                className="primary-btn"
                onClick={() => setActivePage("Students")}
              >
                Explore Students <span>→</span>
              </button>
            </div>

            <div className="hero-art hero-art-photo">
              <img className="hero-campus-image" src={campusStudents} alt="College students on campus" />

              <div className="floating-chip chip-one">
                ✧ Opportunities
              </div>

              <div className="floating-chip chip-two">
                ↗ Career growth
              </div>
            </div>
          </section>

          <section className="stats-grid">
            {stats.map((stat) => (
              <div className="stat-card" key={stat.label}>
                <div className={`stat-icon ${stat.color}`}>
                  {stat.icon}
                </div>

                <div className="stat-info">
                  <p>{stat.label}</p>
                  <h2>{loading ? "..." : stat.value}</h2>
                  <span>{stat.note}</span>
                </div>
              </div>
            ))}
          </section>

          <section className="overview-grid">
            <div className="panel students-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">DATABASE OVERVIEW</span>
                  <h2>Recent Students</h2>
                </div>

                <button
                  className="text-btn"
                  onClick={() => setActivePage("Students")}
                >
                  View all →
                </button>
              </div>

              {loading ? (
                <p className="empty-state">
                  Loading student records...
                </p>
              ) : error ? (
                <p className="error-message">{error}</p>
              ) : students.length === 0 ? (
                <p className="empty-state">
                  No student records found.
                </p>
              ) : (
                <div className="student-list">
                  {students.slice(0, 5).map((student, index) => (
                    <div
                      className="student-row"
                      key={student.student_id || index}
                    >
                      <div className="avatar">
                        {String(student.name || "S")
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="student-details">
                        <strong>
                          {student.name || "Unnamed Student"}
                        </strong>

                        <span>
                          {student.email || "No email available"}
                        </span>
                      </div>

                      <span className="student-sem">
                        Sem {student.semester || "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="panel quick-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">QUICK ACCESS</span>
                  <h2>Workspace</h2>
                </div>
              </div>

              <div className="quick-actions">
                {navigation
                  .filter((item) => item.name !== "Overview")
                  .map((item) => (
                    <button
                      className="action-tile"
                      key={item.name}
                      onClick={() => setActivePage(item.name)}
                    >
                      <span className="action-icon">{item.icon}</span>
                      <span>{item.name}</span>
                      <span className="action-arrow">↗</span>
                    </button>
                  ))}
              </div>
            </div>
          </section>
        </>
      );
    }

    return (
      <section className="records-page">
        <p className="empty-state">Select a workspace section.</p>
      </section>
    );
  }

  function handleLogout() {
    localStorage.removeItem("campusconnect_token");
    localStorage.removeItem("campusconnect_user");
    setCurrentUser(null);
    setStudents([]); setCompanies([]); setInternships([]); setApplications([]); setInterviews([]);
  }

  if (currentUser?.role === "student") {
    return <StudentDashboard user={currentUser} onLogout={handleLogout} />;
  }

  if (currentUser?.role === "company") {
    return <CompanyDashboard user={currentUser} onLogout={handleLogout} />;
  }

  if (!currentUser) {
    return (
      <LoginScreen
        onLogin={(user) => {
          setCurrentUser(user);
          setActivePage("Overview");
          if (user?.role === "admin") loadDashboardData();
        }}
      />
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">C</div>

          <div>
            <h2>
              Campus<span>Connect</span>
            </h2>
            <p>INTERNSHIP PORTAL</p>
          </div>
        </div>

        <div className="nav-section-label">WORKSPACE</div>

        <nav className="navigation">
          {navigation.map((item) => (
            <button
              key={item.name}
              className={`nav-item ${
                activePage === item.name ? "active" : ""
              }`}
              onClick={() => setActivePage(item.name)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.name}</span>

              {activePage === item.name && (
                <span className="active-indicator"></span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="admin-card">
            <div className="admin-avatar">A</div>

            <div>
              <strong>
                {currentUser.full_name || currentUser.email}
              </strong>
              <span>
                {String(currentUser.role || "user").toUpperCase()}
              </span>
            </div>
          </div>

          <p className="sidebar-version">
            CAMPUSCONNECT · v1.0
          </p>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="breadcrumb">
              Workspace / {activePage}
            </p>
            <h2>{activePage}</h2>
          </div>

          <div className="topbar-right">
            <div className="system-status">
              <span className="status-dot"></span>
              System Workspace
            </div>

            <button
              className="refresh-btn"
              onClick={loadDashboardData}
              title="Refresh data"
            >
              ↻
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="text-btn"
              title="Sign out"
            >
              Logout ↗
            </button>

            <div className="profile-avatar">
              {String(currentUser.full_name || "U")
                .charAt(0)
                .toUpperCase()}
            </div>
          </div>
        </header>

        <div className="content">{renderPage()}</div>
      </main>
    </div>
  );
}

const styles = {
  toolbar: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    flexWrap: "wrap",
  },

  form: {
    margin: "24px 0",
    padding: "22px",
    border: "1px solid rgba(155,123,255,0.3)",
    borderRadius: "14px",
    background: "rgba(30,30,52,0.65)",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "18px",
    marginTop: "20px",
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    color: "#D9D9E8",
    fontSize: "13px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    borderRadius: "8px",
    border: "1px solid #45435F",
    background: "#1b2540",
    color: "#FFFFFF",
    outline: "none",
  },

  formActions: {
    display: "flex",
    gap: "15px",
    alignItems: "center",
    marginTop: "22px",
  },

  actions: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
  },

  deleteButton: {
    border: "none",
    background: "transparent",
    color: "#FF729F",
    cursor: "pointer",
    fontWeight: 600,
  },

  success: {
    color: "#72D6A0",
    margin: "12px 0",
  },
};

export default App;
