import React, { useState } from "react";
import "./Register.css";
import logo from "../components/logo.png";
import bg from "../components/bg.jpg";
import axios from "axios";
import { server } from "../server";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    surname: "",
    mobile: "",
    email: ""
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false); // 🔹 New loading state

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true); // 🔹 Start loading
    try {
      const res = await axios.post(server() + '/register', form);
      setMessage(res.data.message);
      setForm({ name: "", surname: "", mobile: "", email: "" });
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.message || "Error occurred");
    } finally {
      setLoading(false); // 🔹 Stop loading
    }
  };

  // ✅ English ↔ Hindi field labels
  const fieldLabels = {
    name: "Name / नाम",
    surname: "Surname / उपनाम",
    mobile: "Mobile / मोबाइल",
    email: "Email / ईमेल"
  };

  return (
    <div
      className="register-page"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}
    >
      <main className="register-main">
        <div className="register-card">
          <div className="logoRow">
            <img src={logo} alt="Government Seal" className="register-logo" />
          </div>
          <h2 className="register-title">Nodal Officer Registration</h2>
          <p className="register-subtitle">नोडल अधिकारी पंजीकरण</p>

          <form className="register-form" onSubmit={handleSubmit}>
            {Object.keys(fieldLabels).map((field) => (
              <div className="formGroup" key={field}>
                <label htmlFor={field}>{fieldLabels[field]}</label>
                <input
                  id={field}
                  name={field}
                  type={field === "email" ? "email" : "text"}
                  value={form[field]}
                  placeholder={`Enter your ${field}`}
                  onChange={handleChange}
                  required
                />
              </div>
            ))}

            <button type="submit" className="btn-register" disabled={loading}>
              {loading ? "Registering..." : "Register / पंजीकरण करें"}
            </button>
          </form>

          {message && <p className="register-message">{message}</p>}

          <p className="register-footer">
            Already have an account?{" "}
            <a href="/login" className="footer-link">
              Login
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
