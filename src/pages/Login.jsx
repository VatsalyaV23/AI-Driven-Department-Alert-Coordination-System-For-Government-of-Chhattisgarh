import React, { useState } from "react";
import "./Login.css";
import logo from "../components/logo.png";
import bg from "../components/bg.jpg";
import { useNavigate } from "react-router-dom";
import ForgotPasswordModal from "./ForgotPasswordModal";
import { server } from "../server";

export default function Login() {
  const [uniqueId, setUniqueId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(server() + "/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unique_id: uniqueId, password }),
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        const { role } = data;
        

        // 🔹 Normal navigation based on role
        if (role === "admin") {
          navigate("/admin_dashboard");
        } else if (role === "nodal" || role === "user") {
          navigate("/dashboard");
        } else if (role === "department") {
          localStorage.setItem("dept_id", data.department_id);
          localStorage.setItem("dept_name", data.department_name || "");
          localStorage.setItem("user_id", data.user_id || "");
          localStorage.setItem("role", role);
          //alert(data.dept.id);
          navigate("/department_dashboard");
        } else if (role === "officer") {
          localStorage.setItem("unique_id", data.unique_id);
          navigate("/officer_dashboard");
        } else {
          setError("Unknown role. Please contact support.");
        }
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.message || "Invalid credentials");
      }
    } catch (err) {
      setError("Network error");
    }
  };

  return (
    <div
      className="login-page"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <main className="login-main">
        <div className="login-card">
          <div className="logoRow">
            <img src={logo} alt="Logo" className="login-logo" />
          </div>
          <h2 className="login-title">
            Alert Login <span className="login-sep">/</span>{" "}
            <span className="login-hi">अलर्ट लॉगिन</span>
          </h2>
          <p className="login-subtitle">
            Access Your Alert Dashboard <span className="login-sep">/</span>{" "}
            <span className="login-hi">अपने अलर्ट डैशबोर्ड तक पहुँचें</span>
          </p>

          <form className="login-form" onSubmit={handleSubmit} autoComplete="off">
            <div className="formGroup">
              <label htmlFor="unique-id">Unique ID / अद्वितीय आईडी</label>
              <input
                id="unique-id"
                name="unique_id"
                type="text"
                required
                value={uniqueId}
                placeholder="Enter your Unique ID"
                onChange={(e) => setUniqueId(e.target.value)}
              />
            </div>
            <div className="formGroup">
              <label htmlFor="password">Password / पासवर्ड</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                placeholder="Enter your Password"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-login">
              Sign in / <span className="login-hi">साइन इन करें</span>
            </button>
            {error && <div className="login-error">{error}</div>}
          </form>

          <div className="login-links">
            <a href="/register" className="login-link">
              Register As a Nodal / नोडल के रूप में पंजीकरण करें
            </a>
            <button
              type="button"
              className="login-link"
              onClick={() => setShowForgot(true)}
            >
              Forgot Password?
            </button>
          </div>

          {showForgot && (
            <ForgotPasswordModal onClose={() => setShowForgot(false)} />
          )}
        </div>
      </main>
    </div>
  );
}