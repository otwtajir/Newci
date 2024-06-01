import express from "express";
import path from "path";
// import crypto from "crypto";
import bodyParser from "body-parser";
import mysql from "mysql";


const port = 8023;
const app = express();

const publicPath = path.resolve("static-path");

app.use(express.static(publicPath));
app.set("view engine", "ejs");


const pool = mysql.createPool({
    multipleStatements: true,
    user: "root",
    password: "",
    database: "puki",
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
    res.render("tes");
  });

  app.get("/login", (req, res) => {
    res.render("login");
  });

  app.get("/dashboard", (req, res) => {
    res.render("dashboard");
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

  app.get("/laporan", (req, res) => {
    res.render("laporan");
  });




