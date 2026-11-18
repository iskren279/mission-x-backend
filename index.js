import express from "express";
import mysql from "mysql2";
import dotenv from "dotenv";
import cors from "cors";
dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

//create the connection pool

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 1,
  queueLimit: 0,
});

app.get("/debug-tables", (req, res) => {
  pool.query("SHOW TABLES", (err, result) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.json(result);
  });
});

app.get("/debug-project-columns", (req, res) => {
  pool.query("DESCRIBE project", (err, result) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.json(result);
  });
});

//default route handler - check server running okay
app.get("/", (req, res) => {
  res.send("Server is connected successfully!");
});

//default route handler database test
app.get("/dbTest", (req, res) => {
  //   res.send("Server connected!");
  pool.query("SELECT * FROM student", (err, result) => {
    if (err) {
      console.log(err);
      return res.send(err);
    }
    res.send(result);
  });
});

app.get("/dbPing", (req, res) => {
  pool.query("SELECT 1", (err, result) => {
    if (err) {
      console.error("Database connection failed:", err);
      return res.status(500).send("Database connection failed!");
    }
    res.send("Database Ping Successful: reachable and connected!");
  });
});

// ****************************This is Iskren's part*************************
app.get("/debug-db", (req, res) => {
  pool.query("SELECT DATABASE() AS db", (err, result) => {
    if (err) return res.send(err);
    res.send(result);
  });
});

//54 to 154 for Fateha

//155 to 255 Rodrigo
// Unified signup route for both student and teacher
app.post("/auth/:role/signup", async (req, res) => {
  try {
    const { role } = req.params;
    const { name, email, password } = req.body;

    if (role !== "student" && role !== "teacher") {
      return res.status(400).json({ errorMessage: "Invalid role" });
    }

    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return res
        .status(400)
        .json({ errorMessage: "Please fill in all fields" });
    }

    const table = role;
    const db = pool.promise();

    await db.execute(
      `INSERT INTO ${table} (name, email, password) VALUES (?, ?, ?)`,
      [name, email, password],
    );

    return res.status(201).json({ message: `${role} created successfully` });
  } catch (err2) {
    if (err2.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ errorMessage: "Email already exists" });
    }

    console.error("Signup error:", err2);
    return res.status(500).json({ errorMessage: "Error saving user" });
  }
});

// Unified login route for both student and teacher
app.post("/auth/:role/login", async (req, res) => {
  try {
    // Dynamic route parameter extraction to get the role from the request params
    const { role } = req.params; // student or teacher
    const { email, password } = req.body;

    // Validation to check if either student or teacher to login
    if (role !== "student" && role !== "teacher") {
      return res.status(400).json({ errorMessage: "Invalid role" });
    }

    // Validation to check required fields are present and not empty
    if (!email?.trim() || !password?.trim()) {
      return res
        .status(400)
        .json({ errorMessage: "Please enter email and password" });
    }

    const table = role; // student or teacher table

    // Promise-based pool so async/await works (callback `pool` is used elsewhere)
    const db = pool.promise();

    // Query to find the user by email
    const [rows] = await db.execute(`SELECT * FROM ${table} WHERE email = ?`, [
      email,
    ]);

    // Validation to check if email and password exists in the database
    if (rows.length === 0) {
      return res
        .status(401)
        .json({ errorMessage: "Invalid email or password" });
    }

    const user = rows[0];

    // Compare plain passwords (only for testing)
    if (user.password !== password) {
      return res
        .status(401)
        .json({ errorMessage: "Invalid email or password" });
    }

    return res.status(200).json({
      message: `${role} logged in successfully`,
      user,
    });
  } catch (err) {
    // Catch block to handle any database errors
    console.error("Database error:", err);
    return res.status(500).json({ errorMessage: "Database error" });
  }
});

app.get("/projects/:id/instructions", (req, res) => {
  const { id } = req.params;

  pool.query(
    "SELECT instructions FROM project WHERE project_id = ?",
    [id],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }

      if (result.length === 0) {
        return res.status(404).json({ message: "Project not found" });
      }

      res.json(result[0]);
    },
  );
});

//====PORT SETUP=====//
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`server is listing on http://localhost:${PORT}`);
});
