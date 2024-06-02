import express from "express";
import path from "path";
import bodyParser from "body-parser";
// import crypto from "crypto";

import mysql from "mysql";


const port = 8030;
const app = express();

const publicPath = path.resolve("static-path");

app.use(express.static(publicPath));
app.set("view engine", "ejs");

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));

const pool = mysql.createPool({
    multipleStatements: true,
    user: "root",
    password: "",
    database: "newci",
    host: "127.0.0.1",
  });

  
pool.getConnection((err, connection) => {
    if (err) {
      console.error("Error connecting to database:", err.message);
    } else {
      console.log("Connected to database");
      connection.release();
    }
  });

  app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
  });

  app.get("/", (req, res) => {
    pool.query("SELECT * FROM mesincuci WHERE status = 'tersedia'", (err, results) => {
        if (err) {
            console.error("Error fetching data:", err.message);
            res.status(500).send("Server error");
        } else {
            res.render("tes", { mesincuci: results });
        }
    });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Error connecting to database:", err.message);
      res.sendStatus(500);
      return;
    }

    const query = "SELECT * FROM pegawai WHERE email = ? AND password = ?";
    connection.query(query, [username, password], (err, results) => {
      connection.release();

      if (err) {
        console.error("Error executing query:", err.message);
        res.sendStatus(500);
        return;
      }

      if (results.length > 0) {
        res.redirect("/dashboard");
      } else {
        res.redirect("/?error=1"); 
      }
    });
  });
});
  app.get("/login", (req, res) => {
    res.render("login");
  });

app.get("/dashboard", (req, res) => {
    pool.query("SELECT * FROM mesincuci", (err, results) => {
        if (err) {
            console.error("Error fetching data:", err.message);
            res.status(500).send("Server error");
        } else {
            res.render("dashboard", { mesincuci: results });
        }
    });
});

app.post("/update-status", (req, res) => {
    const { id, status } = req.body;

    pool.query("UPDATE mesincuci SET status = ? WHERE idM = ?", [status, id], (err) => {
        if (err) {
            console.error("Error updating status:", err.message);
            res.status(500).send("Server error");
        } else {
            res.sendStatus(200);
        }
    });
});


  app.get("/kelola-mesin-cuci", (req, res) => {
    res.render("kelola-mesin-cuci");
  });

  app.get("/kelola-pelanggan", (req, res) => {
    res.render("kelola-pelanggan");
  });

  app.get("/tambah-pelanggan", (req, res) => {
    res.render("tambah-pelanggan");
  });

  app.get("/tambah-mesin-cuci", (req, res) => {
    res.render("tambah-mesin-cuci");
  });

  app.get("/pemesan", (req, res) => {
    res.render("pemesan");
  });

  app.get("/laporan", (req, res) => {
    res.render("laporan");
  });




