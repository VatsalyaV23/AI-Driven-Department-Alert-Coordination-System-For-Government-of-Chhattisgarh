import React, { useState, useEffect } from "react";
import "./AddDepartment.css";
import {server} from "../server";

const AddDepartment = () => {
  const [form, setForm] = useState({
    name: "",
    head: "",
    email: "",
    mobile_no: "",
    address: ""
  });
  const [message, setMessage] = useState("");
  const [departments, setDepartments] = useState([]);
  const [createdDeptId, setCreatedDeptId] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");

  useEffect(() => {
    fetch(server() + "/departments")
      .then((res) => res.json())
      .then(setDepartments)
      .catch(() => setDepartments([]));
  }, [message]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // Submit department registration
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setCreatedDeptId("");
    setShowOtp(false);

    try {
      const res = await fetch(server() + "/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setMessage(data.message);

      if (data.dept_id) {
        setCreatedDeptId(data.dept_id);
        setShowOtp(true); // Show OTP input
      }

      if (res.ok) {
        setForm({
          name: "",
          head: "",
          email: "",
          mobile_no: "",
          address: "",
        });
      }
    } catch {
      setMessage("Network error / नेटवर्क त्रुटि");
    }
  };

  // Verify OTP
  const handleOtpVerify = async () => {
    if (!otp) {
      setMessage("Please enter OTP / कृपया OTP दर्ज करें");
      return;
    }
    try {
      const res = await fetch(server()+"/verify-department", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dept_id: createdDeptId, otp }),
      });
      const data = await res.json();
      setMessage(data.message);

      if (res.ok) {
        setShowOtp(false);
        setOtp("");
        setCreatedDeptId("");
      }
    } catch {
      setMessage("OTP verification failed / OTP सत्यापन विफल");
    }
  };

  return (
    <div className="add-department-root">
      <main>
        <div className="form-card">
          <h1>नया विभाग जोड़ें</h1>

          {/* Step 1: Registration Form */}
          {!showOtp && (
            <form className="department-form" onSubmit={handleSubmit}>
              <div className="form-row full">
                <label>Department Name / विभाग का नाम</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g., लोक निर्माण विभाग"
                />
              </div>
              <div className="form-row two-cols">
              <div>
                <label>Head Name / विभाग अध्यक्ष का नाम</label>
                <input
                  name="head"
                  value={form.head}
                  onChange={handleChange}
                  required
                  placeholder="e.g., राम कुमार"
                />
              </div>
              <div>
                <label>Email / ईमेल</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="e.g., head.pwd@gov.in"
                />
              </div>
            </div>
              <div className="form-row">
                <label>Mobile No. / मोबाइल नंबर</label>
                <input
                  name="mobile_no"
                  value={form.mobile_no}
                  onChange={handleChange}
                  required
                  placeholder="e.g., 9876543210"
                />
              </div>
              <div className="form-row full">
                <label>Address / पता</label>
                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  rows="4"
                  placeholder="Enter full address of the department / विभाग का पूरा पता दर्ज करें"
                ></textarea>
              </div>
              <div className="form-actions">
                <button type="submit">Add Department / विभाग जोड़ें</button>
              </div>
            </form>
          )}

          {/* Step 2: OTP Verification */}
          {showOtp && (
            <div className="otp-card">
              <h3>Enter OTP / OTP दर्ज करें</h3>
              <p>
                An OTP has been sent to your email. Please enter it below to
                verify your department.
              </p>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                maxLength="6"
              />
              <div className="form-actions">
                <button onClick={handleOtpVerify}>Verify OTP / OTP सत्यापित करें</button>
              </div>
            </div>
          )}

          {createdDeptId && !showOtp && (
            <div
              className="form-message"
              style={{ color: "#137fec", fontWeight: 600 }}
            >
              Department Created! / विभाग बनाया गया! Department ID / विभाग आईडी:{" "}
              {createdDeptId}
            </div>
          )}

          {message && <div className="form-message">{message}</div>}
        </div>

        {/* Departments Table */}
        <div className="department-table-wrapper">
          <h2>Departments List / विभागों की सूची</h2>
          <table className="department-table">
            <thead>
              <tr>
                <th>Sr. No. / क्रम संख्या</th>
                <th>Department ID / विभाग आईडी</th>
                <th>Name / नाम</th>
                <th>Head / प्रमुख</th>
                <th>Email / ईमेल</th>
                <th>Mobile / मोबाइल</th>
                <th>Address / पता</th>
                <th>Status / स्थिति</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dep, idx) => (
                <tr key={dep.id}>
                  <td>{idx + 1}</td>
                  <td>{dep.dept_id}</td>
                  <td>{dep.name}</td>
                  <td>{dep.head}</td>
                  <td>{dep.email}</td>
                  <td>{dep.mobile_no}</td>
                  <td>{dep.address}</td>
                  <td>
                    {dep.is_verified
                      ? "Verified / सत्यापित"
                      : "Pending Verification / सत्यापन लंबित"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ height: "64px" }} />
      </main>
    </div>
  );
};

export default AddDepartment;
