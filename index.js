import express from "express";
import path from "path";
import bodyParser from "body-parser";
// import crypto from "crypto";

import mysql from "mysql";


const port = 8044;
const app = express();

const publicPath = path.resolve("static-path");

app.use(express.static(publicPath));
app.use(bodyParser.urlencoded({ extended: true })); // Middleware untuk body-parser
app.set("view engine", "ejs");

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));

const pool = mysql.createPool({
    multipleStatements: true,
    user: "root",
    password: "",
    database: "newci2",
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
    const query = `
        SELECT mc.* 
        FROM mesincuci mc
        LEFT JOIN (
            SELECT t1.idM, t1.statusPembayaran 
            FROM transaksi t1
            JOIN (
                SELECT idM, MAX(tglSelesai) AS MaxTglSelesai 
                FROM transaksi 
                GROUP BY idM
            ) t2 ON t1.idM = t2.idM AND t1.tglSelesai = t2.MaxTglSelesai
        ) AS last_trans ON mc.idM = last_trans.idM
        WHERE mc.status = 'Tersedia'
        AND (last_trans.statusPembayaran = 'Lunas' OR last_trans.statusPembayaran IS NULL)
    `;

    pool.query(query, (err, results) => {
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

    const query = "SELECT * FROM pengguna WHERE email = ? AND password = ?";
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
    pool.getConnection((err, connection) => {
        if (err) {
            console.error("Error connecting to database:", err.message);
            res.status(500).send("Server error");
            return;
        }

        // Query to join mesincuci and transaksi tables
        const query = `
        SELECT m.idM, m.nama, m.merek, m.status, m.tarif, 
               t.statusPembayaran, t.durasi, t.biaya, p.namaP AS pemesan
        FROM mesincuci m
        LEFT JOIN (
            SELECT idM, statusPembayaran, durasi, biaya, idP
            FROM transaksi 
            WHERE idTransaksi IN (
                SELECT MAX(idTransaksi) 
                FROM transaksi 
                GROUP BY idM
            )
        ) t ON m.idM = t.idM
        LEFT JOIN pengguna p ON t.idP = p.idP;
        `;

        connection.query(query, (err, results) => {
            connection.release();

            if (err) {
                console.error("Error fetching data:", err.message);
                res.status(500).send("Server error");
                return;
            }

            res.render("dashboard", { mesincuci: results });
        });
    });
});


// app.post("/update-status", (req, res) => {
//     const { id, status } = req.body;

//     pool.query("UPDATE mesincuci SET status = ? WHERE idM = ?", [status, id], (err) => {
//         if (err) {
//             console.error("Error updating status:", err.message);
//             res.status(500).send("Server error");
//         } else {
//             res.sendStatus(200);
//         }
//     });
// });



// app.post("/update-payment-status", (req, res) => {
//   const { id, statusPembayaran } = req.body;
//   const tanggalSelesai = new Date().toISOString().slice(0, 19).replace('T', ' ');

//   pool.getConnection((err, connection) => {
//       if (err) {
//           console.error("Error connecting to database:", err.message);
//           res.status(500).send("Server error");
//           return;
//       }

//       // Find the latest transaction for the given mesin cuci ID
//       const findTransactionQuery = `
//           SELECT idTransaksi FROM transaksi 
//           WHERE idM = ? 
//           ORDER BY tglMulai DESC 
//           LIMIT 1;
//       `;

//       connection.query(findTransactionQuery, [id], (err, results) => {
//           if (err) {
//               connection.release();
//               console.error("Error finding transaction:", err.message);
//               res.status(500).send("Server error");
//               return;
//           }

//           if (results.length === 0) {
//               connection.release();
//               res.status(404).send("Transaction not found");
//               return;
//           }

//           const transactionId = results[0].idTransaksi;

//           console.log(`Found transaction with idTransaksi: ${transactionId}`);

//           const updatePaymentStatusQuery = `
//               UPDATE transaksi 
//               SET statusPembayaran = ?, tglselesai = ? 
//               WHERE idTransaksi = ?;
              
//               UPDATE mesincuci 
//               SET status = 'Tersedia' 
//               WHERE idM = ?;
//           `;

//           connection.query(updatePaymentStatusQuery, [statusPembayaran, tanggalSelesai, transactionId, id], (err) => {
//               connection.release();

//               if (err) {
//                   console.error("Error updating payment status or machine status:", err.message);
//                   res.status(500).send("Server error");
//               } else {
//                   res.sendStatus(200);
//               }
//           });
//       });
//   });
// });

app.post("/update-status", (req, res) => {
  const { id, status } = req.body;

  // Mengubah waktu selesai menjadi zona waktu WIB
  const tanggalSelesaiWIB = new Date().toLocaleString('en-GB', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
  }).replace(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+):(\d+)/, '$3-$2-$1 $4:$5:$6');

  pool.getConnection((err, connection) => {
      if (err) {
          console.error("Error connecting to database:", err.message);
          res.status(500).send("Server error");
          return;
      }

      // Find the latest transaction for the given mesin cuci ID
      const findTransactionQuery = `
          SELECT idTransaksi, idP, tglmulai FROM transaksi 
          WHERE idM = ? 
          ORDER BY tglmulai DESC 
          LIMIT 1;
      `;

      connection.query(findTransactionQuery, [id], (err, results) => {
          if (err) {
              connection.release();
              console.error("Error finding transaction:", err.message);
              res.status(500).send("Server error");
              return;
          }

          if (results.length === 0) {
              connection.release();
              res.status(404).send("Transaction not found");
              return;
          }

          const transactionId = results[0].idTransaksi;
          const idP = results[0].idP;
          const tanggalMulai = new Date(results[0].tglmulai);
          const tanggalSelesaiDate = new Date(tanggalSelesaiWIB);

          // Calculate duration in 15-minute intervals
          const durationMinutes = Math.ceil((tanggalSelesaiDate - tanggalMulai) / (1000 * 60));
          const duration = Math.ceil(durationMinutes / 15);

          // Get the tariff for the machine
          const findTariffQuery = `
              SELECT tarif FROM mesincuci 
              WHERE idM = ?;
          `;

          connection.query(findTariffQuery, [id], (err, tariffResults) => {
              if (err) {
                  connection.release();
                  console.error("Error finding tariff:", err.message);
                  res.status(500).send("Server error");
                  return;
              }

              if (tariffResults.length === 0) {
                  connection.release();
                  res.status(404).send("Tariff not found");
                  return;
              }

              const tariff = tariffResults[0].tarif;
              const biaya = duration * tariff;

              const updateQuery = `
                  UPDATE transaksi 
                  SET tglselesai = ?, durasi = ?, biaya = ? 
                  WHERE idTransaksi = ?;
                  
                  UPDATE mesincuci 
                  SET status = ? 
                  WHERE idM = ?;
              `;

              const queryParams = [tanggalSelesaiWIB, duration, biaya, transactionId, status, id];

              connection.query(updateQuery, queryParams, (err) => {
                  if (err) {
                      connection.release();
                      console.error("Error updating status:", err.message);
                      res.status(500).send("Server error");
                      return;
                  }

                  // Get the name of the user
                  const findUserQuery = `
                      SELECT namaP FROM pengguna 
                      WHERE idP = ?;
                  `;

                  connection.query(findUserQuery, [idP], (err, userResults) => {
                      connection.release();

                      if (err) {
                          console.error("Error finding user:", err.message);
                          res.status(500).send("Server error");
                          return;
                      }

                      if (userResults.length === 0) {
                          res.status(404).send("User not found");
                          return;
                      }

                      const pemesan = userResults[0].nama;
                      res.status(200).json({ pemesan });
                      console.log(idP);
                      console.log(idP);
                  });
              });
          });
      });
  });
});

app.post("/update-payment-status", (req, res) => {
  const { id, statusPembayaran } = req.body;

  pool.getConnection((err, connection) => {
      if (err) {
          console.error("Error connecting to database:", err.message);
          res.status(500).send("Server error");
          return;
      }

      // Find the latest transaction for the given mesin cuci ID
      const findTransactionQuery = `
          SELECT idTransaksi FROM transaksi 
          WHERE idM = ? 
          ORDER BY tglMulai DESC 
          LIMIT 1;
      `;

      connection.query(findTransactionQuery, [id], (err, results) => {
          if (err) {
              connection.release();
              console.error("Error finding transaction:", err.message);
              res.status(500).send("Server error");
              return;
          }

          if (results.length === 0) {
              connection.release();
              res.status(404).send("Transaction not found");
              return;
          }

          const transactionId = results[0].idTransaksi;

          const updatePaymentStatusQuery = `
              UPDATE transaksi 
              SET statusPembayaran = ? 
              WHERE idTransaksi = ?;
          `;

          connection.query(updatePaymentStatusQuery, [statusPembayaran, transactionId], (err) => {
              connection.release();

              if (err) {
                  console.error("Error updating payment status:", err.message);
                  res.status(500).send("Server error");
              } else {
                  res.sendStatus(200);
              }
          });
      });
  });
});




app.get("/kelola-mesin-cuci", (req, res) => {
  pool.query("SELECT * FROM mesincuci where status = 'Tersedia'", (err, results) => {
      if (err) {
          console.error("Error fetching data:", err.message);
          res.status(500).send("Server error");
      } else {
          res.render("kelola-mesin-cuci", { mesincuci: results });
      }
  });
});

app.post("/tambah-mesin-cuci", (req, res) => {
  const { nama, merek, kapasitas, tarif } = req.body;
  const status = 'Tersedia'; // Anda dapat mengatur status default di sini

  const sql = "INSERT INTO mesincuci (nama, merek, kapasitas, tarif, status) VALUES (?, ?, ?, ?, ?)";
  const values = [nama, merek, kapasitas, tarif, status];

  pool.query(sql, values, (err, results) => {
      if (err) {
          console.error("Error inserting data:", err.message);
          res.status(500).send("Server error");
      } else {
          res.redirect("/kelola-mesin-cuci"); // Redirect ke halaman kelola mesin cuci setelah berhasil menambah
      }
  });
}); 


// app.get('/kelola-mesin-cuci', (req, res) => {
//   const query = 'SELECT * FROM mesincuci';
//   connection.query(query, (err, results) => {
//       if (err) throw err;
//       res.render('kelola-mesin-cuci', { mesincuci: results });
//   });
// });

app.get("/kelola-pelanggan", (req, res) => {
    const query = `
        SELECT pengguna.namaP, pengguna.noHP, pengguna.alamat 
        FROM pengguna
        LEFT JOIN transaksi ON pengguna.idP = transaksi.idP
        GROUP BY pengguna.idP
        HAVING COUNT(transaksi.idTransaksi) = 0 
           OR COUNT(CASE WHEN transaksi.statusPembayaran = 'Belum Lunas' THEN 1 END) = 0
    `;

    pool.query(query, (err, results) => {
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
    let query = `
        SELECT transaksi.tglMulai, transaksi.tglSelesai, transaksi.durasi, transaksi.statusPembayaran, transaksi.biaya, mesincuci.nama AS namaMesin, pengguna.namaP AS namaPengguna 
        FROM transaksi 
        JOIN mesincuci ON transaksi.idM = mesincuci.idM 
        JOIN pengguna ON transaksi.idP = pengguna.idP 
        WHERE transaksi.statusPembayaran = 'Lunas'
    `;
    let queryParams = [];

    if (tanggalMulai && tanggalSelesai) {
        query += " AND transaksi.tglMulai BETWEEN ? AND ? AND transaksi.tglSelesai BETWEEN ? AND ?";
        const tanggalSelesaiAkhir = `${tanggalSelesai} 23:59:59`;
        queryParams.push(tanggalMulai, tanggalSelesaiAkhir, tanggalMulai, tanggalSelesaiAkhir);
    }

    pool.query(query, queryParams, (err, results) => {
        if (err) {
            console.error("Error fetching data:", err.message);
            res.status(500).send("Internal Server Error");
        } else {
            console.log(results);
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

  app.get("/pemesan", (req, res) => {
    const idM = req.query.idM;
    res.render("pemesan", { idM });
    console.log(idM);
});

app.post("/submit-pemesan", (req, res) => {
  const { idM, nama, nohp} = req.body;
  const tanggalMulai = new Date().toLocaleString('en-GB', {
      timeZone: 'Asia/Jakarta', // Sesuaikan dengan zona waktu lokal Anda
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
  }).replace(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+):(\d+)/, '$3-$2-$1 $4:$5:$6');

  pool.getConnection((err, connection) => {
      if (err) {
          console.error("Error connecting to database:", err.message);
          res.status(500).send("Server error");
          return;
      }

      // Check if customer exists
      const checkCustomerQuery = "SELECT * FROM pengguna WHERE namaP = ? AND nohp = ?";
      connection.query(checkCustomerQuery, [nama, nohp], (err, results) => {
          if (err) {
              connection.release();
              console.error("Error checking customer:", err.message);
              res.status(500).send("Server error");
              return;
          }

          if (results.length === 0) {
              connection.release();
              res.status(400).send("Customer not found");
              return;
          }

          const pelangganId = results[0].idP;

          // Insert into transaksi table and update mesin cuci status
          const insertTransaksiQuery = "INSERT INTO transaksi (idM, idP, tglMulai) VALUES (?, ?, ?)";
          const updateStatusQuery = "UPDATE mesincuci SET status = 'Digunakan' WHERE idM = ?";
          connection.query(insertTransaksiQuery + ';' + updateStatusQuery, [idM, pelangganId, tanggalMulai, idM], (err) => {
              connection.release();

              if (err) {
                  console.error("Error inserting transaksi or updating status:", err.message);
                  res.status(500).send("Server error");
              } else {
                  res.redirect("/dashboard");
              }
          });
      });
  });
});


 

//   app.delete('/hapus-mesin-cuci/:nama', (req, res) => {
//     const Id = req.params.nama;
//     pool.query('DELETE FROM mesincuci WHERE nama = ?', [Id], (err, result) => {
//         if (err) {
//             console.error('Error deleting data:', err.message);
//             res.status(500).send('Internal Server Error');
//         } else {
//             res.status(200).send('Mesin cuci deleted successfully');
//         }
//     });
// });

app.delete('/hapus-mesin-cuci/:nama', (req, res) => {
  const nama = req.params.nama;

  pool.query('SELECT idm FROM mesincuci WHERE nama = ?', [nama], (err, results) => {
    if (err) {
      console.error('Error finding data:', err.message);
      res.status(500).send('Internal Server Error');
      return;
    }

    if (results.length === 0) {
      res.status(404).send('Mesin cuci not found');
      return;
    }

    const idm = results[0].idm;

    pool.query('DELETE FROM transaksi WHERE idM = ?', [idm], (err, result) => {
      if (err) {
        console.error('Error deleting related data:', err.message);
        res.status(500).send('Internal Server Error');
        return;
      }

      pool.query('DELETE FROM mesincuci WHERE idm = ?', [idm], (err, result) => {
        if (err) {
          console.error('Error deleting data:', err.message);
          res.status(500).send('Internal Server Error');
        } else {
          res.status(200).send('Mesin cuci deleted successfully');
        }
      });
    });
  });
});




app.get('/edit-mesin-cuci/:nama', (req, res) => {
  const Id = req.params.nama;
  pool.query('SELECT * FROM mesincuci WHERE nama = ?', [Id], (err, results) => {
      if (err) {
          console.error('Error fetching data:', err.message);
          res.status(500).send('Internal Server Error');
          return;
      }
      if (results.length > 0) {
          res.render('edit-mesin-cuci', { mesin: results[0] });
      } else {
          res.status(404).send('Mesin cuci not found');
      }
  });
});


app.post('/edit-mesin-cuci/:nama', (req, res) => {
  const nama2 = req.params.nama;
  const { nama, merek, kapasitas, tarif } = req.body;
  pool.query(
      'UPDATE mesincuci SET nama = ?, merek = ?, kapasitas = ?, tarif = ?, status = "Tersedia" WHERE nama = ?',
      [nama, merek, kapasitas,tarif, nama2 ],
      (err, result) => {
          if (err) {
              console.error('Error updating data:', err.message);
              res.status(500).send('Internal Server Error');
              return;
          }
          res.redirect('/kelola-mesin-cuci');
      }
  );
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
            const pelanggan = results[0];
            pool.query('SELECT * FROM kelurahan', (err, results) => {
                if (err) {
                    console.error('Error fetching kelurahan data:', err.message);
                    res.status(500).send('Internal Server Error');
                    return;
                }
                res.render('edit-pelanggan', { pelanggan: pelanggan, kelurahan: results });
            });
        } else {
            res.status(404).send('Pelanggan not found');
        }
    });
});

// Route untuk proses update data pelanggan
app.post('/edit-pelanggan/:namaP', (req, res) => {
    const pelangganId = req.params.namaP;
    const { namaP, noHP, alamat, idKel } = req.body;
    pool.query(
        'UPDATE pengguna SET namaP = ?, noHP = ?, alamat = ?, idKel = ? WHERE namaP = ?',
        [namaP, noHP, alamat, idKel, pelangganId],
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
    const namaP = req.params.namaP;
  
    pool.query('SELECT idP FROM pengguna WHERE namaP = ?', [namaP], (err, results) => {
      if (err) {
        console.error('Error finding data:', err.message);
        res.status(500).send('Internal Server Error');
        return;
      }
  
      if (results.length === 0) {
        res.status(404).send('Pelanggan not found');
        return;
      }
  
      const idP = results[0].idP;
  
      pool.query('DELETE FROM transaksi WHERE idP = ?', [idP], (err, result) => {
        if (err) {
          console.error('Error deleting related data:', err.message);
          res.status(500).send('Internal Server Error');
          return;
        }
  
        pool.query('DELETE FROM pengguna WHERE idP = ?', [idP], (err, result) => {
          if (err) {
            console.error('Error deleting data:', err.message);
            res.status(500).send('Internal Server Error');
          } else {
            res.status(200).send('Pelanggan deleted successfully');
            
          }
        });
      });
    });
  });
