const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const multer = require("multer");
const path = require("path");

const app = express();
// const PORT = 3001;
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());
app.use("/uploads", express.static("uploads"));

// // Database connection using async/await
// const db = mysql.createPool({
//   // เปลี่ยนเป็น pool เพื่อประสิทธิภาพที่ดีกว่า
//   host: "localhost",
//   user: "root",
//   password: "root",
//   database: "testdb",
// });

const db = mysql.createPool({
  // ใช้ Connection URL ที่มาจาก Environment Variable
  uri: process.env.DATABASE_URL, // บังคับใช้ SSL/TLS ตามที่ TiDB Cloud กำหนด
  ssl: {
    rejectUnauthorized: true,
  }, // ระบุชื่อ Database/Schema ที่ถูกต้อง
  database: "test",
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

const REMOVE_BG_API = "q8V1NnscArhuwznDPoMFeFWc";

// Start the server only after a successful database connection
(async function startServer() {
  try {
    await db.getConnection(); // ตรวจสอบการเชื่อมต่อ
    console.log("✅ Connected to MySQL");
    app.listen(PORT, () => {
      console.log(`🚀 Server running port ${PORT}`);
      //${PORT}
      // http://localhost:${PORT}
    });
  } catch (err) {
    console.error("❌ Database connection failed:", err);
  }
})();

app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const inputPath = req.file.path; // รูปต้นฉบับ
    const outputPath = `uploads/no-bg-${req.file.filename}`; // รูปพื้นหลังลบแล้ว

    // ส่งรูปเข้า remove.bg API
    const formData = new FormData();
    formData.append("size", "auto");
    formData.append("image_file", fs.createReadStream(inputPath));

    const result = await axios({
      method: "post",
      url: "https://api.remove.bg/v1.0/removebg",
      data: formData,
      responseType: "arraybuffer",
      headers: {
        ...formData.getHeaders(),
        "X-Api-Key": REMOVE_BG_API,
      },
    });

    // เซฟไฟล์ผลลัพธ์ลงโฟลเดอร์ uploads/
    fs.writeFileSync(outputPath, result.data);

    // ส่งชื่อไฟล์กลับไปให้ React
    res.json({
      success: true,
      image: `no-bg-${req.file.filename}`,
    });
  } catch (error) {
    console.error("Remove BG Error:", error.response?.data || error.message);
    res.status(500).json({ success: false });
  }
});

//---
// TiDB data base
// POST /login route (แก้ไขให้ใช้ async/await และ bcrypt)
app.post("/api/login", async (req, res) => {
  const { name, password } = req.body;

  if (!name || !password) {
    return res
      .status(400)
      .json({ success: false, message: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" });
  }

  try {
    const sql = "SELECT * FROM test.user WHERE name = ?";
    const [results] = await db.query(sql, [name]);

    if (results.length > 0) {
      const user = results[0];
      // เปรียบเทียบรหัสผ่านที่เข้ารหัสแล้ว
      const isMatch = await bcrypt.compare(password, user.password);

      if (isMatch) {
        // ส่ง role กลับไปใน response
        res.json({
          success: true,
          message: "เข้าสู่ระบบสำเร็จ!",
          role: user.role,
          user: user,
        });
      } else {
        res.status(401).json({
          success: false,
          message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
        });
      }
    } else {
      res
        .status(401)
        .json({ success: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
    }
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

/****************************** Local host ************************************/
// app.post("/api/login", async (req, res) => {
//   const { name, password } = req.body;

//   if (!name || !password) {
//     return res
//       .status(400)
//       .json({ success: false, message: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" });
//   }

//   try {
//     const sql = "SELECT * FROM testdb.user WHERE name = ?";
//     const [results] = await db.query(sql, [name]);

//     if (results.length > 0) {
//       const user = results[0];
//       // เปรียบเทียบรหัสผ่านที่เข้ารหัสแล้ว
//       const isMatch = await bcrypt.compare(password, user.password);

//       if (isMatch) {
//         // ส่ง role กลับไปใน response
//         res.json({
//           success: true,
//           message: "เข้าสู่ระบบสำเร็จ!",
//           role: user.role,
//           user: user,
//         });
//       } else {
//         res.status(401).json({
//           success: false,
//           message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
//         });
//       }
//     } else {
//       res
//         .status(401)
//         .json({ success: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
//     }
//   } catch (err) {
//     console.error("❌ Login error:", err);
//     res.status(500).json({ success: false, message: "Database error" });
//   }
// });

//---
//////////////////// TiDB data base //////////////////////
app.post("/api/getuser", async (req, res) => {
  try {
    // ดึงข้อมูลผู้ใช้ทั้งหมด (ยกเว้นรหัสผ่าน ถ้าไม่จำเป็นต้องแสดง)
    const sql = "SELECT * FROM test.user ORDER BY id DESC";
    const [results] = await db.query(sql);

    // *** โครงสร้างการส่งข้อมูลกลับที่ถูกต้อง ***
    res.json({
      success: true,
      users: results, // ส่งข้อมูลเป็น Array ภายใต้คีย์ 'users'
    });
  } catch (err) {
    console.error("❌ Get user list error:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

/******************* local host *******************/
// app.post("/api/getuser", async (req, res) => {
//   try {
//     // ดึงข้อมูลผู้ใช้ทั้งหมด (ยกเว้นรหัสผ่าน ถ้าไม่จำเป็นต้องแสดง)
//     const sql = "SELECT * FROM testdb.user ORDER BY id DESC";
//     const [results] = await db.query(sql);

//     // *** โครงสร้างการส่งข้อมูลกลับที่ถูกต้อง ***
//     res.json({
//       success: true,
//       users: results, // ส่งข้อมูลเป็น Array ภายใต้คีย์ 'users'
//     });
//   } catch (err) {
//     console.error("❌ Get user list error:", err);
//     res.status(500).json({ success: false, message: "Database error" });
//   }
// });

////////////////////// TiDB data base ///////////////////////
app.patch("/api/updateProfileByAdmin/:name", async (req, res) => {
  const oldName = req.params.name;
  const { newName, newPassword, newRole } = req.body;

  if (!newName && !newPassword && !newRole) {
    return res
      .status(400)
      .json({ success: false, message: "กรุณาระบุข้อมูลที่ต้องการแก้ไข" });
  }

  try {
    const updates = [];
    const params = [];

    // 1. จัดการการเปลี่ยนชื่อผู้ใช้
    if (newName && newName !== oldName) {
      // ตรวจสอบชื่อใหม่ว่าถูกใช้ไปแล้วหรือไม่
      const checkSql = "SELECT name FROM test.user WHERE name = ?";
      const [existingUsers] = await db.query(checkSql, [newName]);
      if (existingUsers.length > 0) {
        return res
          .status(409)
          .json({ success: false, message: "ชื่อผู้ใช้ใหม่นี้ถูกใช้แล้ว" });
      }
      updates.push("name = ?");
      params.push(newName);
    }

    // 2. จัดการการเปลี่ยนรหัสผ่าน (ถ้ามีการป้อนรหัสผ่านใหม่)
    if (newPassword) {
      if (newPassword.length < 6) {
        // ตัวอย่างการตรวจสอบความยาวขั้นต่ำ
        return res.status(400).json({
          success: false,
          message: "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร",
        });
      }
      // เข้ารหัสรหัสผ่านใหม่ด้วย bcrypt
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      updates.push("password = ?");
      params.push(hashedPassword);
    }

    // 3. จัดการการเปลี่ยนบทบาท
    if (newRole) {
      if (newRole !== "admin" && newRole !== "user") {
        return res
          .status(400)
          .json({ success: false, message: "บทบาทไม่ถูกต้อง" });
      }
      updates.push("role = ?");
      params.push(newRole);
    }

    // รวม SQL Query และทำการอัปเดต
    const sql = `UPDATE test.user SET ${updates.join(
      ", ",
    )}, update_at = CURRENT_TIMESTAMP() WHERE name = ?`;

    // หากมีการเปลี่ยนชื่อผู้ใช้ ต้องใช้ชื่อเดิม (oldName) ในการค้นหา
    // แต่ถ้าเปลี่ยนชื่อ, อัปเดต name = ? จะถูกเพิ่มเข้าไปใน params ก่อนแล้ว
    params.push(oldName);

    const [results] = await db.query(sql, params);

    if (results.affectedRows > 0) {
      res.json({ success: true, message: "แก้ไขข้อมูลผู้ใช้สำเร็จ!" });
    } else {
      res
        .status(404)
        .json({ success: false, message: "ไม่พบผู้ใช้ที่ต้องการแก้ไข" });
    }
  } catch (error) {
    console.error("❌ Admin update profile error:", error);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล",
    });
  }
});

///////////////////// local host //////////////////////////////
// app.patch("/api/updateProfileByAdmin/:name", async (req, res) => {
//   const oldName = req.params.name;
//   const { newName, newPassword, newRole } = req.body;

//   if (!newName && !newPassword && !newRole) {
//     return res
//       .status(400)
//       .json({ success: false, message: "กรุณาระบุข้อมูลที่ต้องการแก้ไข" });
//   }

//   try {
//     const updates = [];
//     const params = [];

//     // 1. จัดการการเปลี่ยนชื่อผู้ใช้
//     if (newName && newName !== oldName) {
//       // ตรวจสอบชื่อใหม่ว่าถูกใช้ไปแล้วหรือไม่
//       const checkSql = "SELECT name FROM testdb.user WHERE name = ?";
//       const [existingUsers] = await db.query(checkSql, [newName]);
//       if (existingUsers.length > 0) {
//         return res
//           .status(409)
//           .json({ success: false, message: "ชื่อผู้ใช้ใหม่นี้ถูกใช้แล้ว" });
//       }
//       updates.push("name = ?");
//       params.push(newName);
//     }

//     // 2. จัดการการเปลี่ยนรหัสผ่าน (ถ้ามีการป้อนรหัสผ่านใหม่)
//     if (newPassword) {
//       if (newPassword.length < 6) {
//         // ตัวอย่างการตรวจสอบความยาวขั้นต่ำ
//         return res.status(400).json({
//           success: false,
//           message: "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร",
//         });
//       }
//       // เข้ารหัสรหัสผ่านใหม่ด้วย bcrypt
//       const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
//       updates.push("password = ?");
//       params.push(hashedPassword);
//     }

//     // 3. จัดการการเปลี่ยนบทบาท
//     if (newRole) {
//       if (newRole !== "admin" && newRole !== "user") {
//         return res
//           .status(400)
//           .json({ success: false, message: "บทบาทไม่ถูกต้อง" });
//       }
//       updates.push("role = ?");
//       params.push(newRole);
//     }

//     // รวม SQL Query และทำการอัปเดต
//     const sql = `UPDATE testdb.user SET ${updates.join(", ")} WHERE name = ?`;

//     // หากมีการเปลี่ยนชื่อผู้ใช้ ต้องใช้ชื่อเดิม (oldName) ในการค้นหา
//     // แต่ถ้าเปลี่ยนชื่อ, อัปเดต name = ? จะถูกเพิ่มเข้าไปใน params ก่อนแล้ว
//     params.push(oldName);

//     const [results] = await db.query(sql, params);

//     if (results.affectedRows > 0) {
//       res.json({ success: true, message: "แก้ไขข้อมูลผู้ใช้สำเร็จ!" });
//     } else {
//       res
//         .status(404)
//         .json({ success: false, message: "ไม่พบผู้ใช้ที่ต้องการแก้ไข" });
//     }
//   } catch (error) {
//     console.error("❌ Admin update profile error:", error);
//     res.status(500).json({
//       success: false,
//       message: "เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล",
//     });
//   }
// });

//////////////////// TiDB data base //////////////////////
app.delete("/api/deleteuser/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const sql = "DELETE FROM test.user WHERE id = ?";
    const [results] = await db.query(sql, [id]);

    if (results.affectedRows > 0) {
      res.json({ success: true, message: "ลบผู้ใช้สำเร็จ" });
    } else {
      res
        .status(404)
        .json({ success: false, message: "ไม่พบผู้ใช้ ID นี้ที่ต้องการลบ" });
    }
  } catch (error) {
    console.error("❌ Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล",
    });
  }
});

///////////////// local host ////////////////////
// app.delete("/api/deleteuser/:id", async (req, res) => {
//   const { id } = req.params;

//   try {
//     const sql = "DELETE FROM testdb.user WHERE id = ?";
//     const [results] = await db.query(sql, [id]);

//     if (results.affectedRows > 0) {
//       res.json({ success: true, message: "ลบผู้ใช้สำเร็จ" });
//     } else {
//       res
//         .status(404)
//         .json({ success: false, message: "ไม่พบผู้ใช้ ID นี้ที่ต้องการลบ" });
//     }
//   } catch (error) {
//     console.error("❌ Delete user error:", error);
//     res.status(500).json({
//       success: false,
//       message: "เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล",
//     });
//   }
// });

//---
////////////TiDB data base ///////////////////
// POST /api/register (โค้ดเดิมที่ถูกต้องแล้ว)
app.post("/api/register", async (req, res) => {
  const { name, password, role } = req.body;

  if (!name || !password || !role) {
    return res.status(400).json({
      success: false,
      message: "ชื่อผู้ใช้, รหัสผ่าน, และบทบาท จำเป็นต้องระบุ",
    });
  }

  try {
    const [maxIdResult] = await db.query(
      "SELECT MAX(id) AS max_id FROM test.user",
    );
    const newId = (maxIdResult[0].max_id || 0) + 1;
    const checkSql = "SELECT name FROM test.user WHERE name = ?";
    const [existingUsers] = await db.query(checkSql, [name]);

    if (existingUsers.length > 0) {
      return res
        .status(409)
        .json({ success: false, message: "ชื่อผู้ใช้นี้ถูกใช้แล้ว" });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const insertSql =
      "INSERT INTO test.user (id, name, password, role, create_at, update_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())";
    const [results] = await db.query(insertSql, [
      newId,
      name,
      hashedPassword,
      role,
    ]);

    res.json({
      success: true,
      message: "ลงทะเบียนสำเร็จ!",
      userID: newId,
    });
  } catch (error) {
    console.error("❌ Registration error:", error);
    return res.status(500).json({ success: false, message: "Database error" });
  }
});

//////////////////////local host ////////////////////////////////
// app.post("/api/register", async (req, res) => {
//   const { name, password, role } = req.body;

//   if (!name || !password || !role) {
//     return res.status(400).json({
//       success: false,
//       message: "ชื่อผู้ใช้, รหัสผ่าน, และบทบาท จำเป็นต้องระบุ",
//     });
//   }

//   try {
//     const checkSql = "SELECT name FROM testdb.user WHERE name = ?";
//     const [existingUsers] = await db.query(checkSql, [name]);

//     if (existingUsers.length > 0) {
//       return res
//         .status(409)
//         .json({ success: false, message: "ชื่อผู้ใช้นี้ถูกใช้แล้ว" });
//     }

//     const hashedPassword = await bcrypt.hash(password, saltRounds);

//     const insertSql =
//       "INSERT INTO testdb.user (name, password, role) VALUES (?, ?, ?)";
//     await db.query(insertSql, [name, hashedPassword, role]);

//     res.json({
//       success: true,
//       message: "ลงทะเบียนสำเร็จ!",
//     });
//   } catch (error) {
//     console.error("❌ Registration error:", error);
//     return res.status(500).json({ success: false, message: "Database error" });
//   }
// });

//---

// ส่วน API อื่นๆ ที่เหลือ ให้ปรับแก้จาก db.query(...) เป็น await db.query(...) ทั้งหมด
//////////////////////local host/////////////////////
// app.post("/api/order", async (req, res) => {
//   const { tablenum, listorder, qty, price, total_price } = req.body;
//   if (!tablenum || !listorder || !qty) {
//     return res.status(400).json({
//       success: false,
//       message: "tableNumber, listOrder, qty required",
//     });
//   }
//   try {
//     const sql =
//       "INSERT INTO testdb.listorder (tablenum, listorder, qty, price, total_price, status) VALUES (?, ?, ?, ?, ?, 'pending')";
//     const [results] = await db.query(sql, [
//       tablenum,
//       listorder,
//       qty,
//       price,
//       total_price,
//     ]);
//     res.json({
//       success: true,
//       message: "Order added successfully",
//       orderId: results.insertId,
//     });
//   } catch (err) {
//     console.error("❌ Query error:", err);
//     res.status(500).json({ success: false, message: "Database error" });
//   }
// });

//////////////////TiDB data base /////////////////////
app.post("/api/order", async (req, res) => {
  const { tablenum, listorder, qty, price, total_price } = req.body;
  if (!tablenum || !listorder || !qty) {
    return res.status(400).json({
      success: false,
      message: "tableNumber, listOrder, qty required",
    });
  }
  try {
    // 1. หา ID ที่มากที่สุดในปัจจุบัน (หรือ 0 ถ้าไม่มีข้อมูลเลย)
    const [maxIdResult] = await db.query(
      "SELECT MAX(id) AS max_id FROM test.listorder",
    );
    const newId = (maxIdResult[0].max_id || 0) + 1; // 2. แก้ไข SQL Query: เพิ่ม 'id' ในคอลัมน์ และเพิ่ม '?' สำหรับค่า id ใหม่
    const sql =
      "INSERT INTO test.listorder (id, tablenum, listorder, qty, price, total_price, status,update_status,create_at,update_at) VALUES (?, ?, ?, ?, ?, ?, 'pending',CURRENT_TIMESTAMP(),NOW(),CURRENT_TIMESTAMP())"; // 3. แก้ไข Array ของค่า: เพิ่ม newId เป็นค่าแรก
    const [results] = await db.query(sql, [
      newId, // <--- เพิ่มค่า ID ใหม่ที่คำนวณได้
      tablenum,
      listorder,
      qty,
      price,
      total_price,
    ]);
    res.json({
      success: true,
      message: "Order added successfully",
      orderId: newId, // ใช้ newId แทน results.insertId
    });
  } catch (err) {
    console.error("❌ Query error:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

//---

////////////////////////TiDB data base////////////////////
app.patch("/api/completeOrder", async (req, res) => {
  const { id } = req.body;

  try {
    // --- 1. อัปเดตสถานะออเดอร์ที่ส่งมา ---
    const updateSql = `
            UPDATE listorder 
            SET status = 'completed', update_status = CURRENT_TIMESTAMP() 
            WHERE id = ?;
        `;
    const [updateResult] = await db.query(updateSql, [id]);

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบออเดอร์ หรือออเดอร์เสร็จสิ้นไปแล้ว",
      });
    }

    // --- 2. ดึงหมายเลขโต๊ะ (tablenum) ของออเดอร์ที่เพิ่งอัปเดต ---
    const getTablenumSql = `
            SELECT tablenum FROM listorder WHERE id = ?;
        `;
    const [tablenumRows] = await db.query(getTablenumSql, [id]);

    if (tablenumRows.length === 0) {
      // ไม่ควรเกิดขึ้น แต่เพื่อความปลอดภัย
      return res.json({
        success: true,
        message: "ออเดอร์เสร็จสิ้นแล้ว แต่ไม่พบโต๊ะ",
      });
    }

    const tablenum = tablenumRows[0].tablenum;

    // --- 3. ตรวจสอบออเดอร์ที่เหลือของโต๊ะนั้น ---
    const checkRemainingSql = `
            SELECT COUNT(id) AS remainingOrders 
            FROM listorder 
            WHERE tablenum = ? AND status != 'completed' ;
        `;
    // *หมายเหตุ: ผมเพิ่ม status != 'paid' เข้ามาเผื่อว่าออเดอร์นั้นถูก mark ว่า Paid แล้ว แต่ยังไม่เสร็จสิ้น*
    // *ถ้า Logic การเก็บข้อมูลของคุณใช้แค่ 'completed' ก็สามารถตัดออกได้*

    const [remainingRows] = await db.query(checkRemainingSql, [tablenum]);
    const remainingCount = remainingRows[0].remainingOrders;

    let clearGuestSession = false;
    if (remainingCount === 0) {
      // 4. ถ้าไม่มีออเดอร์ที่รอทำแล้ว ให้ตั้งค่าล้าง Session
      clearGuestSession = true;
    }

    // ส่งผลลัพธ์กลับไปให้ Frontend
    res.json({
      success: true,
      message: "ออเดอร์เสร็จสิ้นและบันทึกยอดขายแล้ว",
      tablenum: tablenum, // ส่งหมายเลขโต๊ะกลับไปด้วย
      clearGuestSession: clearGuestSession, // ส่งค่านี้กลับไปให้ Frontend ทำการลบ localStorage
    });
  } catch (err) {
    console.error("❌ Error completing order:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

////////////////////////local host////////////////////
// app.patch("/api/completeOrder", async (req, res) => {
//   const { id } = req.body;

//   try {
//     // --- 1. อัปเดตสถานะออเดอร์ที่ส่งมา ---
//     const updateSql = `
//             UPDATE listorder
//             SET status = 'completed', update_status = CURRENT_TIMESTAMP()
//             WHERE id = ?;
//         `;
//     const [updateResult] = await db.query(updateSql, [id]);

//     if (updateResult.affectedRows === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "ไม่พบออเดอร์ หรือออเดอร์เสร็จสิ้นไปแล้ว",
//       });
//     }

//     // --- 2. ดึงหมายเลขโต๊ะ (tablenum) ของออเดอร์ที่เพิ่งอัปเดต ---
//     const getTablenumSql = `
//             SELECT tablenum FROM listorder WHERE id = ?;
//         `;
//     const [tablenumRows] = await db.query(getTablenumSql, [id]);

//     if (tablenumRows.length === 0) {
//       // ไม่ควรเกิดขึ้น แต่เพื่อความปลอดภัย
//       return res.json({
//         success: true,
//         message: "ออเดอร์เสร็จสิ้นแล้ว แต่ไม่พบโต๊ะ",
//       });
//     }

//     const tablenum = tablenumRows[0].tablenum;

//     // --- 3. ตรวจสอบออเดอร์ที่เหลือของโต๊ะนั้น ---
//     const checkRemainingSql = `
//             SELECT COUNT(id) AS remainingOrders
//             FROM listorder
//             WHERE tablenum = ? AND status != 'completed' ;
//         `;
//     // *หมายเหตุ: ผมเพิ่ม status != 'paid' เข้ามาเผื่อว่าออเดอร์นั้นถูก mark ว่า Paid แล้ว แต่ยังไม่เสร็จสิ้น*
//     // *ถ้า Logic การเก็บข้อมูลของคุณใช้แค่ 'completed' ก็สามารถตัดออกได้*

//     const [remainingRows] = await db.query(checkRemainingSql, [tablenum]);
//     const remainingCount = remainingRows[0].remainingOrders;

//     let clearGuestSession = false;
//     if (remainingCount === 0) {
//       // 4. ถ้าไม่มีออเดอร์ที่รอทำแล้ว ให้ตั้งค่าล้าง Session
//       clearGuestSession = true;
//     }

//     // ส่งผลลัพธ์กลับไปให้ Frontend
//     res.json({
//       success: true,
//       message: "ออเดอร์เสร็จสิ้นและบันทึกยอดขายแล้ว",
//       tablenum: tablenum, // ส่งหมายเลขโต๊ะกลับไปด้วย
//       clearGuestSession: clearGuestSession, // ส่งค่านี้กลับไปให้ Frontend ทำการลบ localStorage
//     });
//   } catch (err) {
//     console.error("❌ Error completing order:", err);
//     res.status(500).json({ success: false, message: "Database error" });
//   }
// });

app.patch("/api/doneOrder", async (req, res) => {
  const { id } = req.body;

  try {
    // --- 1. อัปเดตสถานะออเดอร์ที่ส่งมา ---
    const updateSql = `
            UPDATE listorder 
            SET status = 'done', update_status = CURRENT_TIMESTAMP()
            WHERE id = ?;
        `;
    const [updateResult] = await db.query(updateSql, [id]);

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบออเดอร์ หรือออเดอร์เสร็จสิ้นไปแล้ว",
      });
    }

    // --- 2. ดึงหมายเลขโต๊ะ (tablenum) ของออเดอร์ที่เพิ่งอัปเดต ---
    const getTablenumSql = `
            SELECT tablenum FROM listorder WHERE id = ?;
        `;
    const [tablenumRows] = await db.query(getTablenumSql, [id]);

    if (tablenumRows.length === 0) {
      // ไม่ควรเกิดขึ้น แต่เพื่อความปลอดภัย
      return res.json({
        success: true,
        message: "ออเดอร์เสร็จสิ้นแล้ว แต่ไม่พบโต๊ะ",
      });
    }

    const tablenum = tablenumRows[0].tablenum;

    // --- 3. ตรวจสอบออเดอร์ที่เหลือของโต๊ะนั้น ---
    const checkRemainingSql = `
            SELECT COUNT(id) AS remainingOrders 
            FROM listorder 
            WHERE tablenum = ? AND status = 'pending' ;
        `;
    // *หมายเหตุ: ผมเพิ่ม status != 'paid' เข้ามาเผื่อว่าออเดอร์นั้นถูก mark ว่า Paid แล้ว แต่ยังไม่เสร็จสิ้น*
    // *ถ้า Logic การเก็บข้อมูลของคุณใช้แค่ 'completed' ก็สามารถตัดออกได้*

    const [remainingRows] = await db.query(checkRemainingSql, [tablenum]);
    const remainingCount = remainingRows[0].remainingOrders;

    let clearGuestSession = false;
    if (remainingCount === 0) {
      // 4. ถ้าไม่มีออเดอร์ที่รอทำแล้ว ให้ตั้งค่าล้าง Session
      clearGuestSession = true;
    }

    // ส่งผลลัพธ์กลับไปให้ Frontend
    res.json({
      success: true,
      message: "ออเดอร์เสร็จสิ้นและบันทึกยอดขายแล้ว",
      tablenum: tablenum, // ส่งหมายเลขโต๊ะกลับไปด้วย
      clearGuestSession: clearGuestSession, // ส่งค่านี้กลับไปให้ Frontend ทำการลบ localStorage
    });
  } catch (err) {
    console.error("❌ Error completing order:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

//---
//////////////////////TiDB data base//////////////////
app.post("/api/getorder", async (req, res) => {
  try {
    const sql = "SELECT * FROM test.listorder ORDER BY id DESC LIMIT 1000";
    const [results] = await db.query(sql);
    res.json({ success: true, orders: results });
  } catch (err) {
    console.error("❌ Query error:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

////////////////////local host///////////////////////
// app.post("/api/getorder", async (req, res) => {
//   try {
//     const sql = "SELECT * FROM testdb.listorder ORDER BY id DESC LIMIT 1000";
//     const [results] = await db.query(sql);
//     res.json({ success: true, orders: results });
//   } catch (err) {
//     console.error("❌ Query error:", err);
//     res.status(500).json({ success: false, message: "Database error" });
//   }
// });

//---
///////////////////TiDB data base///////////////////////
app.patch("/api/updateOrder", async (req, res) => {
  const { id, tablenum, listorder, qty, price, total_price } = req.body;
  if (!id || !tablenum || !listorder || !qty) {
    return res.status(400).json({
      success: false,
      message: "id, tableNumber, listOrder, qty required",
    });
  }
  try {
    const sql =
      "UPDATE test.listorder SET tablenum = ?, listorder = ?, qty = ?, price = ?, total_price = ?, update_at = CURRENT_TIMESTAMP() WHERE id = ?";
    const [results] = await db.query(sql, [
      tablenum,
      listorder,
      qty,
      price,
      total_price,
      id,
    ]);
    if (results.affectedRows > 0) {
      res.json({ success: true, message: "Update order successfully" });
    } else {
      res.status(404).json({ success: false, message: "Order not found" });
    }
  } catch (err) {
    console.error("❌ Query error:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

//////////////////////local host/////////////////////////
// app.patch("/api/updateOrder", async (req, res) => {
//   const { id, tablenum, listorder, qty, price, total_price } = req.body;
//   if (!id || !tablenum || !listorder || !qty) {
//     return res.status(400).json({
//       success: false,
//       message: "id, tableNumber, listOrder, qty required",
//     });
//   }
//   try {
//     const sql =
//       "UPDATE testdb.listorder SET tablenum = ?, listorder = ?, qty = ?, price = ?, total_price = ? WHERE id = ?";
//     const [results] = await db.query(sql, [
//       tablenum,
//       listorder,
//       qty,
//       price,
//       total_price,
//       id,
//     ]);
//     if (results.affectedRows > 0) {
//       res.json({ success: true, message: "Update order successfully" });
//     } else {
//       res.status(404).json({ success: false, message: "Order not found" });
//     }
//   } catch (err) {
//     console.error("❌ Query error:", err);
//     res.status(500).json({ success: false, message: "Database error" });
//   }
// });

//---
//////////////////////TiDB data base///////////////////
app.delete("/api/deleteOrder/:id", async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ success: false, message: "id required" });
  }
  try {
    const sql = "DELETE FROM test.listorder WHERE id = ?";
    const [results] = await db.query(sql, [id]);
    if (results.affectedRows > 0) {
      res.json({ success: true, message: "Delete order successfully" });
    } else {
      res.status(404).json({ success: false, message: "Order not found" });
    }
  } catch (err) {
    console.error("❌ Query error:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

/////////////////////local host/////////////////////////
// app.delete("/api/deleteOrder/:id", async (req, res) => {
//   const { id } = req.params;
//   if (!id) {
//     return res.status(400).json({ success: false, message: "id required" });
//   }
//   try {
//     const sql = "DELETE FROM testdb.listorder WHERE id = ?";
//     const [results] = await db.query(sql, [id]);
//     if (results.affectedRows > 0) {
//       res.json({ success: true, message: "Delete order successfully" });
//     } else {
//       res.status(404).json({ success: false, message: "Order not found" });
//     }
//   } catch (err) {
//     console.error("❌ Query error:", err);
//     res.status(500).json({ success: false, message: "Database error" });
//   }
// });

//---
////////////////////TiDB data base////////////////////
app.post("/api/getmenu", async (req, res) => {
  try {
    const sql = "SELECT * FROM test.masterorder ORDER BY id DESC LIMIT 1000";
    const [results] = await db.query(sql);
    res.json({ success: true, menu: results });
  } catch (err) {
    console.error("❌ Query error:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

/////////////////////local host/////////////////////////
// app.post("/api/getmenu", async (req, res) => {
//   try {
//     const sql = "SELECT * FROM testdb.masterorder ORDER BY id DESC LIMIT 1000";
//     const [results] = await db.query(sql);
//     res.json({ success: true, menu: results });
//   } catch (err) {
//     console.error("❌ Query error:", err);
//     res.status(500).json({ success: false, message: "Database error" });
//   }
// });

//---
//////////////////////TiDB database////////////////
app.post("/api/addmenu", upload.single("image"), async (req, res) => {
  const { menuname, price } = req.body;
  const image = req.file ? req.file.path : null;

  if (!menuname || !price || !image) {
    return res
      .status(400)
      .json({ success: false, message: "menuname, price and image required" });
  }
  try {
    const [maxIdResult] = await db.query(
      "SELECT MAX(id) AS max_id FROM test.masterorder",
    );
    const newId = (maxIdResult[0].max_id || 0) + 1;

    const sql =
      "INSERT INTO test.masterorder (id, ordername, price,image, create_at, update_at) VALUES (?, ?, ?,?, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())";
    const [results] = await db.query(sql, [newId, menuname, price, image]);
    res.json({
      success: true,
      message: "Menu added successfully",
      orderId: results.insertId,
    });
  } catch (err) {
    console.error("❌ Query error:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

//////////////////local host//////////////////
// app.post("/api/addmenu", async (req, res) => {
//   const { menuname, price } = req.body;
//   if (!menuname || !price) {
//     return res
//       .status(400)
//       .json({ success: false, message: "menuname, price required" });
//   }
//   try {
//     const sql =
//       "INSERT INTO testdb.masterorder (ordername, price) VALUES (?, ?)";
//     const [results] = await db.query(sql, [menuname, price]);
//     res.json({
//       success: true,
//       message: "Menu added successfully",
//       orderId: results.insertId,
//     });
//   } catch (err) {
//     console.error("❌ Query error:", err);
//     res.status(500).json({ success: false, message: "Database error" });
//   }
// });

//---
//////////////////////TiDB data base//////////////////////
app.patch("/api/updatemenu", upload.none(), async (req, res) => {
  const { id, menuname, price, image } = req.body;
  if (!id || !menuname || !price) {
    return res.status(400).json({
      success: false,
      message: "id, menuname, price and image required",
    });
  }
  let query = "";
  let data = [];

  if (image) {
    query =
      "UPDATE test.masterorder SET ordername=?, price=?, image=?, update_at=NOW() WHERE id=?";
    data = [menuname, price, image, id];
  } else {
    query =
      "UPDATE test.masterorder SET ordername=?, price=?, update_at=NOW() WHERE id=?";
    data = [menuname, price, id];
  }

  try {
    await db.query(query, data);
    res.json({ success: true, message: "อัปเดตเมนูสำเร็จ" });
  } catch (err) {
    res.status(500).json({ success: false, error: "อัปเดตไม่สำเร็จ" });
  }
});

/////////////////////local host///////////////////////
// app.patch("/api/updatemenu", async (req, res) => {
//   const { id, menuname, price } = req.body;
//   if (!id || !menuname || !price) {
//     return res
//       .status(400)
//       .json({ success: false, message: "id, menuname, price required" });
//   }
//   try {
//     const sql =
//       "UPDATE testdb.masterorder SET ordername = ?, price = ? WHERE id = ?";
//     const [results] = await db.query(sql, [menuname, price, id]);
//     if (results.affectedRows > 0) {
//       res.json({ success: true, message: "Update menu successfully" });
//     } else {
//       res.status(404).json({ success: false, message: "Menu not found" });
//     }
//   } catch (err) {
//     console.error("❌ Query error:", err);
//     res.status(500).json({ success: false, message: "Database error" });
//   }
// });

//---
///////////////////////////TiDB data base//////////////////////////////
app.delete("/api/deletemenu/:id", async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ success: false, message: "id required" });
  }
  try {
    const sql = "DELETE FROM test.masterorder WHERE id = ?";
    const [results] = await db.query(sql, [id]);
    if (results.affectedRows > 0) {
      res.json({ success: true, message: "Delete order successfully" });
    } else {
      res.status(404).json({ success: false, message: "Order not found" });
    }
  } catch (err) {
    console.error("❌ Query error:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

///////////////////////local host/////////////////////////////
// app.delete("/api/deletemenu/:id", async (req, res) => {
//   const { id } = req.params;
//   if (!id) {
//     return res.status(400).json({ success: false, message: "id required" });
//   }
//   try {
//     const sql = "DELETE FROM testdb.masterorder WHERE id = ?";
//     const [results] = await db.query(sql, [id]);
//     if (results.affectedRows > 0) {
//       res.json({ success: true, message: "Delete order successfully" });
//     } else {
//       res.status(404).json({ success: false, message: "Order not found" });
//     }
//   } catch (err) {
//     console.error("❌ Query error:", err);
//     res.status(500).json({ success: false, message: "Database error" });
//   }
// });

// ดึงจำนวน "กำลังทำอาหาร" (Pending Count)
///////////////////////////////TiDB data base///////////////////////////////
app.post("/api/getPendingOrderCount", async (req, res) => {
  try {
    const sql =
      "SELECT COUNT(*) AS pending_count FROM test.listorder WHERE status = 'pending';";
    const [results] = await db.query(sql);
    const pendingCount = results.length > 0 ? results[0].pending_count : 0;
    res.json({ success: true, pendingCount: pendingCount });
  } catch (err) {
    console.error("❌ Error fetching pending count:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

///////////////////////local host/////////////////////////////////
// app.post("/api/getPendingOrderCount", async (req, res) => {
//   try {
//     const sql =
//       "SELECT COUNT(*) AS pending_count FROM testdb.listorder WHERE status = 'pending';";
//     const [results] = await db.query(sql);
//     const pendingCount = results.length > 0 ? results[0].pending_count : 0;
//     res.json({ success: true, pendingCount: pendingCount });
//   } catch (err) {
//     console.error("❌ Error fetching pending count:", err);
//     res.status(500).json({ success: false, message: "Database error" });
//   }
// });

// ดึงยอดขายรวมและออเดอร์วันนี้ (Total Sales & Today's Orders)
///////////////////////TiDB data base////////////////////////
app.post("/api/getSalesSummary", async (req, res) => {
  try {
    // 1. ยอดขายรวมตลอดกาล (Total Sales)
    const sqlTotalSales = `
            SELECT SUM(total_price) AS total_sales
            FROM test.listorder
            WHERE status = 'completed';
        `;

    // 2. จำนวนออเดอร์วันนี้ (Today's Order Count)
    const sqlTodayOrdersCount = `
            SELECT COUNT(id) AS today_orders_count
            FROM test.listorder
            WHERE status = 'completed'
            AND DATE(update_status) = CURDATE();
        `;

    // 3. **✅ ยอดขายรวมวันนี้ (Today's Sales Amount)**
    const sqlTodaySalesAmount = `
            SELECT SUM(total_price) AS today_sales_amount
            FROM test.listorder
            WHERE status = 'completed'
            AND DATE(update_status) = CURDATE();
        `;

    const [totalResults] = await db.query(sqlTotalSales);
    const [todayCountResults] = await db.query(sqlTodayOrdersCount);
    const [todayAmountResults] = await db.query(sqlTodaySalesAmount); // ✅ ดึงยอดขายวันนี้

    const totalSales =
      totalResults.length > 0 && totalResults[0].total_sales !== null
        ? totalResults[0].total_sales
        : 0;
    const todayOrders =
      todayCountResults.length > 0
        ? todayCountResults[0].today_orders_count
        : 0;
    // ✅ เตรียมค่าใหม่
    const todaySalesAmount =
      todayAmountResults.length > 0 &&
      todayAmountResults[0].today_sales_amount !== null
        ? todayAmountResults[0].today_sales_amount
        : 0;

    res.json({
      success: true,
      totalSales: totalSales,
      todayOrders: todayOrders,
      todaySalesAmount: todaySalesAmount, // ✅ ส่งค่าใหม่กลับไป
    });
  } catch (err) {
    console.error("❌ Error fetching sales summary:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

///////////////////////local host///////////////////////////
// app.post("/api/getSalesSummary", async (req, res) => {
//   try {
//     // 1. ยอดขายรวมตลอดกาล (Total Sales)
//     const sqlTotalSales = `
//             SELECT SUM(total_price) AS total_sales
//             FROM testdb.listorder
//             WHERE status = 'completed';
//         `;

//     // 2. จำนวนออเดอร์วันนี้ (Today's Order Count)
//     const sqlTodayOrdersCount = `
//             SELECT COUNT(id) AS today_orders_count
//             FROM testdb.listorder
//             WHERE status = 'completed'
//             AND DATE(update_status) = CURDATE();
//         `;

//     // 3. **✅ ยอดขายรวมวันนี้ (Today's Sales Amount)**
//     const sqlTodaySalesAmount = `
//             SELECT SUM(total_price) AS today_sales_amount
//             FROM testdb.listorder
//             WHERE status = 'completed'
//             AND DATE(update_status) = CURDATE();
//         `;

//     const [totalResults] = await db.query(sqlTotalSales);
//     const [todayCountResults] = await db.query(sqlTodayOrdersCount);
//     const [todayAmountResults] = await db.query(sqlTodaySalesAmount); // ✅ ดึงยอดขายวันนี้

//     const totalSales =
//       totalResults.length > 0 && totalResults[0].total_sales !== null
//         ? totalResults[0].total_sales
//         : 0;
//     const todayOrders =
//       todayCountResults.length > 0
//         ? todayCountResults[0].today_orders_count
//         : 0;
//     // ✅ เตรียมค่าใหม่
//     const todaySalesAmount =
//       todayAmountResults.length > 0 &&
//       todayAmountResults[0].today_sales_amount !== null
//         ? todayAmountResults[0].today_sales_amount
//         : 0;

//     res.json({
//       success: true,
//       totalSales: totalSales,
//       todayOrders: todayOrders,
//       todaySalesAmount: todaySalesAmount, // ✅ ส่งค่าใหม่กลับไป
//     });
//   } catch (err) {
//     console.error("❌ Error fetching sales summary:", err);
//     res.status(500).json({ success: false, message: "Database error" });
//   }
// });

// API สำหรับดึงข้อมูลยอดขายรายวันสำหรับกราฟ
////////////////////TiDB data base///////////////////
app.post("/api/getDailySales", async (req, res) => {
  try {
    // 🟢 แก้ไข SQL เพื่อดึงยอดขายแบบรวมตาม 'วันที่' ที่แท้จริง (ตัดเวลาออก)
    const sql = `
        SELECT 
            DATE_FORMAT(update_status, '%Y-%m-%d') AS day, 
            SUM(total_price) AS sales,
            NULL AS day_order 
        FROM test.listorder 
        WHERE 
            status = 'completed'
        GROUP BY day
        ORDER BY day; 
    `;

    const [results] = await db.query(sql);

    // ❌ ลบ Logic การ map ชื่อวัน 7 วันทิ้ง
    // Frontend จะจัดการการแสดงผลจาก update_at โดยตรงแล้ว
    const salesData = results.map((row) => ({
      // ใช้ update_at ที่ถูกจัดรูปแบบแล้วจาก SQL
      update_at: row.day,
      sales: parseFloat(row.sales),
    }));

    res.json({ success: true, salesData: salesData });
  } catch (err) {
    console.error("❌ Error fetching daily sales data:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

///////////////////local host///////////////////
// app.post("/api/getDailySales", async (req, res) => {
//   try {
//     // 🟢 แก้ไข SQL เพื่อดึงยอดขายแบบรวมตาม 'วันที่' ที่แท้จริง (ตัดเวลาออก)
//     const sql = `
//         SELECT
//             DATE_FORMAT(update_status, '%Y-%m-%d') AS day,
//             SUM(total_price) AS sales,
//             NULL AS day_order
//         FROM testdb.listorder
//         WHERE
//             status = 'completed'
//         GROUP BY day
//         ORDER BY day;
//     `;

//     const [results] = await db.query(sql);

//     // ❌ ลบ Logic การ map ชื่อวัน 7 วันทิ้ง
//     // Frontend จะจัดการการแสดงผลจาก update_at โดยตรงแล้ว
//     const salesData = results.map((row) => ({
//       // ใช้ update_at ที่ถูกจัดรูปแบบแล้วจาก SQL
//       update_at: row.day,
//       sales: parseFloat(row.sales),
//     }));

//     res.json({ success: true, salesData: salesData });
//   } catch (err) {
//     console.error("❌ Error fetching daily sales data:", err);
//     res.status(500).json({ success: false, message: "Database error" });
//   }
// });

///////////////////TiDB data base////////////////////
app.get("/api/guestOrders", async (req, res) => {
  // 1. ดึงหมายเลขโต๊ะจาก Query Parameter
  const tablenum = req.query.tablenum;

  if (!tablenum) {
    return res
      .status(400)
      .json({ success: false, message: "Table number is missing." });
  }

  try {
    const sql =
      "SELECT * FROM test.listorder WHERE tablenum = ? AND status != 'completed' ORDER BY create_at DESC";

    // db.query คือ function ที่คุณใช้เชื่อมต่อฐานข้อมูล
    const [results] = await db.query(sql, [tablenum]);

    res.json({ success: true, data: results });
  } catch (err) {
    console.error("❌ Guest Order Query Error:", err);
    // ส่ง HTTP 500 กลับไปหากมีข้อผิดพลาดฐานข้อมูล
    res.status(500).json({
      success: false,
      message: "Internal Server Error during data retrieval.",
    });
  }
});

/////////////////////////local host///////////////////////////
// app.get("/api/guestOrders", async (req, res) => {
//   // 1. ดึงหมายเลขโต๊ะจาก Query Parameter
//   const tablenum = req.query.tablenum;
//   if (!tablenum) {
//     return res
//       .status(400)
//       .json({ success: false, message: "Table number is missing." });
//   }
//   try {
//     const sql =
//       "SELECT * FROM testdb.listorder WHERE tablenum = ? AND status != 'completed' ORDER BY create_at DESC";

//     // db.query คือ function ที่คุณใช้เชื่อมต่อฐานข้อมูล
//     const [results] = await db.query(sql, [tablenum]);

//     res.json({ success: true, data: results });
//   } catch (err) {
//     console.error("❌ Guest Order Query Error:", err);
//     // ส่ง HTTP 500 กลับไปหากมีข้อผิดพลาดฐานข้อมูล
//     res.status(500).json({
//       success: false,
//       message: "Internal Server Error during data retrieval.",
//     });
//   }
// });

app.patch("/api/completeTableOrders", async (req, res) => {
  const { tablenum } = req.body;
  if (!tablenum) {
    return res.status(400).json({
      success: false,
      message: "ต้องระบุหมายเลขโต๊ะ เพื่อปิดยอด",
    });
  }
  try {
    const updateQuery = `
            UPDATE listorder
            SET 
                status = 'completed',
                update_status = CURRENT_TIMESTAMP() 
            WHERE 
                tablenum = ? 
                AND status != 'completed';
        `;

    //หมายเหตุ: ใช้ db.execute สำหรับ mysql2/promise หรือ client.query สำหรับ pg
    const [result] = await db.execute(updateQuery, [tablenum]);

    // 3. ตรวจสอบผลลัพธ์
    if (result.affectedRows === 0) {
      // ไม่มีการอัปเดตเกิดขึ้น อาจเป็นเพราะไม่มีออเดอร์ที่ค้างชำระ
      return res.status(200).json({
        success: false,
        message: `ไม่พบออเดอร์ค้างชำระสำหรับโต๊ะที่ ${tablenum}`,
      });
    }

    // 4. ส่งสถานะความสำเร็จกลับไป Frontend
    res.json({
      success: true,
      message: `ปิดยอดออเดอร์ทั้งหมด ${result.affectedRows} รายการของโต๊ะ ${tablenum} สำเร็จ!`,
    });
  } catch (error) {
    console.error("Error completing table orders:", error);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดภายใน Server ในการปิดยอด",
      error: error.message,
    });
  }
});

app.get("/api/takeaway", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT tablenum FROM listorder WHERE tablenum LIKE 'T%' ORDER BY tablenum DESC LIMIT 1"
    );

    let newCode = "T001";

    if (rows.length > 0 && rows[0].tablenum) {
      const lastCode = rows[0].tablenum; // เช่น "T005"
      const lastNumber = parseInt(lastCode.slice(1), 10); // ตัดตัว T
      if (!isNaN(lastNumber)) {
        const nextNumber = lastNumber + 1;
        newCode = "T" + String(nextNumber).padStart(3, "0");
      }
    }
    res.json({ code: newCode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
