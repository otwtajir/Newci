import express from "express";
import path from "path";
import bodyParser from "body-parser";
import mysql from "mysql";

const port = 8023;
const app = express();

const publicPath = path.resolve("static-path");

app.use(express.static(publicPath));
app.use(bodyParser.urlencoded({ extended: true })); // Middleware untuk body-parser
app.set("view engine", "ejs");

const pool = mysql.createPool({
    multipleStatements: true,
    user: "root",
    password: "",
    database: "Newci",
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
    pool.query("SELECT namaP, noHP, alamat FROM pengguna", (err, results) => {
        if (err) {
            console.error("Error fetching data:", err.message);
            res.status(500).send("Internal Server Error");
        } else {
            res.render("kelola-pelanggan", { pelanggan: results });
        }
    });
});

app.get("/laporan", (req, res) => {
    const { tanggalMulai, tanggalSelesai } = req.query;
    let query = "SELECT tglMulai, tglSelesai, durasi, statusPembayaran, biaya FROM transaksi";

    if (tanggalMulai && tanggalSelesai) {
        query += ` WHERE tglMulai >= '${tanggalMulai}' AND tglSelesai <= '${tanggalSelesai}'`;
    }

    pool.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching data:", err.message);
            res.status(500).send("Internal Server Error");
        } else {
            console.log(results)
            res.render("laporan", { transaksi: results });
            
        }
    });
});

app.get("/tambah-mesin-cuci", (req, res) => {
    res.render("tambah-mesin-cuci");
});


app.get("/edit-mesin-cuci", (req, res) => {
    res.render("edit-mesin-cuci");
});

app.get("/tambah-pelanggan", (req, res) => {
  pool.query("SELECT idKel, namaKel FROM kelurahan", (err, results) => {
      if (err) {
          console.error("Error fetching data:", err.message);
          res.status(500).send("Internal Server Error");
      } else {
          res.render("tambah-pelanggan", { kelurahan: results, errorMsg: null, successMsg: null });
      }
  });
});


app.post("/tambah-pelanggan", (req, res) => {
    const { namapelanggan, nohp, alamat, kelurahanId } = req.body;
    const insertPengguna = "INSERT INTO pengguna (namaP, noHP, alamat, idKel) VALUES (?, ?, ?, ?)";
    const penggunaValues = [namapelanggan, nohp, alamat, kelurahanId];

    pool.query(insertPengguna, penggunaValues, (insertError, insertResult) => {
        if (insertError) {
            console.log(insertError);
            pool.query("SELECT idKel, namaKel FROM kelurahan", (err, results) => {
                return res.render("tambah-pelanggan", {
                    kelurahan: results,
                    errorMsg: "Gagal menambah pelanggan. Mohon coba lagi nanti.",
                    successMsg: null,
                });
            });
        } else {
            pool.query("SELECT idKel, namaKel FROM kelurahan", (err, results) => {
                res.render("tambah-pelanggan", {
                    kelurahan: results,
                    errorMsg: null,
                    successMsg: `Pelanggan berhasil ditambahkan`,
                });
            });
        }
    });
});



app.get('/edit-pelanggan/:namaP', (req, res) => {
    const pelangganId = req.params.namaP;
    pool.query('SELECT * FROM pengguna WHERE namaP = ?', [pelangganId], (err, results) => {
        if (err) {
            console.error('Error fetching data:', err.message);
            res.status(500).send('Internal Server Error');
            return;
        }
        if (results.length > 0) {
            res.render('edit-pelanggan', { pelanggan: results[0] });
        } else {
            res.status(404).send('Pelanggan not found');
        }
    });
});

// Route untuk proses update data pelanggan
app.post('/edit-pelanggan/:namaP', (req, res) => {
    const pelangganId = req.params.namaP;
    const { namaP, noHP, alamat } = req.body;
    pool.query(
        'UPDATE pengguna SET namaP = ?, noHP = ?, alamat = ? WHERE namaP = ?',
        [namaP, noHP, alamat, pelangganId],
        (err, result) => {
            if (err) {
                console.error('Error updating data:', err.message);
                res.status(500).send('Internal Server Error');
                return;
            }
            res.redirect('/kelola-pelanggan');
        }
    );
});

app.delete('/hapus-pelanggan/:namaP', (req, res) => {
    const pelangganId = req.params.namaP;
    pool.query('DELETE FROM pengguna WHERE namaP = ?', [pelangganId], (err, result) => {
        if (err) {
            console.error('Error deleting data:', err.message);
            res.status(500).send('Pelanggan deleted successfully');
        } else {
            res.status(200).send('Pelanggan deleted successfully');
        }
    });
});

