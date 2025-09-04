const express = require('express');
const app = express();
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');

const upload = multer({ dest: 'public/uploads/' }); // lưu avatar upload

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- SQLite setup ---
const db = new sqlite3.Database('./gd_community.db', err => {
  if (err) console.error(err);
  else console.log('SQLite DB ready.');
});

// Tạo bảng requests
db.run(`
CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  mapId TEXT,
  ytLink TEXT,
  tagTitle INTEGER,
  votes INTEGER DEFAULT 0,
  avatar TEXT,
  voteIPs TEXT DEFAULT '[]'
)
`);

// Tạo bảng comments
db.run(`
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  requestId INTEGER,
  text TEXT
)
`);

// --- API ---
// Lấy danh sách request
app.get('/api/requests', (req, res) => {
  db.all(`SELECT * FROM requests ORDER BY id DESC`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    let pending = rows.length;
    if (!pending) return res.json([]);

    const result = [];
    rows.forEach(r => {
      db.all(`SELECT text FROM comments WHERE requestId=?`, [r.id], (err2, cmts) => {
        r.comments = cmts.map(c => c.text);

        // Nếu không có avatar, chọn ngẫu nhiên 1 trong 2 default
        if (!r.avatar) {
          const rand = Math.floor(Math.random() * 2) + 1; // 1 hoặc 2
          r.avatar = `/default/default${rand}.png`;
        }

        result.push(r);
        pending--;
        if (!pending) res.json(result);
      });
    });
  });
});

// Thêm request mới
app.post('/api/requests', upload.single('avatar'), (req, res) => {
  const { name, mapId, ytLink, tagTitle } = req.body;
  const avatar = req.file ? `/uploads/${req.file.filename}` : '';
  db.run(
    `INSERT INTO requests (name,mapId,ytLink,tagTitle,votes,avatar) VALUES (?,?,?,?,0,?)`,
    [name, mapId, ytLink, tagTitle ? 1 : 0, avatar],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get(`SELECT * FROM requests WHERE id=?`, [this.lastID], (err2, row) => {
        row.comments = [];
        // Nếu không có avatar, chọn ngẫu nhiên 1 trong 2 default
        if (!row.avatar) {
          const rand = Math.floor(Math.random() * 2) + 1;
          row.avatar = `/default/default${rand}.png`;
        }
        res.json(row);
      });
    }
  );
});

// Vote (1 IP = 1 vote)
app.post('/api/vote/:id', (req, res) => {
  const id = req.params.id;
  const ip = req.ip;

  db.get(`SELECT votes,voteIPs FROM requests WHERE id=?`, [id], (err, row) => {
    if (!row) return res.status(404).json({ error: 'Not found' });
    let voteIPs = [];
    try { voteIPs = JSON.parse(row.voteIPs || '[]'); } catch(e) {}
    if (voteIPs.includes(ip)) return res.status(403).json({ error: 'Mày đang tính buff vote đấy à ?' });
    voteIPs.push(ip);
    db.run(`UPDATE requests SET votes=votes+1, voteIPs=? WHERE id=?`, [JSON.stringify(voteIPs), id], err2 => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ success: true });
    });
  });
});

// Thêm comment
app.post('/api/comment/:id', (req, res) => {
  const { text } = req.body;
  const requestId = req.params.id;
  db.run(`INSERT INTO comments (requestId,text) VALUES (?,?)`, [requestId, text], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});
app.post("/api/delete/:id", (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM requests WHERE id=?", [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    db.run("DELETE FROM comments WHERE requestId=?", [id], function(err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ success: true });
    });
  });
});

// --- Start server ---
app.listen(3000, () => console.log('Server running on http://localhost:3000'));
