import React, { useState } from "react";
import "./Profile.css";
import { server } from "../server";

export default function Profile({ onClose }) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({
    unique_id: "",
    email: "",
    newPassword: "",
    confirmPassword: "",
    otp: "",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setProfile({ ...profile, [e.target.name]: e.target.value });

  // Step 1: Request OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setMessage("");

    if (profile.newPassword !== profile.confirmPassword) {
      setMessage("Passwords do not match / पासवर्ड मेल नहीं खाते");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(server() + "/profile/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: profile.unique_id,
          email: profile.email,
        }),
      });
      const data = await res.json();
      setLoading(false);
      if (res.ok) {
        setMessage("OTP sent to email / ओटीपी ईमेल पर भेजा गया");
        setStep(2);
      } else {
        setMessage(data.message || "Failed to send OTP / ओटीपी भेजने में विफल");
      }
    } catch {
      setLoading(false);
      setMessage("Network error / नेटवर्क त्रुटि");
    }
  };

  // Step 2: Verify OTP & Update Password
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch(server() + "/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: profile.unique_id,
          email: profile.email,
          newPassword: profile.newPassword,
          otp: profile.otp,
        }),
      });
      const data = await res.json();
      setLoading(false);
      if (res.ok) {
        setMessage("Profile updated successfully! / प्रोफ़ाइल अपडेट हो गई!");
        setStep(3);
      } else {
        setMessage(
          data.message || "OTP verification failed / ओटीपी सत्यापन विफल"
        );
      }
    } catch {
      setLoading(false);
      setMessage("Network error / नेटवर्क त्रुटि");
    }
  };

  return (
    <div className="profile-modal">
      <div className="profile-modal-content small">
        {/* ❌ Close button */}
        <button className="profile-modal-close" onClick={onClose}>
          &times;
        </button>

        <h2>Update Profile / प्रोफ़ाइल अपडेट करें</h2>

        {/* Step 1: Enter details */}
        {step === 1 && (
          <form onSubmit={handleSendOtp}>
            <label>
              Unique ID / यूनिक आईडी
              <input
                name="unique_id"
                value={profile.unique_id}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Email / ईमेल
              <input
                name="email"
                type="email"
                value={profile.email}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              New Password / नया पासवर्ड
              <input
                name="newPassword"
                type="password"
                value={profile.newPassword}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Confirm Password / पासवर्ड पुष्टि करें
              <input
                name="confirmPassword"
                type="password"
                value={profile.confirmPassword}
                onChange={handleChange}
                required
              />
            </label>
            <button type="submit" disabled={loading}>
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
            {message && <div className="profile-modal-message">{message}</div>}
          </form>
        )}

        {/* Step 2: Verify OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp}>
            <label>
              Enter OTP / ओटीपी दर्ज करें
              <input
                name="otp"
                value={profile.otp}
                onChange={handleChange}
                required
              />
            </label>
            <button type="submit" disabled={loading}>
              {loading ? "Verifying..." : "Verify & Update"}
            </button>
            {message && <div className="profile-modal-message">{message}</div>}
          </form>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="profile-modal-message success">{message}</div>
        )}
      </div>
    </div>
  );
}
