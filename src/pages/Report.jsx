import React, { useEffect, useState } from "react";
import "./Report.css";
import { server } from "../server";

const Report = () => {
  const [reports, setReports] = useState([]);
  const [approveId, setApproveId] = useState(null);
  const [message, setMessage] = useState("");
  const [remarkValues, setRemarkValues] = useState({});

  useEffect(() => {
    fetch(server() + "/department_tasks")
      .then(res => res.json())
      .then(data => {
        // ✅ newest first
        const sorted = [...data].sort((a, b) => (b.id || 0) - (a.id || 0));
        setReports(sorted);

        // init remarks
        const remarkMap = {};
        sorted.forEach(r => {
          remarkMap[r.id] = r.remark || "";
        });
        setRemarkValues(remarkMap);
      });
  }, [approveId]);

  const handleApprove = async (id) => {
    setMessage("");
    try {
      const remark = remarkValues[id] || "";

      // Save remark
      await fetch(server() + `/department_tasks/remark/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remark })
      });

      // Approve
      const res = await fetch(server() + `/department_tasks/approve/${id}`, { method: "PUT" });
      const data = await res.json();
      setMessage(data.message);
      setApproveId(id);
    } catch {
      setMessage("Approval failed / अनुमोदन विफल");
    }
  };

  // ✅ status badge helper
  const renderStatus = (status) => {
    const normalized = status?.toLowerCase().replace("_", "-");
    switch (normalized) {
      case "pending":
        return <span className="badge pending">Pending / लंबित</span>;
      case "in-progress":
        return <span className="badge in-progress">In-Progress / प्रगति में</span>;
      case "resolved":
        return <span className="badge resolved">Resolved / हल</span>;
      case "overdue":
        return <span className="badge overdue">Overdue / विलंबित</span>;
      default:
        return <span className="badge unknown">-</span>;
    }
  };

  return (
    <div className="report-root">
      <main>
        <div className="report-table-wrapper">
          <h2 className="report-title">Report View & Approval / रिपोर्ट देखें एवं अनुमोदन करे</h2>
          <table className="report-table">
            <thead>
              <tr>
                <th>Department / विभाग</th>
                <th>Letter ID / पत्र क्रमांक</th>
                <th>Report Description / रिपोर्ट विवरण</th>
                <th>Report File / रिपोर्ट फ़ाइल</th>
                <th>Status / स्थिति</th>
                <th>Remark / टिप्पणी</th>
                <th style={{ textAlign: "center" }}>Actions / कार्रवाई</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r, i) => (
                <tr key={r.id || i}>
                  <td>{r.department_name} ({r.dept_id})</td>
                  <td>{r.letter_id}</td>
                  <td>{r.report_description || "-"}</td>
                  <td>
                    {r.report_file
                      ? <a href={`/uploads/${r.report_file}`} target="_blank" rel="noopener noreferrer" className="download-link">Download</a>
                      : "-"}
                  </td>
                  <td>{renderStatus(r.status)}</td>
                  <td>
                    {r.status?.toLowerCase().includes("resolved") ? (
                      <span>{r.remark || "-"}</span>
                    ) : (
                      <textarea
                        value={remarkValues[r.id] || ""}
                        onChange={e => setRemarkValues({ ...remarkValues, [r.id]: e.target.value })}
                        placeholder="Enter remark / टिप्पणी लिखें"
                        className="remark-box"
                      />
                    )}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {r.status?.toLowerCase().includes("resolved")
                      ? <button className="btn approved" disabled>Approved / अनुमोदित</button>
                      : <button className="btn approve" onClick={() => handleApprove(r.id)}>Approve / अनुमोदित करें</button>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {message && <div className="success-msg">{message}</div>}
        </div>
      </main>
    </div>
  );
};

export default Report;







