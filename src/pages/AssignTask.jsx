import React, { useState, useEffect } from "react";
import "./AssignTask.css";
import { server } from "../server";

const API = server();
const OFFICER_WORK_API = `${API}/api/officer_work`;

function AssignTask({ tasks }) {
  const [officers, setOfficers] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [selectedOfficerIds, setSelectedOfficerIds] = useState([]);
  const [message, setMessage] = useState("");

  // ✅ Always read departmentId from localStorage
  const departmentId = Number(localStorage.getItem("dept_id"));

  // Fetch officers for department
  useEffect(() => {
    if (!departmentId) return;
    fetch(`${OFFICER_WORK_API}/officers/department/${departmentId}`)
      .then((res) => res.json())
      .then((list) =>
        setOfficers(Array.isArray(list) ? list : list.officers || [])
      )
      .catch(() => setOfficers([]));
  }, [departmentId]);

  // Clear checkboxes when task changes
  useEffect(() => {
    setSelectedOfficerIds([]);
    setMessage("");
  }, [selectedTaskId]);

  const handleOfficerCheckbox = (id) => {
    setSelectedOfficerIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleAssign = async () => {
    setMessage("");

    if (!selectedTaskId) {
      setMessage("Please select a task.");
      return;
    }
    if (!selectedOfficerIds.length) {
      setMessage("Please select at least one officer.");
      return;
    }
    if (!departmentId) {
      setMessage("Department ID missing. Please log in again.");
      return;
    }

    const selectedTask = tasks.find((t) => t.id === Number(selectedTaskId));
    if (!selectedTask) {
      setMessage("Invalid task.");
      return;
    }

    const body = {
      task_id: selectedTask.id,
      department_id: departmentId, // ✅ Always included
      officer_ids: selectedOfficerIds,
      deadline: selectedTask.deadline_raw || selectedTask.deadline
          ? new Date(selectedTask.deadline_raw).toISOString().split("T")[0]
          : new Date(selectedTask.deadline).toISOString().split("T")[0],
      work_title:
        selectedTask.subject || selectedTask.work_title || "Department Task",
      work_description:
        selectedTask.description ||
        selectedTask.work_description ||
        "",
    };

    console.log("AssignTask request body:", body); // 🔍 Debug log

    try {
      const res = await fetch(`${OFFICER_WORK_API}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setMessage("Task assigned to selected officers!");
        setSelectedOfficerIds([]);
      } else {
        setMessage(data.error || "Failed to assign task.");
      }
    } catch (e) {
      setMessage("Server error. Try again.");
    }
  };

  return (
    <div className="assign-task-root">
      <main>
        <div className="form-card">
          <h2>कार्य सौंपें / Assign Task</h2>
          <div className="form-row">
            <label htmlFor="task_select">Select Task / कार्य चुनें</label>
            <select
              name="task_select"
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              required
            >
              <option value="">Select Task / कार्य चुनें</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.subject} (ID: {task.letter_id})
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label>Choose Officers / अधिकारी चुनें:</label>
            <div className="checkbox-list">
              {officers.length === 0 && (
                <span style={{ color: "#a44" }}>
                  No officers registered in this department.
                </span>
              )}
              {officers.length > 0 &&
                officers.map((officer) => (
                  <label key={officer.id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedOfficerIds.includes(officer.id)}
                      onChange={() => handleOfficerCheckbox(officer.id)}
                    />
                    {officer.name} ({officer.designation})
                  </label>
                ))}
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={handleAssign}>
              Assign Task / कार्य सौंपें
            </button>
          </div>
          {message && <div className="form-message">{message}</div>}
        </div>
      </main>
    </div>
  );
}

export default AssignTask;
