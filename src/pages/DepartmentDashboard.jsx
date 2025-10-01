import React, { useState, useEffect } from "react";
import logo from "../components/logo.png";
import bg from "../components/bg.jpg";
import Profile from "./Profile";
import AddOfficer from "./AddOfficer";
import PDFViewerModal from "../components/PDFViewerModal";
import "./DepartmentDashboard.css";
import AssignTask from "./AssignTask";
import { server } from "../server";

// Status mapping
const statusMap = {
  pending: { text: "Pending", className: "status-pending" },
  in_progress: { text: "In Progress", className: "status-inprogress" },
  resolved: { text: "Resolved", className: "status-resolved" },
  overdue: { text: "Overdue", className: "status-overdue" }
};

function formatDateDMY(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  let d;
  if (parts[0].length === 4) d = new Date(dateStr); // YYYY-MM-DD
  else d = new Date(parts[2], parts[1] - 1, parts[0]); // DD-MM-YYYY
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function daysLeft(deadline) {
  if (!deadline) return "";
  let d;
  const parts = deadline.split("-");
  if (parts[0].length === 4) d = new Date(deadline); // YYYY-MM-DD
  else d = new Date(parts[2], parts[1] - 1, parts[0]); // DD-MM-YYYY
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
  return diff;
}

const ALERT_DAYS = 2;
const API = server();

const DepartmentDashboard = () => {
  const [letters, setLetters] = useState([]);
  const [, setAdminName] = useState("");
  // Get department id from localStorage (department login stores dept_id)
  const [adminDeptId] = useState(localStorage.getItem("dept_id") || "");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showProfile, setShowProfile] = useState(false);
  const [officerReports, setOfficerReports] = useState([]);
  const [showAlert, setShowAlert] = useState(true);
  const [urgentTasks, setUrgentTasks] = useState([]);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfFileUrl] = useState("");
  const [, setDepartmentName] = useState(""); // For navbar display

  // 1. Fetch department name if desired
  useEffect(() => {
    if (adminDeptId) {
      fetch(`${API}/departments`)
        .then(res => res.json())
        .then(deps => {
          const found = deps.find(dep => String(dep.id) === String(adminDeptId));
          setDepartmentName(found ? found.name : "");
        });
    }
  }, [adminDeptId]);

  // 2. Fetch dashboard tasks
  useEffect(() => {
    if (activeTab === "dashboard" || activeTab === "assign-task") {
      if (!adminDeptId) return;
      fetch(`${API}/department_tasks?department_id=${adminDeptId}`)
        .then(res => res.json())
        .then(data => {
          const tasks = Array.isArray(data) ? data : data?.tasks || [];
          const sorted = [...tasks].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
          );
          setLetters(sorted);
          const urgent = sorted.filter(
            l =>
              l.status !== "resolved" &&
              l.deadline &&
              daysLeft(l.deadline) <= ALERT_DAYS &&
              daysLeft(l.deadline) >= 0
          );
          setUrgentTasks(urgent);
        });
    }
  }, [activeTab, adminDeptId]);

  // 3. Fetch officer reports (from officer_work table using department id)
  useEffect(() => {
    if (!adminDeptId) {
      setOfficerReports([]);
      return;
    }
    if (activeTab === "report") {
      fetch(`${API}/api/department/officer-reports/${adminDeptId}`)
        .then(res => res.json())
        .then(data => {
          // console.log("Officer reports data:", data);
          setOfficerReports(Array.isArray(data) ? data : []);
        })
        .catch((e) => {
          console.error("Error fetching officer reports:", e);
          setOfficerReports([]);
        });
    }
  }, [adminDeptId, activeTab]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  const handleInProgress = id => {
    fetch(`${API}/department_tasks/inprogress/${id}`, {
      method: "PUT"
    })
      .then(res => res.json())
      .then(() => {
        fetch(`${API}/department_tasks?department_id=${adminDeptId}`)
          .then(res => res.json())
          .then(data => {
            const tasks = Array.isArray(data) ? data : data?.tasks || [];
            setLetters(
              [...tasks].sort(
                (a, b) => new Date(b.created_at) - new Date(a.created_at)
              )
            );
          });
      })
      .catch(err => console.error("Error updating task status:", err));
  };

  // Download helper to force download (handles CORS issues on some browsers)
  const handleDownload = (file) => {
    fetch(`${API}/uploads/${file}`)
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(new Blob([blob], { type: "application/octet-stream" }));
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = file;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      });
  };

  const handleView = (file) => {
    window.open(`${API}/uploads/${file}`, "_blank");
  };

  const handleFileInputChange = (e, letterId) => {
    const input = e.target;
    const fileName = input.files && input.files.length > 0 ? input.files[0].name : "No file chosen";
    const label = document.querySelector(`#file-chosen-${letterId}`);
    if (label) label.textContent = fileName;
  };

  // --- UI render ---
  return (
    <div
      className="dashboard-container"
      style={{
        minHeight: "100vh",
        background: `url(${bg}) no-repeat center center fixed`,
        backgroundSize: "cover"
      }}
    >
      {/* Navbar ALWAYS stays the same */}
      <header className="dashboard-header">
        <div className="header-left">
          <img className="header-logo" src={logo} alt="Logo" />
          <h1 className="header-title" style={{ color: "var(--primary-color)" }}>
            Alert
          </h1>
        </div>
        <nav className="header-nav">
          <button
            className={activeTab === "dashboard" ? "active" : ""}
            onClick={() => setActiveTab("dashboard")}
          >
            डैशबोर्ड
          </button>
          <button
            className={activeTab === "add-officer" ? "active" : ""}
            onClick={() => setActiveTab("add-officer")}
          >
            अधिकारी जोड़ें
          </button>
          <button
            className={activeTab === "report" ? "active" : ""}
            onClick={() => setActiveTab("report")}
          >
            अधिकारी की रिपोर्ट
          </button>
          <button
            className={activeTab === "assign-task" ? "active" : ""}
            onClick={() => setActiveTab("assign-task")}
          >
            कार्य सौंपें {/* "Assign Task" in Hindi */}
          </button>
        </nav>
        <div className="header-right">
          <button
            className="admin-btn"
            style={{ minWidth: 110, height: 41 }}
            onClick={() => setShowProfile(true)}
          >
            प्रोफ़ाइल
          </button>
          <button
            className="logout-btn"
            style={{ minWidth: 110, height: 41 }}
            onClick={handleLogout}
          >
            लॉग आउट
          </button>
        </div>
      </header>

      <main style={{ marginTop: 0, padding: "16px 0 0 0" }}>
        {/* --- AssignTask TAB --- */}
        {activeTab === "assign-task" && (
          <AssignTask tasks={letters} departmentId={adminDeptId} />
        )}

        {/* --- Dashboard TAB --- */}
        {activeTab === "dashboard" && (
          <>
            {urgentTasks.length > 0 && showAlert && (
              <div className="deadline-alert-popup">
                <div className="alert-content">
                  <span className="danger-icon">⚠️</span>
                  <h2 style={{ color: "#b08900" }}>Urgent Tasks Approaching Deadline</h2>
                  <ul>
                    {urgentTasks.map(task => (
                      <li key={task.id}>
                        <b>{task.subject}</b> (ID: {task.letter_id}) - Deadline:{" "}
                        <span style={{ color: "#a94442" }}>{formatDateDMY(task.deadline)}</span>{" "}
                        (
                        <span style={{ color: "#a94442", fontWeight: 700 }}>
                          {daysLeft(task.deadline) === 0 ? "Today" : daysLeft(task.deadline) + " day(s) left"}
                        </span>
                        )
                      </li>
                    ))}
                  </ul>
                  <button className="close-alert-btn" onClick={() => setShowAlert(false)}>
                    Close
                  </button>
                </div>
              </div>
            )}

            <h1 className="dashboard-title" style={{ marginLeft: 18, color: "var(--text-primary)", fontWeight: 800 }}>
              Department Dashboard / विभाग डैशबोर्ड
            </h1>
            <p className="dashboard-desc" style={{ marginLeft: 18, color: "var(--text-secondary)" }}>
              Overview of your assigned tasks./आपके असाइन किए गए कार्यों का अवलोकन
            </p>
            <div className="task-list" style={{ marginLeft: 18, marginRight: 18 }}>
              {letters.map((letter, idx) => (
                <div key={letter.id || idx} className="task-card modern-card custom-task-card">
                  <div className="task-card-main">
                    <div className="task-header-row">
                      <h2 className="task-title">{letter.subject}</h2>
                      <span className={`status-badge ${statusMap[letter.status]?.className || ""}`}>
                        {statusMap[letter.status]?.text || letter.status}
                      </span>
                    </div>
                    <div className="task-row">
                      <span className="task-label">Letter ID:</span>
                      <span className="task-value strong">{letter.letter_id}</span>
                    </div>
                    <div className="task-row">
                      <span className="task-label">DEPT ID:</span>
                      <span className="task-value strong">{letter.department_id}</span>
                    </div>
                    <div className="task-row">
                      <span className="task-label">Deadline:</span>
                      <span className="task-value danger">{formatDateDMY(letter.deadline)}</span>
                    </div>
                    <div className="task-row">
                      <span className="task-label">Sender:</span>
                      <span className="task-value">{letter.assigned_by}</span>
                    </div>
                    <div className="task-row">
                      <span className="task-label">Letter File:</span>
                      <span className="task-value">
                        {letter.letter_file ? (
                          <>
                            <button style={{ marginRight: 6 }} onClick={() => handleView(letter.letter_file)}>View</button>
                            <button onClick={() => handleDownload(letter.letter_file)}>Download</button>
                          </>
                        ) : (
                          "-"
                        )}
                      </span>
                    </div>
                    <div className="task-row">
                      <span className="task-label">Report File:</span>
                      <span className="task-value">
                        {letter.report_file ? (
                          <>
                            <button style={{ marginRight: 6 }} onClick={() => handleView(letter.report_file)}>View</button>
                            <button onClick={() => handleDownload(letter.report_file)}>Download</button>
                          </>
                        ) : (
                          "-"
                        )}
                      </span>
                    </div>
                  </div>
                  {/* --- Report Submission Form --- */}
                  <div className="task-report-block custom-task-report-block">
                    <form
                      onSubmit={e => {
                        e.preventDefault();
                        const formData = new FormData(e.target);
                        fetch(
                          `${API}/department_tasks/report/${letter.id}`,
                          {
                            method: "PUT",
                            body: formData
                          }
                        )
                          .then(res => res.json())
                          .then(resp => {
                            alert(resp.message || "Report submitted!");
                            fetch(`${API}/department_tasks?department_id=${adminDeptId}`)
                              .then(res => res.json())
                              .then(data => {
                                const tasks = Array.isArray(data)
                                  ? data
                                  : data?.tasks || [];
                                setLetters(
                                  [...tasks].sort(
                                    (a, b) =>
                                      new Date(b.created_at) -
                                      new Date(a.created_at)
                                  )
                                );
                              });
                          });
                        e.target.reset();
                        // Reset file chosen text
                        const label = document.querySelector(`#file-chosen-${letter.id}`);
                        if (label) label.textContent = "No file chosen";
                      }}
                      className="report-form-row custom-report-form-row"
                    >
                      <div className="report-file-row custom-report-file-row">
                        <label className="report-file-label custom-report-file-label">
                          Upload Report
                        </label>
                        <input
                          type="file"
                          name="report_file"
                          accept="*"
                          className="report-file-input custom-report-file-input"
                          id={`file-input-${letter.id}`}
                          onChange={e => handleFileInputChange(e, letter.id)}
                        />
                        <label htmlFor={`file-input-${letter.id}`} className="custom-file-btn">
                          Choose File
                        </label>
                        <span id={`file-chosen-${letter.id}`} className="file-chosen-text">No file chosen</span>
                      </div>
                      <div className="report-desc-label">Report Description</div>
                      <textarea
                        name="report_description"
                        rows="2"
                        placeholder="Provide a brief description..."
                        className="report-desc-textarea custom-report-desc-textarea"
                      ></textarea>
                      <div style={{ display: "flex", justifyContent: "center", marginTop: "12px" }}>
                        <button type="submit" className="submit-btn custom-submit-btn">
                          <span role="img" aria-label="submit">➤</span> Submit
                        </button>
                      </div>
                    </form>
                    {letter.status === "pending" && (
                      <button
                        className="inprogress-btn custom-inprogress-btn"
                        onClick={() => handleInProgress(letter.id)}
                        style={{
                          marginTop: 10,
                          fontSize: 16,
                          fontWeight: 700,
                          width: "100%"
                        }}
                      >
                        Mark In-Progress
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "add-officer" && (
          <div style={{ marginLeft: 22, marginRight: 22, marginTop: 0 }}>
            <AddOfficer onAdded={() => {}} />
          </div>
        )}
        {activeTab === "report" && (
          <div style={{ marginLeft: 22, marginRight: 22, marginTop: 0 }}>
            <OfficerReportTable reports={officerReports} apiBase={API} />
          </div>
        )}
        <PDFViewerModal open={pdfModalOpen} fileUrl={pdfFileUrl} onClose={() => setPdfModalOpen(false)} />
        {showProfile && (
          <Profile
            uniqueId={adminDeptId}
            onClose={() => setShowProfile(false)}
            onProfileUpdate={n => setAdminName(n)}
          />
        )}
      </main>
    </div>
  );
};

function OfficerReportTable({ reports, apiBase }) {
  // apiBase is passed for correct path
  return (
    <div className="report-table-wrapper">
      <h2 style={{ color: "var(--primary-color)", marginBottom: 12 }}>
        Officer Tasks & Reports / अधिकारी कार्य और रिपोर्ट
      </h2>
      <table className="report-table">
        <thead>
          <tr>
            <th>Officer (अधिकारी)</th>
            <th>Task Title (कार्य शीर्षक)</th>
            <th>Deadline (अंतिम तिथि)</th>
            <th>Report File (रिपोर्ट फ़ाइल)</th>
            <th>Report Description (रिपोर्ट विवरण)</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(reports) && reports.length > 0 ? (
            reports.map((r, i) => (
              <tr key={r.officer_work_id || r.id || i}>
                <td>{r.officer_name}</td>
                <td>{r.work_title}</td>
                <td>{formatDateDMY(r.deadline)}</td>
                <td>
                  {r.report_file ? (
                    <>
                      <button
                        style={{ marginRight: 6 }}
                        onClick={() => window.open(`${apiBase}/uploads/${r.report_file}`, "_blank")}
                      >
                        View
                      </button>
                      <button
                        onClick={() => {
                          fetch(`${apiBase}/uploads/${r.report_file}`)
                            .then(response => response.blob())
                            .then(blob => {
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.style.display = "none";
                              a.href = url;
                              a.download = r.report_file;
                              document.body.appendChild(a);
                              a.click();
                              window.URL.revokeObjectURL(url);
                            });
                        }}
                      >
                        Download
                      </button>
                    </>
                  ) : (
                    "-"
                  )}
                </td>
                <td>{r.report_description}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" style={{ textAlign: "center" }}>
                No reports available / कोई रिपोर्ट उपलब्ध नहीं है
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DepartmentDashboard;