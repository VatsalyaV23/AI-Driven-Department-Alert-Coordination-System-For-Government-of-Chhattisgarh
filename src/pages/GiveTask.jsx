import React, { useState, useEffect } from "react";
import "./GiveTask.css";
import { server } from "../server";

const GiveTask = () => {
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({
    letter_id: "",
    subject: "",
    department_id: "",
    assigned_by: "",
    addressed_to: "",
    assigned_to: "",
    letter_date: "",
    deadline: "",
  });
  const [letterFile, setLetterFile] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(server()+"/departments")
      .then((res) => res.json())
      .then(setDepartments);
  }, []);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileChange = (e) => {
    
    const file = e.target.files[0];
    
    
    if (file && file.type === "application/pdf") {
      setLetterFile(file);
      
    } else {
      setLetterFile(null);
      alert("Only PDF files are allowed.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      if (letterFile) formData.append("letter_file", letterFile);

      const res = await fetch(server()+"/department_tasks", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setMessage(data.message);

      if (res.ok) {
        setForm({
          letter_id: "",
          subject: "",
          department_id: "",
          assigned_by: "",
          addressed_to: "",
          assigned_to: "",
          letter_date: "",
          deadline: "",
        });
        setLetterFile(null);
      }
    } catch {
      setMessage("Network error / नेटवर्क त्रुटि");
    }
  };

  return (
    <div className="give-task-root">
      <main>
        <div className="form-card">
          <h2>नया पत्र पंजीकृत करें</h2>
          <form
            className="letter-form"
            onSubmit={handleSubmit}
            encType="multipart/form-data"
          >
            <div className="form-row">
              <label htmlFor="letter_id">Letter ID / पत्र आईडी</label>
              <input
                name="letter_id"
                value={form.letter_id}
                onChange={handleChange}
                placeholder="Letter ID / पत्र आईडी"
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="subject">Subject / विषय</label>
              <input
                name="subject"
                value={form.subject}
                onChange={handleChange}
                placeholder="Subject / विषय"
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="department_id">Department / विभाग</label>
              <select
                name="department_id"
                value={form.department_id}
                onChange={handleChange}
                required
              >
                <option value="">Select Department / विभाग चुनें</option>
                {departments.map((dep) => (
                  <option key={dep.id} value={dep.id}>
                    {dep.name} ({dep.dept_id})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label htmlFor="assigned_by">Assigned By / द्वारा पत्र जारी</label>
              <input
                name="assigned_by"
                value={form.assigned_by}
                onChange={handleChange}
                placeholder="Assigned By / द्वारा पत्र जारी"
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="addressed_to">को सम्बोधित पत्र प्रेषित</label>
              <input
                name="addressed_to"
                value={form.addressed_to}
                onChange={handleChange}
                placeholder="Addressed To / को सम्बोधित पत्र प्रेषित"
              />
            </div>
            <div className="form-row">
              <label htmlFor="assigned_to">संबंधित विभाग को कार्यवाही हेतु भेजा गया</label>
              <input
                name="assigned_to"
                value={form.assigned_to}
                onChange={handleChange}
                placeholder="Assigned To / संबंधित विभाग को कार्यवाही हेतु भेजा गया"
              />
            </div>
            <div className="form-row">
              <label htmlFor="letter_date">Letter Date / पत्र दिनांक</label>
              <input
                name="letter_date"
                value={form.letter_date}
                onChange={handleChange}
                type="date"
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="deadline">Deadline Date / अंतिम तिथि</label>
              <input
                name="deadline"
                value={form.deadline}
                onChange={handleChange}
                type="date"
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="letter_file">Letter File (PDF only)</label>
              <input
                type="file"
                name="letter_file"
                accept="application/pdf"
                onChange={handleFileChange}
              />
            </div>
            <div className="form-actions">
              <button type="submit">Register Letter / पत्र पंजीकृत करें</button>
            </div>
            {message && <div className="form-message">{message}</div>}
          </form>
        </div>
      </main>
    </div>
  );
};

export default GiveTask;
