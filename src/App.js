import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import DepartmentDashboard from "./pages/DepartmentDashboard";
import OfficerDashboard from "./pages/OfficerDashboard";
import AssignTask from "./pages/AssignTask";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin_dashboard" element={<AdminDashboard />} />
        <Route path="/department_dashboard" element={<DepartmentDashboard />} />
        <Route path="/officer_dashboard" element={<OfficerDashboard />} />
        <Route path="/assign-task" element={<AssignTask />} />
      </Routes>
    </Router>
  );
}

export default App;
