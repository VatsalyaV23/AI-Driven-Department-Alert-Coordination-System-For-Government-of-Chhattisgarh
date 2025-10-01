import React, { useState, useEffect } from "react";
import "./AddOfficer.css";
import { server } from "../server";

function AddOfficer({ onAdded }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone_no: "",
    designation: "",
    dept_id: "",
  });
  const [message, setMessage] = useState("");
  const [, setOfficers] = useState([]);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [pendingOfficer, setPendingOfficer] = useState(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [, setLoading] = useState(false);

  // Helper for consistent JSON response parsing
  async function parseResponse(res) {
    const text = await res.text();
    try {
      return { ok: res.ok, status: res.status, data: JSON.parse(text) };
    } catch {
      return { ok: res.ok, status: res.status, data: { message: text } };
    }
  }

  // Fetch officers for a department
  const fetchOfficers = async (dept_id) => {
    if (!dept_id) {
      setOfficers([]);
      return;
    }

    setLoading(true);
    try {
      const url = server() + `/officers?dept_id=${dept_id}`;
      console.log("Fetching officers from:", url);
      
      const res = await fetch(url);
      const data = await res.json();
      
      console.log("Officers response:", data);
      
      if (data && Array.isArray(data.officers)) {
        setOfficers(data.officers);
        console.log(`Loaded ${data.officers.length} officers for dept_id: ${dept_id}`);
      } else {
        console.warn("Invalid officers response format:", data);
        setOfficers([]);
      }
    } catch (err) {
      console.error("Error fetching officers:", err);
      setOfficers([]);
      setMessage("❌ Error fetching officers: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch officers whenever dept_id changes
  useEffect(() => {
    if (formData.dept_id && formData.dept_id.trim() !== "") {
      fetchOfficers(formData.dept_id.trim());
    } else {
      setOfficers([]);
    }
  }, [formData.dept_id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    // Basic validation
    if (!formData.name || !formData.email || !formData.phone_no || !formData.designation || !formData.dept_id) {
      setMessage("❌ Please fill all required fields");
      return;
    }
    
    setMessage("");
    setShowOtp(false);
    setPendingOfficer(formData);
    setSendingOtp(true);

    try {
      const res = await fetch(server() + "/register-officer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const parsed = await parseResponse(res);
      if (parsed.ok) {
        setMessage(parsed.data.message || "✅ Officer registered. OTP sent.");
        setShowOtp(true);
      } else {
        setMessage(
          parsed.data.message || `❌ Error (${parsed.status}) sending OTP.`
        );
      }
    } catch (err) {
      setMessage("❌ Network error: " + err.message);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    if (e) e.preventDefault();
    
    if (!otp || otp.length !== 6) {
      setMessage("❌ Please enter a valid 6-digit OTP");
      return;
    }
    
    setMessage("");
    setVerifyingOtp(true);

    try {
      const payload = { email: pendingOfficer.email, otp };
      const res = await fetch(server() + "/verify-officer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const parsed = await parseResponse(res);
      if (parsed.data && parsed.data.success) {
        const deptId = pendingOfficer.dept_id;
        setMessage(parsed.data.message || "🎉 Officer verified! Credentials sent.");
        setShowOtp(false);
        setOtp("");
        setPendingOfficer(null);
        setFormData({
          name: "",
          email: "",
          phone_no: "",
          designation: "",
          dept_id: deptId, // Keep the same dept_id
        });
        
        // Refresh officer list after successful registration
        await fetchOfficers(deptId);
        
        if (typeof onAdded === "function") onAdded();
      } else {
        setMessage(parsed.data.message || `❌ OTP verification failed (${parsed.status}).`);
      }
    } catch (err) {
      setMessage("❌ Network error: " + err.message);
    } finally {
      setVerifyingOtp(false);
    }
  };

  return (
    <div className="add-officer-root">
      <main className="container">
        {/* Officer Registration Form */}
        <div className="form-card themed-card">
          <h1 className="form-title">Add Officer / अधिकारी जोड़ें</h1>
          <form onSubmit={handleSubmit} className="officer-form">
            <div className="form-row">
              <label htmlFor="dept_id">Department ID / विभाग आईडी</label>
              <input
                type="text"
                name="dept_id"
                id="dept_id"
                required
                value={formData.dept_id}
                onChange={handleChange}
                placeholder="Enter department ID (e.g. DEPT001) / विभाग आईडी दर्ज करें"
                className="input-field"
              />
            </div>
            <div className="form-row full">
              <label htmlFor="name">Name (नाम)</label>
              <input
                type="text"
                name="name"
                id="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter officer's full name / अधिकारी का पूरा नाम दर्ज करें"
                className="input-field"
              />
            </div>
            <div className="form-row">
              <label htmlFor="email">Email (ईमेल)</label>
              <input
                type="email"
                name="email"
                id="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter officer's email / अधिकारी का ईमेल दर्ज करें"
                className="input-field"
              />
            </div>
            <div className="form-row">
              <label htmlFor="phone_no">Phone (फ़ोन)</label>
              <input
                type="text"
                name="phone_no"
                id="phone_no"
                required
                value={formData.phone_no}
                onChange={handleChange}
                placeholder="Enter phone number / फ़ोन नंबर दर्ज करें"
                className="input-field"
              />
            </div>
            <div className="form-row">
              <label htmlFor="designation">Role / Designation (भूमिका / पद)</label>
              <input
                type="text"
                name="designation"
                id="designation"
                required
                value={formData.designation}
                onChange={handleChange}
                placeholder="Enter role/designation / भूमिका दर्ज करें"
                className="input-field"
              />
            </div>
            <div className="form-actions">
              <button 
                className="btn primary-btn" 
                type="submit"
                disabled={sendingOtp}
              >
                {sendingOtp
                  ? "⏳ Sending OTP..."
                  : "Register & Send OTP / पंजीकरण करें और OTP भेजें"}
              </button>
            </div>
          </form>
          
          {/* OTP Section */}
          {showOtp && pendingOfficer && (
            <div className="otp-section themed-card">
              <div className="otp-left">
                <h2>OTP Verification</h2>
                <p className="small">
                  Officer <b>{pendingOfficer.name}</b> received an OTP at{" "}
                  <b>{pendingOfficer.email}</b>.
                </p>
                <p className="otp-instructions">
                  Enter the OTP you received and click Verify to complete registration.
                </p>
              </div>
              <div className="otp-right">
                <form onSubmit={handleOtpSubmit} className="otp-form">
                  <label htmlFor="otp">Enter OTP</label>
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    placeholder="6-digit OTP"
                    className="input-field"
                  />
                  <div className="form-actions">
                    <button
                      className="btn accent-btn"
                      type="submit"
                      disabled={verifyingOtp}
                    >
                      {verifyingOtp ? "⏳ Verifying OTP..." : "Verify & Complete"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          
          {message && (
            <div
              className={`form-message ${message.includes("❌") ? "error" : "success"}`}
            >
              {message}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default AddOfficer;