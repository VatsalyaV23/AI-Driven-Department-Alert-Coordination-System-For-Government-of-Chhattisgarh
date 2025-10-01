import React, { useState, useEffect } from "react";
import logo from "../components/logo.png";
import bg from "../components/bg.jpg";
import Profile from "./Profile";
import PDFViewerModal from "../components/PDFViewerModal";
import "./AdminDashboard.css";
import { server } from "../server";

const statusMap = {
  pending: { text: "Pending", color: "#dc3545", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  in_progress: { text: "In-Progress", color: "#ffc107", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  resolved: { text: "Resolved", color: "#28a745", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
  overdue: { text: "Overdue", color: "#e53935", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" }
};

function formatDate(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d)) return dateString;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

const API = server(); // change if backend URL different

const AdminDashboard = () => {
  const [departments, setDepartments] = useState([]);
  const [letters, setLetters] = useState([]);
  const [, setAdminName] = useState("");
  const [uniqueId] = useState(localStorage.getItem("unique_id"));
  const [showProfile, setShowProfile] = useState(false);

  // Nodal verification modal
  const [showNodalVerification, setShowNodalVerification] = useState(false);
  const [nodalList, setNodalList] = useState([]);
  const [verifyingId, setVerifyingId] = useState(null);

  // Notification count for nodal requests
  const [nodalNotification, setNodalNotification] = useState(0);

  // Filters
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedDeadline, setSelectedDeadline] = useState("");
  const [filteredLetters, setFilteredLetters] = useState([]);

  // PDF modal state
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfFileUrl, setPdfFileUrl] = useState("");

  useEffect(() => {
    fetch(`${API}/departments`)
      .then(res => res.json())
      .then(setDepartments);

    fetch(`${API}/department_tasks`)
      .then(res => res.json())
      .then(data => {
        setLetters(data);
        setFilteredLetters(data);
      });

    if (uniqueId) {
      fetch(`${API}/admin/${uniqueId}`)
        .then(res => res.json())
        .then(data => setAdminName(data?.name + (data?.surname ? " " + data.surname : "")));
    }

    fetch(`${API}/unverified-nodals`)
      .then(res => res.json())
      .then(list => setNodalNotification(list.length));
  }, [uniqueId]);

  const fetchUnverifiedNodals = () => {
    fetch(`${API}/unverified-nodals`)
      .then(res => res.json())
      .then(list => {
        setNodalList(list);
        setNodalNotification(list.length);
      });
  };

  const totals = {
    total: letters.length,
    pending: letters.filter(l => l.status === "pending").length,
    inProcess: letters.filter(l => l.status === "in_progress").length,
    resolved: letters.filter(l => l.status === "resolved").length,
    overdue: letters.filter(l =>
      l.deadline && new Date(l.deadline) < new Date() && l.status !== "resolved"
    ).length
  };

  const applyFilters = () => {
    let filtered = [...letters];
    if (selectedDepartment) {
      filtered = filtered.filter(l =>
        l.department_name === selectedDepartment || l.name === selectedDepartment
      );
    }
    if (selectedStatus) {
      if (selectedStatus === "overdue") {
        filtered = filtered.filter(l =>
          l.deadline && new Date(l.deadline) < new Date() && l.status !== "resolved"
        );
      } else {
        filtered = filtered.filter(l => l.status === selectedStatus);
      }
    }
    if (selectedDeadline) {
      filtered = filtered.filter(l =>
        formatDate(l.deadline) === formatDate(selectedDeadline)
      );
    }
    setFilteredLetters(filtered);
  };
  const resetFilters = () => {
    setSelectedDepartment("");
    setSelectedStatus("");
    setSelectedDeadline("");
    setFilteredLetters(letters);
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  const handleAdminProfile = () => setShowProfile(true);

  const dashboardStyle = {
    minHeight: "100vh",
    background: `url(${bg}) no-repeat center center fixed`,
    backgroundSize: "cover",
  };

  const renderStatus = s => {
    const statusObj = statusMap[s] || { text: s, color: "#222" };
    return <span style={{ color: statusObj.color, fontWeight: 700 }}>{statusObj.text}</span>;
  };

  const cardBlocks = [
    {
      label: "Total Letters / कुल पत्र",
      value: totals.total,
      color: "#137fec",
      icon: statusMap.pending.icon
    },
    {
      label: "Pending Letters /लंबित पत्र",
      value: totals.pending,
      color: "#dc3545",
      icon: statusMap.pending.icon
    },
    {
      label: "In-Process Letters /पत्र पर कार्यवाही जारी",
      value: totals.inProcess,
      color: "#ffc107",
      icon: statusMap.in_progress.icon
    },
    {
      label: "Resolved Letters /हल किए गए पत्र",
      value: totals.resolved,
      color: "#28a745",
      icon: statusMap.resolved.icon
    },
    {
      label: "Overdue Letters /समय सीमा समाप्त पत्र",
      value: totals.overdue,
      color: "#e53935",
      icon: statusMap.overdue.icon,
      extraStyle: { background: "#fff2f2" }
    }
  ];

  const handleVerifyNodal = nodalId => {
    setVerifyingId(nodalId);
    fetch(`${API}/admin/verify-nodal/${nodalId}`, {
      method: "POST"
    })
      .then(res => res.json())
      .then(resp => {
        fetchUnverifiedNodals();
        setVerifyingId(null);
        alert(resp.message || "Nodal Verified!");
      });
  };

  function calcDaysLeft(deadline) {
    if (!deadline) return "";
    const d = new Date(deadline);
    const today = new Date();
    const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
    if (isNaN(diff)) return "";
    return diff >= 0 ? diff : "Expired";
  }

  const handleDenyNodal = (nodalId) => {
  if (!window.confirm("Are you sure you want to deny this nodal request?")) return;

  fetch(`${API}/admin/deny-nodal/${nodalId}`, {
    method: "DELETE"
  })
    .then(res => res.json())
    .then(resp => {
      // Remove from UI immediately
      setNodalList(prev => prev.filter(n => n.id !== nodalId));
      setNodalNotification(prev => Math.max(0, prev - 1));
      alert(resp.message || "Nodal denied!");
    })
    .catch(err => console.error("Error denying nodal:", err));
  };

  // Download helper to force download (handles CORS issues on some browsers)
  const handleDownload = (file) => {
    fetch(`${API}/uploads/${file}`)
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = file;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      });
  };

  // Only allow PDF to open in viewer, otherwise open in new tab
  const handleView = (file) => {
    if (file.toLowerCase().endsWith(".pdf")) {
      setPdfFileUrl(`${API}/uploads/${file}`);
      setPdfModalOpen(true);
    } else {
      window.open(`${API}/uploads/${file}`, "_blank");
    }
  };

  return (
    <div className="dashboard-container" style={dashboardStyle}>
      <header className="dashboard-header">
        <div className="header-left">
          <img className="header-logo" src={logo} alt="Logo" />
          <h1 className="header-title" style={{ fontSize: "2.4rem", letterSpacing: "3px" }}>Alert</h1>
        </div>
        <nav className="header-nav">
          <button className="active">डैशबोर्ड</button>
          <button className="nav-btn" onClick={() => {
            setShowNodalVerification(true);
            fetchUnverifiedNodals();
          }} style={{ position: "relative" }}>
            नोडल सत्यापन
            {nodalNotification > 0 && (
              <span className="nodal-badge">{nodalNotification}</span>
            )}
          </button>
        </nav>
        <div className="header-right">
          <button className="admin-btn" onClick={handleAdminProfile}>
            प्रोफ़ाइल
          </button>
          <button className="logout-btn" onClick={handleLogout}>लॉग आउट</button>
        </div>
      </header>
      <main className="dashboard-main">
        <h2>Admin Dashboard / व्यवस्थापक डैशबोर्ड</h2>
        <div className="cards-container cards-container-row">
          {cardBlocks.map((card, i) => (
            <div
              className={`card${card.label === "Overdue Letters" ? " overdue-card" : ""}`}
              key={i}
              style={{
                borderLeftColor: card.color,
                ...(card.extraStyle || {}),
                minWidth: "200px",
                height: "110px"
              }}
            >
              <div className="card-icon" style={{ background: card.color + "22", color: card.color }}>
                <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d={card.icon} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                </svg>
              </div>
              <div>
                <p>{card.label}</p>
                <h3>{card.value}</h3>
              </div>
            </div>
          ))}
        </div>
        <div className="filters">
          <div className="filter">
            <label>Department / विभाग</label>
            <select
              value={selectedDepartment}
              onChange={e => setSelectedDepartment(e.target.value)}
            >
              <option value="">सभी विभाग</option>
              {departments.map(dep => (
                <option key={dep.id} value={dep.name}>{dep.name}</option>
              ))}
            </select>
          </div>
          <div className="filter">
            <label>Status / स्थिति</label>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
            >
              <option value="">All / सभी</option>
              <option value="pending">लंबित</option>
              <option value="in_progress">प्रगति में</option>
              <option value="resolved">हल किए गए</option>
              <option value="overdue">समय सीमा समाप्त</option>
            </select>
          </div>
          <div className="filter">
            <label>Deadline / अंतिम तारीख</label>
            <input
              type="date"
              value={selectedDeadline}
              onChange={e => setSelectedDeadline(e.target.value)}
              style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "1rem" }}
            />
          </div>
          <button className="filter-btn" onClick={applyFilters}>फ़िल्टर</button>
          <button className="filter-btn" style={{ background: "#eee", color: "#137fec" }} onClick={resetFilters}>Clear</button>
        </div>
        <div className="letters-table letters-table-free">
          <table>
            <thead>
              <tr>
                <th>क्रमांक</th>
                <th>विभाग का नाम</th>
                <th>पत्र दिनांक</th>
                <th>पत्र क्रमांक</th>
                <th>विषय</th>
                <th>द्वारा पत्र जारी</th>
                <th>को सम्बोधित पत्र प्रेषित</th>
                <th>संबंधित विभाग को कार्यवाही हेतु भेजा गया</th>
                <th>Letter File</th>
                <th>Days Left</th>
                <th>अंतिम तारीख</th>
                <th>Date Raised</th>
                <th>Date Resolved</th>
                <th>स्थिति</th>
                <th>Report File</th>
                <th>कार्यवाही विवरण</th>
                <th>रिमार्क</th>
              </tr>
            </thead>
            <tbody>
              {filteredLetters.map((letter, idx) => (
                <tr key={letter.id || idx}>
                  <td>{idx + 1}</td>
                  <td>{letter.department_name} ({letter.dept_id})</td>
                  <td>{formatDate(letter.letter_date)}</td>
                  <td>{letter.letter_id}</td>
                  <td>{letter.subject}</td>
                  <td>{letter.assigned_by}</td>
                  <td>{letter.addressed_to}</td>
                  <td>{letter.assigned_to}</td>
                  <td>
                    {letter.letter_file
                      ? <>
                          <button style={{marginRight:6}} onClick={() => handleView(letter.letter_file)}>View</button>
                          <button onClick={() => handleDownload(letter.letter_file)}>Download</button>
                        </>
                      : "-"}
                  </td>
                  <td>
                    {letter.days_left !== undefined && letter.days_left !== null
                      ? letter.days_left
                      : calcDaysLeft(letter.deadline)}
                  </td>
                  <td>{formatDate(letter.deadline)}</td>
                  <td>{formatDate(letter.date_raised)}</td>
                  <td>{formatDate(letter.date_resolved)}</td>
                  <td>{renderStatus(letter.status)}</td>
                  <td>
                    {letter.report_file
                      ? <>
                          <button style={{marginRight:6}} onClick={() => handleView(letter.report_file)}>View</button>
                          <button onClick={() => handleDownload(letter.report_file)}>Download</button>
                        </>
                      : "-"}
                  </td>
                  <td>{letter.report_description}</td>
                  <td>{letter.remark}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PDFViewerModal open={pdfModalOpen} fileUrl={pdfFileUrl} onClose={() => setPdfModalOpen(false)} />
        {showProfile && (
          <Profile
            uniqueId={uniqueId}
            onClose={() => setShowProfile(false)}
            onProfileUpdate={n => setAdminName(n)}
          />
        )}
        {showNodalVerification && (
          <div className="nodal-verification-modal">
            <div className="modal-content">
              <button className="close-modal" onClick={() => setShowNodalVerification(false)}>×</button>
              <h2>Nodal Verification / नोडल सत्यापन</h2>
              <table className="nodal-table">
                <thead>
                  <tr>
                    <th>Name /नाम</th>
                    <th>Surname /उपनाम</th>
                    <th>Email /ईमेल</th>
                    <th>Mobile /मोबाइल</th>
                    <th>Unique ID /अद्वितीय आईडी</th>
                    <th>Password /पासवर्ड</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {nodalList.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: '#888' }}>No nodal requests /कोई नोडल सत्यापन नहीं</td>
                    </tr>
                  )}
                  {nodalList.map(nodal => (
                    <tr key={nodal.id}>
                      <td>{nodal.name}</td>
                      <td>{nodal.surname}</td>
                      <td>{nodal.email}</td>
                      <td>{nodal.mobile}</td>
                      <td>{nodal.unique_id}</td>
                      <td>{nodal.temp_password || "N/A"}</td>
                      <td>
                        <button
                          className="verify-btn"
                          disabled={!!verifyingId}
                          onClick={() => handleVerifyNodal(nodal.id)}
                        >
                          {verifyingId === nodal.id ? "Verifying..." : "Verify"}
                        </button>
                        <button
                          className="deny-btn"
                          onClick={() => handleDenyNodal(nodal.id)}
                        >
                          Deny
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;