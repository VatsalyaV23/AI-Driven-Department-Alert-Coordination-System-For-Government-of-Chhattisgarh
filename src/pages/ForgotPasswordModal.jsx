import React, { useState } from "react";
import "./ForgotPasswordModal.css";
import { server } from "../server";

export default function ForgotPasswordModal({ onClose }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [uniqueId, setUniqueId] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // 1. Request OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch(server() + "/send-forgot-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, unique_id: uniqueId, name }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("OTP sent to your email. / ओटीपी आपके ईमेल पर भेज दिया गया है।");
        setStep(2);
      } else {
        setMessage(data.message || "Error sending OTP. / ओटीपी भेजने में त्रुटि।");
      }
    } catch {
      setMessage("Network error. / नेटवर्क त्रुटि।");
    }
    setLoading(false);
  };

  // 2. Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch(server()+"/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, unique_id: uniqueId, otp }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(
          data.message ||
            "OTP verified! You will receive a temporary password soon. / ओटीपी सत्यापित! आपको जल्द ही अस्थायी पासवर्ड मिलेगा।"
        );
        setStep(3);
      } else {
        setMessage(data.message || "Invalid OTP. / अमान्य ओटीपी।");
      }
    } catch {
      setMessage("Network error. / नेटवर्क त्रुटि।");
    }
    setLoading(false);
  };

  return (
    <div className="forgot-modal-overlay">
      <div className="forgot-modal-card">
        <button className="forgot-modal-close" onClick={onClose}>
          ×
        </button>

        <h2 className="forgot-modal-title">
          Forgot Password / पासवर्ड भूल गए
        </h2>

        {step === 1 && (
          <form onSubmit={handleSendOtp} className="forgot-form">
            <div className="formGroup">
              <label htmlFor="name">Name / नाम</label>
              <input
                id="name"
                type="text"
                placeholder="Enter your name / अपना नाम दर्ज करें"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="forgot-modal-input"
              />
            </div>
            <div className="formGroup">
              <label htmlFor="uniqueId">Unique ID / यूनिक आईडी</label>
              <input
                id="uniqueId"
                type="text"
                placeholder="Enter your Unique ID / अपनी यूनिक आईडी दर्ज करें"
                value={uniqueId}
                onChange={(e) => setUniqueId(e.target.value)}
                required
                className="forgot-modal-input"
              />
            </div>
            <div className="formGroup">
              <label htmlFor="email">Email / ईमेल</label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email / अपना ईमेल दर्ज करें"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="forgot-modal-input"
              />
            </div>
            <button type="submit" className="forgot-modal-btn" disabled={loading}>
              {loading ? "Sending OTP... / ओटीपी भेजा जा रहा है..." : "Send OTP / ओटीपी भेजें"}
            </button>
            {message && <div className="forgot-modal-message">{message}</div>}
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="forgot-form">
            <div className="formGroup">
              <label htmlFor="otp">Enter OTP / ओटीपी दर्ज करें</label>
              <input
                id="otp"
                type="text"
                placeholder="Enter the OTP sent to your email / अपने ईमेल पर भेजा गया ओटीपी दर्ज करें"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                className="forgot-modal-input"
              />
            </div>
            <button type="submit" className="forgot-modal-btn" disabled={loading}>
              {loading ? "Verifying... / सत्यापित किया जा रहा है..." : "Verify OTP / ओटीपी सत्यापित करें"}
            </button>
            {message && <div className="forgot-modal-message">{message}</div>}
          </form>
        )}

        {step === 3 && (
          <div>
            <div className="forgot-modal-success">{message}</div>
            <div className="forgot-modal-info">
              Your temporary password has been sent to your email. / आपका अस्थायी पासवर्ड आपके ईमेल पर भेज दिया गया है।  
              <br />
              Use the temp password to login and change your password. / लॉगिन करने और पासवर्ड बदलने के लिए अस्थायी पासवर्ड का उपयोग करें।
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
