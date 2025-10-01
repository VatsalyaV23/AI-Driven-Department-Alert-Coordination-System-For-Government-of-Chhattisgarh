import React, { useState, useEffect } from "react";
import logo from "../components/logo.png";
import bg from "../components/bg.jpg";
import Profile from "./Profile";
import "./OfficerDashboard.css"; // Reuse same theme/styles
import { server } from "../server";

// Status mapping
const statusMap = {
  pending: { text: "Pending", className: "status-pending" },
  in_progress: { text: "In Progress", className: "status-inprogress" },
  resolved: { text: "Resolved", className: "status-resolved" },
  overdue: { text: "Overdue", className: "status-overdue" },
};

function formatDateDMY(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function daysLeft(deadline) {
  if (!deadline) return "";
  const today = new Date();
  today.setHours(0,0,0,0);
  const d = new Date(deadline);
  d.setHours(0,0,0,0);
  const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
  return diff;
}

const ALERT_DAYS = 2; // Number of days to consider as "close to deadline"

const OfficerDashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [, setOfficerName] = useState("");
  const [uniqueId] = useState(localStorage.getItem("unique_id"));
  const [showProfile, setShowProfile] = useState(false);

  // For Deadline Alert Popup
  const [showAlert, setShowAlert] = useState(true);
  const [urgentTasks, setUrgentTasks] = useState([]);

  useEffect(() => {
    if (!uniqueId) return;

    // Get officer's assigned tasks
    fetch(server() + `/officer_tasks/${uniqueId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const sorted = [...data].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
          );
          setTasks(sorted);

          const urgent = sorted.filter(
            (t) =>
              t.status !== "resolved" &&
              t.deadline &&
              daysLeft(t.deadline) <= ALERT_DAYS &&
              daysLeft(t.deadline) >= 0
          );
          setUrgentTasks(urgent);
        } else {
          console.error("Unexpected response (tasks):", data);
          setTasks([]);
          setUrgentTasks([]);
        }
      })
      .catch((err) => {
        console.error("Fetch tasks error:", err);
        setTasks([]);
        setUrgentTasks([]);
      });

    // Get officer name
    fetch(server() + `/officer/${uniqueId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.name) {
          setOfficerName(
            data.name + (data.surname ? " " + data.surname : "")
          );
        }
      })
      .catch((err) => console.error("Fetch officer error:", err));
  }, [uniqueId]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  // Submit officer report to officer_work
  const handleReportSubmit = (workId, e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    fetch(server() + `/officer_work/report/${workId}`, {
      method: "PUT",
      body: formData,
    })
      .then((res) => res.json())
      .then((resp) => {
        alert(resp.message || "Report submitted!");
        // Reload tasks
        return fetch(server() + `/officer_tasks/${uniqueId}`);
      })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTasks(
            [...data].sort(
              (a, b) => new Date(b.created_at) - new Date(a.created_at)
            )
          );
        }
      })
      .catch((err) => console.error("Report submit error:", err));
    e.target.reset();
  };

  // Download helper (handles CORS issues on some browsers)
  const handleDownload = (file) => {
    fetch(server() + `/uploads/${file}`)
      .then((response) => response.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(
          new Blob([blob], { type: "application/octet-stream" })
        );
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = file;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      });
  };

  return (
    <div
      className="dashboard-container"
      style={{
        minHeight: "100vh",
        background: `url(${bg}) no-repeat center center fixed`,
        backgroundSize: "cover",
      }}
    >
      <header className="dashboard-header">
        <div className="header-left">
          <img className="header-logo" src={logo} alt="Logo" />
          <h1 className="header-title" style={{ color: "var(--primary-color)" }}>
            Alert
          </h1>
        </div>
        <nav className="header-nav">
          <button className="active">डैशबोर्ड</button>
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
        {/* ALERT POPUP */}
        {urgentTasks.length > 0 && showAlert && (
          <div className="deadline-alert-popup">
            <div className="alert-content">
              <span className="danger-icon">⚠️</span>
              <h2 style={{ color: "#b08900" }}>
                Tasks Approaching Deadline
              </h2>
              <ul>
                {urgentTasks.map((task, idx) => (
                  <li key={task.id || idx}>
                    <b>{task.work_title}</b> (ID: {task.task_id}) - Deadline:{" "}
                    <span style={{ color: "#a94442" }}>
                      {formatDateDMY(task.deadline)}
                    </span>{" "}
                    (
                    <span
                      style={{ color: "#a94442", fontWeight: 700 }}
                    >
                      {daysLeft(task.deadline) === 0
                        ? "Today"
                        : daysLeft(task.deadline) + " day(s) left"}
                    </span>
                    )
                  </li>
                ))}
              </ul>
              <button
                className="close-alert-btn"
                onClick={() => setShowAlert(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* DASHBOARD */}
        <h1
          className="dashboard-title"
          style={{
            marginLeft: 18,
            color: "var(--text-primary)",
            fontWeight: 800,
          }}
        >
          Officer Dashboard / अधिकारी डैशबोर्ड
        </h1>
        <p
          className="dashboard-desc"
          style={{ marginLeft: 18, color: "var(--text-secondary)" }}
        >
          Your assigned tasks and report submission./ आपके असाइन किए गए कार्य और
          रिपोर्ट सबमिशन
        </p>

        <div className="task-list" style={{ marginLeft: 18, marginRight: 18 }}>
          {tasks.length === 0 ? (
            <p style={{ color: "gray" }}>No tasks assigned.</p>
          ) : (
            tasks.map((task, idx) => (
              <div
                key={task.id || idx}
                className="task-card modern-card"
              >
                <div className="task-card-main">
                  <div className="task-header-row">
                    <h2 className="task-title">{task.work_title}</h2>
                    <span
                      className={`status-badge ${
                        statusMap[task.status]?.className || ""
                      }`}
                    >
                      {statusMap[task.status]?.text || task.status}
                    </span>
                  </div>
                  <div className="task-row">
                    <span className="task-label">Task ID:</span>
                    <span className="task-value strong">{task.task_id}</span>
                  </div>
                  <div className="task-row">
                    <span className="task-label">Deadline:</span>
                    <span className="task-value danger">
                      {formatDateDMY(task.deadline)}
                    </span>
                  </div>
                  <div className="task-row">
                    <span className="task-label">Description:</span>
                    <span className="task-value">
                      {task.work_description}
                    </span>
                  </div>
                  <div className="task-row">
                    <span className="task-label">Department:</span>
                    <span className="task-value">
                      {task.department_name || "-"}
                    </span>
                  </div>
                  <div className="task-row">
                    <span className="task-label">Report File:</span>
                    <span className="task-value">
                      {task.report_file ? (
                        <>
                          <button
                            style={{ marginRight: 6 }}
                            onClick={() =>
                              window.open(
                                server() + `/uploads/${task.report_file}`,
                                "_blank"
                              )
                            }
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDownload(task.report_file)}
                          >
                            Download
                          </button>
                        </>
                      ) : (
                        "-"
                      )}
                    </span>
                  </div>
                  <div className="task-row">
                    <span className="task-label">Report Description:</span>
                    <span className="task-value">
                      {task.report_description || "-"}
                    </span>
                  </div>
                </div>

                {/* --- Report Submission Form --- */}
                <div className="task-report-block" style={{ marginTop: 15 }}>
                  <form
                    onSubmit={(e) => handleReportSubmit(task.id, e)}
                    className="report-form-row"
                  >
                    <div className="report-file-row">
                      <label className="report-file-label">
                        Upload Report
                      </label>
                      <input
                        type="file"
                        name="report_file"
                        accept=".pdf,.doc,.docx,.jpg,.png"
                        className="report-file-input"
                      />
                    </div>
                    <div className="report-desc-label">
                      Report Description
                    </div>
                    <textarea
                      name="report_description"
                      rows="2"
                      placeholder="Provide a brief description..."
                      className="report-desc-textarea"
                    ></textarea>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        marginTop: "12px",
                      }}
                    >
                      <button type="submit" className="submit-btn">
                        Submit
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ))
          )}
        </div>

        {showProfile && (
          <Profile
            uniqueId={uniqueId}
            onClose={() => setShowProfile(false)}
            onProfileUpdate={(n) => setOfficerName(n)}
          />
        )}
      </main>
    </div>
  );
};

export default OfficerDashboard;