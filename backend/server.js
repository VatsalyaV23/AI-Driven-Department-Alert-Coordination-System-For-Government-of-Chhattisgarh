const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const cors = require("cors");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const multer = require("multer");
const path = require("path");

const app = express();

const allowedOrigins = [
  "http://localhost:3000",   // React web (development)
  "exp://*",                 // Expo Go (React Native dev client)
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like React Native / mobile apps)
    if (!origin) return callback(null, true);

    if (allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

app.use(bodyParser.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const upload = multer({ dest: "uploads/" });

// MySQL Connection
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "anonymous123",
  database: "alert",
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Email Transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "pvssalert123@gmail.com",
    pass: "szsq qyse jmhq pbip"
  }
});
transporter.verify((error, success) => {
  if (error) {
    console.error("SMTP Error:", error);
  } else {
    console.log("SMTP Server is ready to send messages");
  }
});

// Helper: Generate next Department ID
// Utility: Generate next department ID
function getNextDepartmentId(callback) {
  db.query("SELECT dept_id FROM departments ORDER BY id DESC LIMIT 1", (err, results) => {
    if (err) return callback(err);

    let newDeptId = "DEPT001";
    if (results.length > 0) {
      const lastId = results[0].dept_id;
      const num = parseInt(lastId.replace("DEPT", "")) + 1;
      newDeptId = "DEPT" + String(num).padStart(3, "0");
    }
    callback(null, newDeptId);
  });
}

// Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // folder to save PDFs
  },
  filename: function (req, file, cb) {
    // Use letter_id from request body and force .pdf extension
    const letterId = req.body.letter_id;
    cb(null, `${letterId}.pdf`);
  }
});

// File filter to allow only PDFs
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const letterUpload = multer({ storage, fileFilter });

// ----------------------
// Admin Registration (Nodal registration)
// ----------------------
app.post("/register", async (req, res) => {
  const { name, surname, mobile, email } = req.body;
  const unique_id = "NODAL-" + crypto.randomBytes(3).toString("hex").toUpperCase();
  const tempPassword = crypto.randomBytes(4).toString("hex");
  const verifyToken = crypto.randomBytes(20).toString("hex");
  const query = `INSERT INTO admin_table (name, surname, mobile, email, unique_id, temp_password, verify_token, is_admin, is_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)`;
  db.query(query,
    [name, surname, mobile, email, unique_id, tempPassword, verifyToken],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Database error or Email already exists!" });
      }
      db.query("SELECT email FROM admin_table WHERE is_admin = 1 LIMIT 1", (err2, rows) => {
        if (err2 || rows.length === 0) return res.status(500).json({ message: "Main admin not found for approval." });
        const adminEmail = rows[0].email;
        transporter.sendMail({
          from: "pvssalert123@gmail.com",
          to: adminEmail,
          subject: "New Nodal Officer Registration Request",
          html: `<p>Nodal officer registration request:<br>Name: ${name} ${surname}<br>Email: ${email}<br>Mobile: ${mobile}<br>Unique ID: ${unique_id}</p>
          <p>Verify this nodal from your admin dashboard.</p>`
        }, (err3) => {
          if (err3) return res.status(500).json({ message: "Failed to notify main admin." });
          return res.json({ message: "Registration submitted! Main admin will verify you." });
        });
      });
    });
});

// Main admin registration (should be one-time, or you can make a separate route for initial setup)
app.post("/main-admin-setup", async (req, res) => {
  const { name, surname, mobile, email } = req.body;
  const unique_id = "ADMIN-" + crypto.randomBytes(3).toString("hex").toUpperCase();
  const tempPassword = crypto.randomBytes(4).toString("hex");
  // password NULL until changed
  const query = `INSERT INTO admin_table (name, surname, mobile, email, unique_id, temp_password, is_admin, is_verified)
    VALUES (?, ?, ?, ?, ?, ?, 1, 1)`;
  db.query(query,
    [name, surname, mobile, email, unique_id, tempPassword],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Database error or Email already exists!" });
      }
      transporter.sendMail({
        from: "pvssalert123@gmail.com",
        to: email,
        subject: "Main Admin Login Credentials",
        html: `<h3>Main Admin Registered!</h3>
               <p>Your unique ID: <b>${unique_id}</b><br>Temp password: <b>${tempPassword}</b></p>
               <p>Please login and change your password.</p>`
      }, (err2) => {
        if (err2) return res.status(500).json({ message: "Failed to send credentials email" });
        return res.json({ message: "Main admin registered. Check your email." });
      });
    });
});

// Verify email for nodal
app.get("/verify-email", (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ message: "Invalid token" });
  const query = "SELECT * FROM admin_table WHERE verify_token = ?";
  db.query(query, [token], (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (results.length === 0) return res.status(400).json({ message: "Invalid or expired token" });
    const user = results[0];
    const updateQuery = "UPDATE admin_table SET is_verified = 1, verify_token = NULL WHERE id = ?";
    db.query(updateQuery, [user.id], (err2, result) => {
      if (err2) return res.status(500).json({ message: "Database update failed" });
      const mailOptions = {
        from: "pvssalert123@gmail.com",
        to: user.email,
        subject: "Your Nodal Officer Login Credentials",
        html: `<h3>Email Verified!</h3>
               <p>Your account has been successfully verified.</p>
               <p><strong>Unique ID:</strong> ${user.unique_id}</p>
               <p><strong>Password:</strong> ${user.temp_password}</p>
               <p>Please login and change your password immediately.</p>`
      };
      const clearTempPwd = "UPDATE admin_table SET temp_password = NULL WHERE id = ?";
      db.query(clearTempPwd, [user.id]);
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: "Failed to send credentials email" });
        }
        return res.json({ message: "Email verified! Your login credentials have been sent." });
      });
    });
  });
});

// LOGIN (admin, nodal, department, officer)
app.post("/login", async (req, res) => {
  const { unique_id, password } = req.body;

  // 1. Check admin_table first
  db.query("SELECT * FROM admin_table WHERE unique_id = ?", [unique_id], async (err, adminResults) => {
    if (err) {
      console.error("SQL Error (admin_table):", err);
      return res.status(500).json({ message: "Database error: " + err.sqlMessage });
    }

    if (adminResults.length > 0) {
      const admin = adminResults[0];

      // MAIN ADMIN FIRST LOGIN
      if (admin.is_admin === 1 && !admin.password && admin.temp_password) {
        if (password !== admin.temp_password) return res.status(400).json({ message: "Incorrect password" });

        const hashed = await bcrypt.hash(password, 12);
        db.query(
          "UPDATE admin_table SET password = ?, temp_password = NULL WHERE id = ?",
          [hashed, admin.id],
          (err2) => {
            if (err2) return res.status(500).json({ message: "Failed to set password" });
            return res.json({
              success: true,
              role: "admin",
              unique_id: admin.unique_id,
              name: admin.name,
              surname: admin.surname,
              is_admin: 1
            });
          }
        );
        return;
      }

      // MAIN ADMIN SUBSEQUENT LOGIN
      if (admin.is_admin === 1 && admin.password) {
        const valid = await bcrypt.compare(password, admin.password);
        if (!valid) return res.status(400).json({ message: "Incorrect password" });

        return res.json({
          success: true,
          role: "admin",
          unique_id: admin.unique_id,
          name: admin.name,
          surname: admin.surname,
          is_admin: 1
        });
      }

      // NODAL FIRST LOGIN
      if (admin.is_admin === 0 && !admin.password && admin.temp_password) {
        if (password !== admin.temp_password) return res.status(400).json({ message: "Incorrect password" });

        return res.json({
          success: true,
          role: "user",
          unique_id: admin.unique_id,
          name: admin.name,
          surname: admin.surname,
          is_admin: 0,
          must_change: true
        });
      }

      // NODAL SUBSEQUENT LOGIN
      if (admin.is_admin === 0 && admin.password) {
        const valid = await bcrypt.compare(password, admin.password);
        if (!valid) return res.status(400).json({ message: "Incorrect password" });
        if (!admin.is_verified) return res.status(400).json({ message: "Account not verified" });

        return res.json({
          success: true,
          role: "user",
          unique_id: admin.unique_id,
          name: admin.name,
          surname: admin.surname,
          is_admin: 0
        });
      }

      return res.status(400).json({ message: "Incorrect credentials" });
    }

    // 2. Try department login
    db.query("SELECT * FROM departments WHERE dept_id = ?", [unique_id], async (err2, deptResults) => {
      if (err2) {
        console.error("SQL Error (departments):", err2);
        return res.status(500).json({ message: "Database error: " + err2.sqlMessage });
      }

      if (deptResults.length > 0) {
        const dept = deptResults[0];
        const isMatch = await bcrypt.compare(password, dept.password);
        if (!isMatch) return res.status(400).json({ message: "Incorrect password" });
        if (!dept.is_verified) return res.status(400).json({ message: "Email not verified yet" });

        return res.json({
          success: true,
          role: "department",
          dept_id: dept.dept_id,
          department_id: dept.id,
          department_name: dept.name,
          department_head: dept.head,
        });
      }

      // 3. Try officer login
        db.query("SELECT * FROM officers WHERE unique_id = ?", [unique_id], async (err3, officerResults) => {
        if (err3) {
          console.error("SQL Error (officers):", err3);
          return res.status(500).json({ message: "Database error: " + err3.sqlMessage });
        }

        if (!officerResults || officerResults.length === 0) {
          return res.status(400).json({ message: "User not found" });
        }

        const officer = officerResults[0];

        // First Login (temp_password only)
        if (!officer.password && officer.temp_password) {
          if (password !== officer.temp_password) {
            return res.status(400).json({ message: "Incorrect password" });
          }
          return res.json({
            success: true,
            role: "officer",
            officer_id: officer.id,
            unique_id: officer.unique_id,
            name: officer.name,
            email: officer.email,
            designation: officer.designation,
            department_id: officer.department_id,
            must_change: true   // 👈 flag to force password reset
          });
        }

        // Normal Login (after password set)
        if (officer.password) {
          const isMatch = await bcrypt.compare(password, officer.password);
          if (!isMatch) return res.status(400).json({ message: "Incorrect password" });
          if (!officer.is_verified) return res.status(400).json({ message: "Account not verified" });

          return res.json({
            success: true,
            role: "officer",
            officer_id: officer.id,
            unique_id: officer.unique_id,
            name: officer.name,
            email: officer.email,
            designation: officer.designation,
            department_id: officer.department_id
          });
        }

        return res.status(400).json({ message: "Incorrect credentials" });
      });
    });
  });
});

// Temporary in-memory OTP store
const otpStore1 = new Map();

// ✅ Register Department (Send OTP)
app.post("/departments", (req, res) => {
  const { name, head, email, mobile_no, address } = req.body;

  getNextDepartmentId((err, newDeptId) => {
    if (err) return res.status(500).json({ message: "Error generating Department ID" });

    const query = `INSERT INTO departments 
      (name, dept_id, head, email, mobile_no, address, is_verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`;

    db.query(query, [name, newDeptId, head, email, mobile_no, address], (err) => {
      if (err) {
        console.error("DB Insert Error:", err);
        return res.status(500).json({ message: "Database error or email already exists" });
      }

      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000);

      // Always store with string dept_id
      otpStore1.set(String(newDeptId), { otp, expires: Date.now() + 5 * 60 * 1000 });

      console.log("Generated OTP:", otp, "for Dept:", newDeptId);

      // Send OTP email
      const mailOptions = {
        from: "pvssalert123@gmail.com",
        to: email,
        subject: "Verify your Department Registration with OTP",
        html: `<h3>Hello ${head},</h3>
               <p>Your OTP for department verification is:</p>
               <h2>${otp}</h2>
               <p>This OTP will expire in 5 minutes.</p>`
      };

      transporter.sendMail(mailOptions, (error) => {
        if (error) {
          console.error("Email send error:", error);
          return res.status(500).json({ message: "Failed to send OTP email" });
        }
        return res.json({ message: "Registration successful! Please check your email for OTP verification.", dept_id: newDeptId });
      });
    });
  });
});


// ✅ Verify Department using OTP
app.post("/verify-department", (req, res) => {
  const { dept_id, otp } = req.body;

  const record = otpStore1.get(String(dept_id)); // ✅ always string

  console.log("Verifying Dept:", dept_id, "OTP received:", otp, "Stored:", record);

  // 🔹 Check OTP existence
  if (!record) {
    return res.status(400).json({ message: "OTP not found or expired" });
  }

  // 🔹 Check expiration
  if (Date.now() > record.expires) {
    otpStore1.delete(String(dept_id));
    return res.status(400).json({ message: "OTP expired" });
  }

  // 🔹 Compare OTP safely
  if (String(record.otp).trim() !== String(otp).trim()) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  // ✅ OTP verified → delete from store
  otpStore1.delete(String(dept_id));

  // 🔹 Generate temporary password
  const tempPassword = "Temp@" + Math.floor(1000 + Math.random() * 9000);

  bcrypt.hash(tempPassword, 10, (err, hashedPassword) => {
    if (err) {
      return res.status(500).json({ message: "Password hash error" });
    }

    // 🔹 Fetch department email from DB
    db.query("SELECT email FROM departments WHERE dept_id = ?", [dept_id], (err3, result) => {
      if (err3 || result.length === 0) {
        return res.status(500).json({ message: "Could not fetch email" });
      }

      const email = result[0].email;

      // 🔹 Update department as verified
      db.query(
        "UPDATE departments SET is_verified = 1, password = ?, temp_password = ? WHERE dept_id = ?",
        [hashedPassword, tempPassword, dept_id],
        (err2) => {
          if (err2) {
            return res.status(500).json({ message: "Database update failed" });
          }

          // 🔹 Send credentials email
          const mailOptions = {
            from: "pvssalert123@gmail.com",
            to: email,
            subject: "Department Login Credentials",
            html: `<h3>Verification Successful!</h3>
                   <p>Your department account has been verified.</p>
                   <p><strong>Department ID:</strong> ${dept_id}</p>
                   <p><strong>Temporary Password:</strong> ${tempPassword}</p>
                   <p>Please login and change your password immediately.</p>`
          };

          transporter.sendMail(mailOptions, (error) => {
            if (error) {
              console.error("Email send error:", error);
              return res.status(500).json({ message: "Failed to send credentials email" });
            }

            // ✅ Success Response
            return res.json({
              message: "✅ Department verified! Login credentials have been sent to your email.",
              dept_id,
              tempPassword
            });
          });
        }
      );
    });
  });
});

// Change department password
app.put("/departments/change-password", async (req, res) => {
  const { dept_id, oldPassword, newPassword } = req.body;
  db.query("SELECT * FROM departments WHERE dept_id = ?", [dept_id], async (err, results) => {
    if (err || results.length === 0) return res.status(400).json({ message: "Department not found." });
    const department = results[0];
    const valid = await bcrypt.compare(oldPassword, department.password);
    if (!valid) return res.status(400).json({ message: "Old password incorrect." });
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.query("UPDATE departments SET password = ? WHERE dept_id = ?", [hashedPassword, dept_id], (err2, result2) => {
      if (err2) return res.status(500).json({ message: "Update failed." });
      res.json({ message: "Password updated." });
    });
  });
});

// --- Department uploads report file/description ---
app.put("/department_tasks/report/:id", upload.single("report_file"), (req, res) => {
  const { id } = req.params;
  const { report_description, assigned_to } = req.body;
  let report_file = null;
  if (req.file) report_file = req.file.filename;
  const fields = [];
  const params = [];
  if (report_description) { fields.push("report_description=?"); params.push(report_description); }
  if (assigned_to) { fields.push("assigned_to=?"); params.push(assigned_to); }
  if (report_file) { fields.push("report_file=?"); params.push(report_file); }
  params.push(id);
  if (!fields.length) return res.status(400).json({ message: "No report data to update." });
  const q = `UPDATE department_tasks SET ${fields.join(", ")} WHERE id = ?`;
  db.query(q, params, err => {
    if (err) return res.status(500).json({ message: "Failed to update task/report" });
    res.json({ message: "Report submitted!" });
  });
});

// --- Department changes status to in-progress ---
app.put("/department_tasks/inprogress/:id", (req, res) => {
  const { id } = req.params;
  db.query("UPDATE department_tasks SET status='in_progress' WHERE id=?", [id], (err, result) => {
    if (err) return res.status(500).json({ message: "Error changing status" });
    res.json({ message: "Status changed to in-progress!" });
  });
});

// --- Nodal approves (resolved) ---
app.put("/department_tasks/approve/:id", (req, res) => {
  const { id } = req.params;

  const query = `
    UPDATE department_tasks 
    SET status = 'resolved', date_resolved = NOW() 
    WHERE id = ?
  `;

  db.query(query, [id], (err, result) => {
    if (err) {
      console.error("Approval SQL Error:", err);
      return res.status(500).json({ message: "Approval failed" });
    }
    res.json({ message: "Report approved and resolved date recorded" });
  });
});

// Get all departments
app.get("/departments", (req, res) => {
  db.query("SELECT * FROM departments", (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
});

// Temporary OTP store
const profileOtpStore = new Map();

// ============================
// Detect role dynamically from DB
// ============================
async function detectRoleFromDB(uniqueId) {
  return new Promise((resolve, reject) => {
    // 1️⃣ Check in admin_table
    db.query(
      `SELECT unique_id, is_admin FROM admin_table WHERE unique_id=? LIMIT 1`,
      [uniqueId],
      (err, results) => {
        if (err) return reject(err);
        if (results.length > 0) {
          if (results[0].is_admin === 1) {
            return resolve({ role: "main_admin", table: "admin_table", idField: "unique_id" });
          } else {
            return resolve({ role: "nodal", table: "admin_table", idField: "unique_id" });
          }
        }

        // 2️⃣ Check in departments
        db.query(
          `SELECT dept_id FROM departments WHERE dept_id=? LIMIT 1`,
          [uniqueId],
          (err2, results2) => {
            if (err2) return reject(err2);
            if (results2.length > 0) {
              return resolve({ role: "department", table: "departments", idField: "dept_id" });
            }

            // 3️⃣ Check in officer_table
            db.query(
              `SELECT unique_id FROM officer_table WHERE unique_id=? LIMIT 1`,
              [uniqueId],
              (err3, results3) => {
                if (err3) return reject(err3);
                if (results3.length > 0) {
                  return resolve({ role: "officer", table: "officer_table", idField: "unique_id" });
                }

                // ❌ Not found anywhere
                return resolve(null);
              }
            );
          }
        );
      }
    );
  });
}

// ============================
// Step 1: Send OTP
// ============================
app.post("/profile/send-otp", async (req, res) => {
  const { email, id } = req.body;
  if (!email || !id) {
    return res.status(400).json({ message: "Email and Unique ID required" });
  }

  try {
    const roleInfo = await detectRoleFromDB(id);
    if (!roleInfo) {
      return res.status(400).json({ message: "Invalid Unique ID" });
    }

    const { role } = roleInfo;

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    profileOtpStore.set(`${role}_${id}`, {
      otp,
      expires: Date.now() + 5 * 60 * 1000,
    });

    const mailOptions = {
      from: "your-email@gmail.com",
      to: email,
      subject: "Profile Update OTP",
      text: `Your One-Time Password (OTP) is: ${otp}\n\nThis OTP will expire in 5 minutes.`,
    };

    transporter.sendMail(mailOptions, (err) => {
      if (err) {
        console.error("Mail error:", err);
        return res.status(500).json({ message: "Failed to send OTP" });
      }
      res.json({ message: "OTP sent to your email" });
    });
  } catch (err) {
    console.error("Error in role detection:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ============================
// Step 2: Verify OTP & Update
// ============================
app.post("/profile/update", async (req, res) => {
  const { id, email, newPassword, otp } = req.body;
  if (!id || !email || !newPassword || !otp) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const roleInfo = await detectRoleFromDB(id);
    if (!roleInfo) {
      return res.status(400).json({ message: "Invalid Unique ID" });
    }

    const { role, table, idField } = roleInfo;

    const otpKey = `${role}_${id}`;
    const record = profileOtpStore.get(otpKey);
    if (!record) return res.status(400).json({ message: "OTP not requested" });
    if (record.expires < Date.now()) {
      profileOtpStore.delete(otpKey);
      return res.status(400).json({ message: "OTP expired" });
    }
    if (String(record.otp).trim() !== String(otp).trim()) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // OTP verified
    profileOtpStore.delete(otpKey);

    const hashed = await bcrypt.hash(newPassword, 12);

    db.query(
      `UPDATE ${table} SET email=?, password=? WHERE ${idField}=?`,
      [email, hashed, id],
      (err) => {
        if (err) {
          console.error("Update error:", err);
          return res.status(500).json({ message: "Update failed" });
        }
        res.json({ message: "Profile updated successfully" });
      }
    );
  } catch (error) {
    console.error("Hash error:", error);
    res.status(500).json({ message: "Internal error" });
  }
});

// OTP system for forgot password (main admin, nodal, department)
const otpStore = {}; // { email_unique_id: { otp, expires, verified, userType } }
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// ------------------ SEND OTP ------------------
app.post("/send-forgot-otp", (req, res) => {
  const { email, unique_id, name } = req.body;
  if (!email || !unique_id || !name) {
    return res
      .status(400)
      .json({ message: "Name, Email and Unique ID required." });
  }

  // Check admin_table
  db.query(
    "SELECT * FROM admin_table WHERE unique_id = ? AND email = ?",
    [unique_id, email],
    (err, adminRows) => {
      if (err) return res.status(500).json({ message: "Database error" });

      if (adminRows.length > 0) {
        const otp = generateOtp();
        otpStore[email + "_" + unique_id] = {
          otp,
          expires: Date.now() + 10 * 60 * 1000,
          userType: adminRows[0].is_admin === 1 ? "main_admin" : "nodal",
        };

        transporter.sendMail(
          {
            from: "pvssalert123@gmail.com",
            to: email,
            subject: "Your OTP for password reset",
            html: `<p>Your OTP is: <b>${otp}</b></p>`,
          },
          (err2) => {
            if (err2)
              return res.status(500).json({ message: "Failed to send OTP." });
            return res.json({ message: "OTP sent to your email." });
          }
        );
      } else {
        // Check departments table
        db.query(
          "SELECT * FROM departments WHERE dept_id = ? AND email = ?",
          [unique_id, email],
          (err2, depRows) => {
            if (err2) return res.status(500).json({ message: "Database error" });

            if (depRows.length > 0) {
              const otp = generateOtp();
              otpStore[email + "_" + unique_id] = {
                otp,
                expires: Date.now() + 10 * 60 * 1000,
                userType: "department",
              };

              transporter.sendMail(
                {
                  from: "pvssalert123@gmail.com",
                  to: email,
                  subject: "Your OTP for password reset",
                  html: `<p>Your OTP is: <b>${otp}</b></p>`,
                },
                (err3) => {
                  if (err3)
                    return res
                      .status(500)
                      .json({ message: "Failed to send OTP." });
                  return res.json({ message: "OTP sent to your email." });
                }
              );
            } else {
              return res.status(404).json({ message: "User not found." });
            }
          }
        );
      }
    }
  );
});

// ------------------ VERIFY OTP ------------------
app.post("/verify-otp", async (req, res) => {
  try {
    const { email, unique_id, otp } = req.body;
    const key = email + "_" + unique_id;

    if (!otpStore[key])
      return res.status(400).json({ message: "No OTP sent or expired." });
    if (otpStore[key].expires < Date.now())
      return res.status(400).json({ message: "OTP expired." });
    if (otpStore[key].otp !== otp)
      return res.status(400).json({ message: "Incorrect OTP." });

    const userType = otpStore[key].userType;
    delete otpStore[key];

    const tempPwd = crypto.randomBytes(5).toString("hex");

    if (userType === "main_admin" || userType === "nodal") {
      db.query(
        "UPDATE admin_table SET temp_password = ?, password = NULL WHERE unique_id = ?",
        [tempPwd, unique_id],
        (err) => {
          if (err)
            return res.status(500).json({ message: "Error updating password." });

          transporter.sendMail(
            {
              from: "pvssalert123@gmail.com",
              to: email,
              subject: `Your Temp Password (${
                userType === "main_admin" ? "Main Admin" : "Nodal"
              })`,
              html: `<p>Your temp password is: <b>${tempPwd}</b><br>Use this to login and set a new password.</p>`,
            },
            (err2) => {
              if (err2)
                return res
                  .status(500)
                  .json({ message: "Failed to send temp password email." });
              return res.json({
                message: "OTP verified. Temp password sent to your email.",
              });
            }
          );
        }
      );
    } else if (userType === "department") {
      const hashed = await bcrypt.hash(tempPwd, 10);

      db.query(
        "UPDATE departments SET password = ?, is_verified = 1 WHERE dept_id = ?",
        [hashed, unique_id],
        (err) => {
          if (err)
            return res.status(500).json({ message: "Error updating password." });

          transporter.sendMail(
            {
              from: "pvssalert123@gmail.com",
              to: email,
              subject: "Your Temp Password (Department)",
              html: `<p>Your temp password is: <b>${tempPwd}</b><br>Use this to login and set a new password.</p>`,
            },
            (err2) => {
              if (err2)
                return res
                  .status(500)
                  .json({ message: "Failed to send temp password email." });
              return res.json({
                message: "OTP verified. Temp password sent to your email.",
              });
            }
          );
        }
      );
    } else {
      return res.status(400).json({ message: "Unknown user type." });
    }
  } catch (error) {
    console.error("Error in /verify-otp:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
});

// --- Assign officers to a department task ---
app.put("/department_tasks/assign_officer/:taskId", (req, res) => {
  const { taskId } = req.params;
  let { officer_ids } = req.body;

  if (!Array.isArray(officer_ids)) {
    // If it's a string, split it
    officer_ids = typeof officer_ids === "string" ? officer_ids.split(",") : [];
  }

  // Store officer IDs as JSON string in DB
  const officerIdsJson = JSON.stringify(officer_ids);

  db.query(
    "UPDATE department_tasks SET assigned_to=? WHERE id=?",
    [officerIdsJson, taskId],
    (err) => {
      if (err) {
        console.error("DB Error:", err);
        return res.status(500).json({ message: "Failed to assign officers" });
      }
      res.json({ message: "Officers assigned successfully", officer_ids });
    }
  );
});

// --- Department Login ---
app.post("/department-login", (req, res) => {
  const { dept_id, password } = req.body;
  db.query(
    "SELECT * FROM departments WHERE dept_id = ?",
    [dept_id],
    async (err, results) => {
      if (err) return res.status(500).json({ message: "Database error" });
      if (results.length === 0) return res.status(400).json({ message: "Department not found" });
      const department = results[0];
      const isMatch = await bcrypt.compare(password, department.password);
      if (!isMatch) return res.status(400).json({ message: "Incorrect password" });
      if (!department.is_verified) return res.status(400).json({ message: "Email not verified yet" });
      res.json({
        success: true,
        dept_id: department.dept_id,
        department_id: department.id,
        department_name: department.name
      });
    }
  );
});

// --- Officers by department_id (numeric id!) ---
app.get("/officers/department/:department_id", (req, res) => {
  const department_id = req.params.department_id;
  db.query(
    "SELECT id, unique_id, name, email, phone_no, designation, is_verified FROM officers WHERE department_id = ?",
    [department_id],
    (err, results) => {
      if (err) {
        console.error("DB Error:", err);
        return res.status(500).json({ message: "Database error" });
      }
      res.json(results);
    }
  );
});

// --- Add this POST route to handle department task creation ---
app.post('/department_tasks', upload.single('letter_file'), (req, res) => {
  const {
    letter_id,
    subject,
    department_id,
    assigned_by,
    addressed_to,
    assigned_to,
    letter_date,
    deadline,
  } = req.body;

  // Get uploaded file's name, if file was uploaded
  const letter_file = req.file ? req.file.filename : null;

  // Save the new task to the database
  db.query(
    `INSERT INTO department_tasks
      (letter_id, subject, department_id, assigned_by, addressed_to, assigned_to, letter_date, deadline, letter_file)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      letter_id,
      subject,
      department_id,
      assigned_by,
      addressed_to,
      assigned_to,
      letter_date,
      deadline,
      letter_file,
    ],
    (err, result) => {
      if (err) {
        console.error('Error adding department task:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      res.json({ message: 'Letter registered successfully!' });
    }
  );
});

// --- Get Department Tasks (with live days_left calculation + overdue detection + date formatting) ---
app.get("/department_tasks", (req, res) => {
  const { department_id } = req.query;
  let sql = `
    SELECT dt.*, d.dept_id, d.name as department_name 
    FROM department_tasks dt
    JOIN departments d ON dt.department_id = d.id
  `;
  let params = [];
  if (department_id) {
    sql += " WHERE dt.department_id = ?";
    params.push(department_id);
  }
  sql += " ORDER BY dt.created_at DESC"; // Show latest tasks first

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });

    const now = new Date();
    const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

    results.forEach(l => {
      // --- Format deadline (DD-MM-YYYY for frontend, keep raw value too) ---
      if (l.deadline) {
        const deadlineDate = new Date(l.deadline);

        // Convert to DD-MM-YYYY
        const day = String(deadlineDate.getDate()).padStart(2, "0");
        const month = String(deadlineDate.getMonth() + 1).padStart(2, "0");
        const year = deadlineDate.getFullYear();
        l.deadline_raw = l.deadline; // Keep original for sorting/calculation
        l.deadline = `${day}-${month}-${year}`;

        // --- Calculate days_left (using UTC midnight for accuracy) ---
        const deadlineUTC = Date.UTC(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());
        const diffMs = deadlineUTC - todayUTC;
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        l.days_left = diffDays >= 0 ? diffDays : 0;
      } else {
        l.days_left = null;
      }

      // --- Format date_resolved if exists ---
      if (l.date_resolved) {
        const resolvedDate = new Date(l.date_resolved);
        const day = String(resolvedDate.getDate()).padStart(2, "0");
        const month = String(resolvedDate.getMonth() + 1).padStart(2, "0");
        const year = resolvedDate.getFullYear();
        l.date_resolved = `${day}-${month}-${year}`;
      }

      // --- Convert assigned_to back to array for dashboard ---
      if (l.assigned_to) {
        if (Array.isArray(l.assigned_to)) {
          // Already an array, nothing to do
        } else if (typeof l.assigned_to === "string") {
          try {
            // Try to parse JSON string
            const parsed = JSON.parse(l.assigned_to);
            l.assigned_to = Array.isArray(parsed) ? parsed : String(l.assigned_to).split(",").map(s => s.trim()).filter(Boolean);
          } catch {
            // Fallback: split by comma
            l.assigned_to = String(l.assigned_to).split(",").map(s => s.trim()).filter(Boolean);
          }
        } else {
          l.assigned_to = [];
        }
      }

      // --- Mark overdue ---
      if (l.deadline && l.status !== "resolved") {
        // Compare using UTC
        const [day, month, year] = l.deadline.split("-");
        const deadlineDate = new Date(`${year}-${month}-${day}`);
        const deadlineUTC = Date.UTC(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());
        if (deadlineUTC < todayUTC) l.status = "overdue";
      }
    });

    res.json(results);
  });
});

app.get("/admin/:unique_id", (req, res) => {
  const { unique_id } = req.params;
  db.query(
    "SELECT name, surname, email, unique_id, department_id FROM admin_table WHERE unique_id = ?",
    [unique_id],
    (err, results) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (results.length === 0) return res.status(404).json({ error: "Admin not found" });
      res.json(results[0]);
    }
  );
});

// Nodal Verification: lists unverified nodals
app.get("/unverified-nodals", (req, res) => {
  db.query(
    "SELECT id, name, surname, email, mobile, unique_id, temp_password FROM admin_table WHERE is_verified = 0",
    (err, results) => {
      if (err) return res.status(500).json({ message: "Database error" });
      res.json(results);
    }
  );
});

// Admin verifies nodal, sends temp password mail
app.post("/admin/verify-nodal/:nodal_id", (req, res) => {
  const nodalId = req.params.nodal_id;
  db.query("SELECT * FROM admin_table WHERE id = ?", [nodalId], (err, results) => {
    if (err || results.length === 0)
      return res.status(404).json({ message: "Nodal not found" });
    const nodal = results[0];
    if (nodal.is_verified === 1)
      return res.json({ message: "Already verified." });
    db.query(
      "UPDATE admin_table SET is_verified = 1, is_admin = 0 WHERE id = ?",
      [nodalId],
      (err2) => {
        if (err2) return res.status(500).json({ message: "Verification failed." });
        const mailOptions = {
          from: "pvssalert123@gmail.com",
          to: nodal.email,
          subject: "Your Nodal Officer Login Credentials",
          html: `<h3>Email Verified!</h3>
                 <p>Your account has been verified by admin.</p>
                 <p><strong>Unique ID:</strong> ${nodal.unique_id}</p>
                 <p><strong>Password:</strong> ${nodal.temp_password}</p>
                 <p>Please login and change your password immediately.</p>`
        };
        transporter.sendMail(mailOptions, (error) => {
          if (error) return res.status(500).json({ message: "Failed to send credentials email" });
          return res.json({ message: "Nodal verified and credentials sent!" });
        });
      }
    );
  });
});

// Admin denies nodal request
app.delete("/admin/deny-nodal/:nodal_id", (req, res) => {
  const nodalId = req.params.nodal_id;

  db.query("DELETE FROM admin_table WHERE id = ?", [nodalId], (err, result) => {
    if (err) return res.status(500).json({ message: "Failed to deny nodal." });
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Nodal not found." });
    }
    return res.json({ message: "Nodal request denied and removed." });
  });
});


// --- Generate Unique Officer ID ---
function generateOfficerId() {
  return "OFF" + Math.floor(10000 + Math.random() * 90000);
}

// --- Generate Random Password ---
function generatePassword() {
  return Math.random().toString(36).slice(-8); // 8-char random string
}

// --- Officer Login ---
app.post("/officers/login", (req, res) => {
  const { unique_id, password } = req.body;

  db.query("SELECT * FROM officers WHERE unique_id=?", [unique_id], async (err, rows) => {
    if (err || rows.length === 0) {
      return res.status(400).json({ message: "Officer not found" });
    }

    const officer = rows[0];
    if (!officer.is_verified) {
      return res.status(400).json({ message: "Email not verified yet" });
    }

    const isMatch = await bcrypt.compare(password, officer.password);
    if (!isMatch) return res.status(400).json({ message: "Incorrect password" });

    res.json({
      success: true,
      role: "officer",
      officer_id: officer.id,
      unique_id: officer.unique_id,
      name: officer.name,
      designation: officer.designation,
      department_id: officer.department_id
    });
  });
});

// ===============================
// --- DEPARTMENT HEAD DASHBOARD ---
// ===============================
app.get("/department-head-dashboard/:dept_id", (req, res) => {
  const dept_id = req.params.dept_id;
  db.query("SELECT id FROM departments WHERE dept_id=?", [dept_id], (err, deptRows) => {
    if (err || deptRows.length === 0) return res.status(400).json({ message: "Department not found" });
    const department_id = deptRows[0].id;
    db.query("SELECT COUNT(*) as pending FROM department_tasks WHERE department_id=? AND status='pending'", [department_id], (err2, rows) => {
      if (err2) return res.status(500).json({ message: "Error fetching tasks" });
      const pending = rows[0].pending;
      res.json({ pending_tasks: pending });
    });
  });
});

// ====================== OFFICER REGISTRATION & OTP VERIFICATION ======================

const otpStoreofficer = new Map();

app.post("/register-officer", (req, res) => {
  const { name, email, phone_no, designation, dept_id } = req.body;

  if (!name || !email || !phone_no || !designation || !dept_id) {
    return res.status(400).json({ message: "All fields are required" });
  }

  db.query("SELECT id, name FROM departments WHERE dept_id = ?", [dept_id], (err, deptRows) => {
    if (err) return res.status(500).json({ message: "Database error fetching department" });
    if (deptRows.length === 0) return res.status(400).json({ message: "Department not found" });

    const department_id = deptRows[0].id; // ✅ map dept_id to department_id

    db.query("SELECT * FROM officers WHERE email = ?", [email], (err2, rows) => {
      if (err2) return res.status(500).json({ message: "Database error" });
      if (rows.length > 0) {
        return res.status(400).json({
          message: rows[0].is_verified
            ? "Officer already registered & verified."
            : "Officer already registered but not verified. Complete OTP verification."
        });
      }

      const otp = Math.floor(100000 + Math.random() * 900000);
      const verify_token = Math.random().toString(36).slice(-20);

      otpStoreofficer.set(email, {
        otp,
        verify_token,
        expires: Date.now() + 5 * 60 * 1000,
        data: { name, phone_no, designation, department_id } // ✅ save department_id
      });

      transporter.sendMail({
        from: "pvssalert123@gmail.com",
        to: email,
        subject: "OTP Verification",
        html: `<h3>Hello ${name},</h3><p>Your OTP is:</p><h2>${otp}</h2><p>Expires in 5 minutes.</p>`
      }, (error) => {
        if (error) return res.status(500).json({ message: "Failed to send OTP email" });
        return res.json({ message: "OTP sent to email" });
      });
    });
  });
});

// Fix the officer registration to properly handle department_id
app.post("/verify-officer", (req, res) => {
  const { email, otp } = req.body;
  const record = otpStoreofficer.get(email);
  if (!record) return res.status(400).json({ message: "OTP not found or expired" });
  if (Date.now() > record.expires) {
    otpStoreofficer.delete(email);
    return res.status(400).json({ message: "OTP expired" });
  }
  if (String(record.otp).trim() !== String(otp).trim()) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  const { name, phone_no, designation, department_id } = record.data;
  otpStoreofficer.delete(email);

  const unique_id = "OFF" + Math.floor(10000 + Math.random() * 90000);
  const tempPassword = Math.random().toString(36).slice(-8);

  bcrypt.hash(tempPassword, 10, (err, hashedPassword) => {
    if (err) return res.status(500).json({ message: "Password hash error" });

    db.query(
      `INSERT INTO officers
       (unique_id, name, email, password, temp_password, phone_no, designation, department_id, is_verified, verify_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NULL)`,
      [unique_id, name, email, hashedPassword, tempPassword, phone_no, designation, department_id],
      (err2) => {
        if (err2) {
          console.error("Database insert error:", err2);
          return res.status(500).json({ message: "Database insert failed: " + err2.message });
        }

        console.log(`Officer inserted: ${name}, department_id: ${department_id}`);

        transporter.sendMail({
          from: "pvssalert123@gmail.com",
          to: email,
          subject: "Your Login Credentials",
          html: `<h3>Welcome ${name}</h3>
                 <p>Your account has been verified.</p>
                 <p><b>User ID:</b> ${unique_id}</p>
                 <p><b>Temporary Password:</b> ${tempPassword}</p>
                 <p>⚠️ Please change your password after first login.</p>`
        }, (error) => {
          if (error) {
            console.error("Email send error:", error);
            return res.status(500).json({ message: "Failed to send credentials email" });
          }

          return res.json({
            success: true,
            message: "✅ Officer verified! Credentials sent to email.",
            unique_id,
            tempPassword
          });
        });
      }
    );
  });
});

// ✅ Get officers by dept_id (string) or department_id (numeric)
app.get("/officers", (req, res) => {
  const { dept_id, department_id } = req.query;

  if (!dept_id && !department_id) {
    return res.json({ officers: [] });
  }

  let sql, params;

  if (department_id) {
    sql = `
      SELECT id, unique_id, name, email, phone_no, designation, designation, is_verified, department_id
      FROM officers
      WHERE department_id = ?
      ORDER BY name
    `;
    params = [department_id];
  } else {
    sql = `
      SELECT o.id, o.unique_id, o.name, o.email, o.phone_no, o.designation, o.designation, o.is_verified, o.department_id
      FROM officers o
      JOIN departments d ON o.department_id = d.id
      WHERE d.dept_id = ?
      ORDER BY o.name
    `;
    params = [dept_id];
  }

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("SQL Error (officers):", err);
      return res.json({ officers: [] });
    }
    console.log(`✅ Found ${results.length} officers`);
    res.json({ officers: Array.isArray(results) ? results : [] });
  });
});


// ✅ Assign department task to officers
app.post("/department_tasks/assign/:taskId", (req, res) => {
  const { taskId } = req.params;
  const { officer_ids } = req.body; // array

  if (!officer_ids || !Array.isArray(officer_ids) || officer_ids.length === 0) {
    return res.status(400).json({ message: "No officer selected" });
  }

  db.query("SELECT * FROM department_tasks WHERE id = ?", [taskId], (err, results) => {
    if (err || results.length === 0) return res.status(404).json({ message: "Task not found" });
    const task = results[0];

    // Update assigned_to in department_tasks (legacy)
    db.query("UPDATE department_tasks SET assigned_to=? WHERE id=?", [officer_ids.join(","), taskId]);

    // Assign to each officer
    let completed = 0;
    let errors = [];

    officer_ids.forEach(officerId => {
      db.query("SELECT name, email FROM officers WHERE id=?", [officerId], (err2, officerRows) => {
        if (err2 || officerRows.length === 0) {
          errors.push(`Officer not found: ${officerId}`);
        } else {
          db.query(
            "INSERT INTO officer_tasks (officer_id, officer_name, officer_email, department_task_id, work_title, work_description, deadline, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')",
            [
              officerId,
              officerRows[0].name,
              officerRows[0].email,
              taskId,
              task.subject,
              task.subject,
              task.deadline,
            ]
          );
        }
        completed++;
        if (completed === officer_ids.length) {
          if (errors.length > 0) {
            return res.status(500).json({ message: "Some assignments failed: " + errors.join(", ") });
          }
          res.json({ message: "Task assigned to officers!" });
        }
      });
    });
  });
});


// ✅ Officer work list (all)
app.get("/officer-work", (req, res) => {
  db.query("SELECT * FROM officer_work", (err, rows) => {
    if (err) {
      console.error("Error fetching officer work:", err);
      return res.json([]);
    }
    res.json(rows || []);
  });
});


// ✅ Helper: format date
function toMySQLDate(dateStr) {
  if (!dateStr) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [day, month, year] = dateStr.split("-");
  return `${year}-${month}-${day}`;
}


// --- Assign task to officer(s) (one POST per officer) ---
app.post("/officer-work", (req, res) => {
  const { officer_id, department_id, task_id, work_title, work_description, deadline } = req.body;

  if (!officer_id || !department_id || !task_id || !work_title || !deadline) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  db.query(
    "INSERT INTO officer_work (officer_id, department_id, task_id, work_title, work_description, deadline, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')",
    [officer_id, department_id, task_id, work_title, work_description, deadline],
    (err, result) => {
      if (err) {
        console.error("Error adding officer work:", err);
        return res.status(500).json({ message: "Database error" });
      }
      res.json({ success: true, message: "Task assigned to officer", work_id: result.insertId });
    }
  );
});

// --- Get officer profile by unique_id ---
app.get("/officer/by-unique/:unique_id", (req, res) => {
  const { unique_id } = req.params;
  console.log("Looking up officer by unique_id:", unique_id);
  alert(unique_id);
  db.query(
    "SELECT id, unique_id, name, email, department_id, designation, is_verified FROM officers WHERE unique_id = ?",
    [unique_id],
    (err, results) => {
      if (err) {
        console.error("DB error:", err);
        return res.status(500).json({ error: "Database error" });
      }
      if (results.length === 0) {
        console.log("Officer not found for unique_id:", unique_id);
        return res.status(404).json({ error: "Officer not found" });
      }
      console.log("Officer found:", results[0]);
      res.json(results[0]);
    }
  );
});

// ✅ Update officer work status
app.put("/officer-work/:id", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) return res.status(400).json({ message: "Status is required" });

  db.query(
    "UPDATE officer_work SET status=? WHERE id=?",
    [status, id],
    (err, result) => {
      if (err) {
        console.error("Error updating officer work:", err);
        return res.status(500).json({ message: "Database error" });
      }
      res.json({ success: true, message: "Work status updated" });
    }
  );
});


// --- Officer work list by department for Department Dashboard ---
app.get("/officer_work/department/:department_id", (req, res) => {
  const department_id = req.params.department_id;
  const sql = `
    SELECT ow.*, o.name AS officer_name
    FROM officer_work ow
    JOIN officers o ON ow.officer_id = o.id
    WHERE ow.department_id = ?
    ORDER BY ow.created_at DESC
  `;
  db.query(sql, [department_id], (err, rows) => {
    if (err) {
      console.error("Error fetching officer work:", err);
      return res.json([]);
    }
    res.json(rows || []);
  });
});

// --- Officer uploads a report for their assigned work ---
app.put("/officer_work/report/:id", upload.single("report_file"), (req, res) => {
  const { id } = req.params;
  const { report_description } = req.body;
  let report_file = null;
  if (req.file) report_file = req.file.filename;

  const fields = [];
  const params = [];
  if (report_description) { fields.push("report_description=?"); params.push(report_description); }
  if (report_file) { fields.push("report_file=?"); params.push(report_file); }
  params.push(id);

  if (!fields.length) return res.status(400).json({ message: "No report data to update." });

  const q = `UPDATE officer_work SET ${fields.join(", ")} WHERE id = ?`;
  db.query(q, params, err => {
    if (err) return res.status(500).json({ message: "Failed to update officer work/report" });
    res.json({ message: "Report submitted!" });
  });
});

// Get officers belonging to a department (by department_id)
app.get("/api/officer_work/officers/department/:department_id", (req, res) => {
  const department_id =req.params.department_id;
  db.query(
    "SELECT id, unique_id, name, email, designation FROM officers WHERE department_id = ? ORDER BY name",
   [department_id],
    (err, results) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json(results);
    }
  );
});

// Assign officers to a department task
// Assign a department task to officers
app.post("/api/officer_work/assign", (req, res) => {
  let { task_id, department_id, officer_ids, deadline, work_title, work_description } = req.body;

  if (!task_id || !department_id || !Array.isArray(officer_ids) || officer_ids.length === 0 || !deadline || !work_title) {
    return res.status(400).json({ error: "task_id, department_id, officer_ids[], deadline, work_title required" });
  }

  // ✅ Convert deadline to DATE format (YYYY-MM-DD)
  try {
    deadline = new Date(deadline).toISOString().split("T")[0]; // => "2025-09-12"
  } catch (e) {
    return res.status(400).json({ error: "Invalid deadline format" });
  }

  // ✅ Check if officers already assigned
  db.query(
    "SELECT officer_id FROM officer_work WHERE task_id = ? AND officer_id IN (?)",
    [task_id, officer_ids],
    (err, existing) => {
      if (err) return res.status(500).json({ error: "Database error (check existing)" });

      const alreadyAssigned = new Set((existing || []).map((e) => e.officer_id));
      const newOfficerIds = officer_ids.filter((id) => !alreadyAssigned.has(id));

      if (newOfficerIds.length === 0) {
        return res.json({ success: true, message: "All officers already assigned." });
      }

      // ✅ Build insert values
      const values = newOfficerIds.map((id) => [
        id,
        department_id,
        task_id,
        work_title,
        work_description || "",
        deadline,
      ]);

      db.query(
        "INSERT INTO officer_work (officer_id, department_id, task_id, work_title, work_description, deadline) VALUES ?",
        [values],
        (err2, result) => {
          if (err2) {
            console.error("DB Insert Error:", err2);
            return res.status(500).json({ error: "Database insert error" });
          }
          res.json({ success: true, message: "Officers assigned." });
        }
      );
    }
  );
});


// Get all officers assigned to a department task (by task_id)
app.get('/api/officer_work/assigned/:task_id', (req, res) => {
  const task_id = req.params.task_id;
  db.query(
    `SELECT ow.id, o.id as officer_id, o.name, o.designation, ow.status, ow.deadline
     FROM officer_work ow
     JOIN officers o ON ow.officer_id = o.id
     WHERE ow.task_id = ?`,
    [task_id],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
      }
      res.json(results);
    }
  );
});

// (OPTIONAL) Remove an officer from a task assignment
app.delete('/api/officer_work/assigned/:task_id/:officer_id', (req, res) => {
  const { task_id, officer_id } = req.params;
  db.query(
    'DELETE FROM officer_work WHERE task_id = ? AND officer_id = ?',
    [task_id, officer_id],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
      }
      res.json({ success: true, message: 'Assignment removed.' });
    }
  );
});

// (OPTIONAL) Get all officer reports for a department
app.get('/api/officer_work/department/:department_id', (req, res) => {
  const department_id = req.params.department_id;
  db.query(
    `SELECT ow.id, o.name as officer_name, ow.work_title, ow.work_description, ow.deadline, ow.status, ow.report_file, ow.report_description
     FROM officer_work ow
     JOIN officers o ON ow.officer_id = o.id
     WHERE ow.department_id = ?`,
    [department_id],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
      }
      res.json(results);
    }
  );
});

// --- Get tasks assigned to an officer by unique_id ---
app.get("/officer_tasks/:unique_id", (req, res) => {
  const { unique_id } = req.params;

  if (!unique_id) {
    return res.status(400).json({ error: "unique_id is required" });
  }

  // Step 1: Get officer_id from unique_id
  const sqlOfficer = "SELECT id, name, designation, department_id FROM officers WHERE unique_id = ? LIMIT 1";
  db.query(sqlOfficer, [unique_id], (err, results) => {
    if (err) {
      console.error("Error finding officer:", err);
      return res.status(500).json({ error: "Database error while fetching officer" });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Officer not found" });
    }

    const officer_id = results[0].id;

    // Step 2: Fetch officer's assigned tasks
    const sqlTasks = `
      SELECT 
        ow.id,
        ow.task_id,
        ow.work_title,
        ow.work_description,
        ow.deadline,
        ow.status,
        ow.report_file,
        ow.report_description,
        ow.assigned_at,
        ow.completed_at,
        d.name AS department_name
      FROM officer_work ow
      JOIN departments d ON ow.department_id = d.id
      WHERE ow.officer_id = ?
      ORDER BY ow.assigned_at DESC
    `;

    db.query(sqlTasks, [officer_id], (err2, rows) => {
      if (err2) {
        console.error("Error fetching officer tasks:", err2);
        return res.status(500).json({ error: "Database error while fetching tasks" });
      }

      return res.json(Array.isArray(rows) ? rows : []);
    });
  });
});

// --- Get officer details by unique_id ---
app.get("/officer/:unique_id", (req, res) => {
  const { unique_id } = req.params;

  if (!unique_id) {
    return res.status(400).json({ error: "unique_id is required" });
  }

  const sql = `
    SELECT 
      id,
      unique_id,
      name,
      designation,
      department_id
    FROM officers 
    WHERE unique_id = ? 
    LIMIT 1
  `;

  db.query(sql, [unique_id], (err, results) => {
    if (err) {
      console.error("Error fetching officer:", err);
      return res.status(500).json({ error: "Database error while fetching officer" });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Officer not found" });
    }

    return res.json(results[0]);
  });
});

// Get all officer work (reports) for a department, joined with officer details
app.get('/api/department/officer-reports/:department_id', (req, res) => {
  const department_id = req.params.department_id;
  const sql = `
    SELECT
      ow.id AS officer_work_id,
      o.id AS officer_id,
      o.name AS officer_name,
      o.designation AS officer_designation,
      o.unique_id AS officer_unique_id,
      ow.work_title,
      ow.work_description,
      ow.deadline,
      ow.status,
      ow.report_file,
      ow.report_description,
      ow.assigned_at,
      ow.completed_at
    FROM officer_work ow
    JOIN officers o ON ow.officer_id = o.id
    WHERE ow.department_id = ?
    ORDER BY ow.assigned_at DESC
  `;
  db.query(sql, [department_id], (err, rows) => {
    if (err) {
      console.error("Error fetching officer reports:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(rows || []);
  });
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
