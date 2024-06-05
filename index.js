import express from "express";
import path from "path";
import bodyParser from "body-parser";
// import crypto from "crypto";

import mysql from "mysql";


const port = 8043;
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
  pool.query("SELECT * FROM mesincuci", (err, results) => {
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
    res.render("kelola-pelanggan");
  });

  app.get("/tambah-pelanggan", (req, res) => {
    res.render("tambah-pelanggan");
  });

  app.get("/tambah-mesin-cuci", (req, res) => {
    res.render("tambah-mesin-cuci");
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


  app.get("/laporan", (req, res) => {
    res.render("laporan");
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
      'UPDATE mesincuci SET nama = ?, merek = ?, kapasitas = ?, tarif = ?, status = "Digunakan" WHERE nama = ?',
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
