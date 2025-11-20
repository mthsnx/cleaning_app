const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const db = new sqlite3.Database('./database.db');

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- DATABASE SETUP (ensures tables exist) ---
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS members (
        idmembers INTEGER PRIMARY KEY,
        Name TEXT,
        Avatar_url VARCHAR(400)
    )`);

  db.run(`CREATE TABLE IF NOT EXISTS Tasks (
        idTasks INTEGER PRIMARY KEY,
        Title VARCHAR(45),
        Category VARCHAR(45),
        Points INTEGER
    )`);

  db.run(`CREATE TABLE IF NOT EXISTS Logs (
        idLogs INTEGER PRIMARY KEY,
        User_Id INTEGER,
        Task_Id INTEGER,
        Date_Time DATETIME,
        FOREIGN KEY (User_Id) REFERENCES members(idmembers),
        FOREIGN KEY (Task_Id) REFERENCES Tasks(idTasks)
    )`);
});

// Ensure additional columns exist (safe on existing DB)
function addColumnIfMissing(table, columnName, columnDef, cb) {
  db.all(`PRAGMA table_info(${table})`, (err, cols) => {
    if (err) return cb(err);
    const exists = cols.some(c => c.name === columnName);
    if (exists) return cb(null);
    db.run(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`, cb);
  });
}

db.serialize(() => {
  addColumnIfMissing('Tasks', 'Assigned_To', 'Assigned_To INTEGER', (err) => {
    if (err) console.error('Failed to add Assigned_To column:', err.message);
  });

  addColumnIfMissing('members', 'Score', 'Score INTEGER DEFAULT 0', (err) => {
    if (err) console.error('Failed to add Score column:', err.message);
  });
});

// --- ROUTES ---

// Get all tasks
app.get('/api/tasks', (req, res) => {
  // Include assigned member name when available
  const sql = `SELECT Tasks.*, members.Name as AssignedName, members.Avatar_url as AssignedAvatar
               FROM Tasks LEFT JOIN members ON Tasks.Assigned_To = members.idmembers`;
  db.all(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Add a new task
app.post('/api/tasks', (req, res) => {
  const { title, category, points, assignedName, assignedId } = req.body;

  function insertTaskWithAssigned(assignedToId) {
    db.run(
      'INSERT INTO Tasks (Title, Category, Points, Assigned_To) VALUES (?, ?, ?, ?)',
      [title, category, points || 0, assignedToId || null],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, title, category, points, assignedTo: assignedToId || null });
      }
    );
  }

  if (assignedId) {
    insertTaskWithAssigned(assignedId);
    return;
  }

  if (assignedName) {
    // find or create member by name
    db.get('SELECT idmembers FROM members WHERE Name = ?', [assignedName], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (row) return insertTaskWithAssigned(row.idmembers);

      db.run('INSERT INTO members (Name) VALUES (?)', [assignedName], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        insertTaskWithAssigned(this.lastID);
      });
    });
    return;
  }

  // no assignment provided
  insertTaskWithAssigned(null);
});

// Mark task done
app.post('/api/tasks/:id/done', (req, res) => {
  const { id } = req.params;
  // When a task is done: credit the assigned member (or provided userId) with the task's points,
  // insert a log entry, and remove the task from the Tasks table.

  db.get('SELECT * FROM Tasks WHERE idTasks = ?', [id], (err, task) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const memberId = task.Assigned_To || req.body.userId || null;

    db.serialize(() => {
      // insert log (use memberId if available)
      db.run(
        'INSERT INTO Logs (User_Id, Task_Id, Date_Time) VALUES (?, ?, datetime("now"))',
        [memberId, id],
        function (err) {
          if (err) console.error('Failed to write log:', err.message);
        }
      );

      if (memberId) {
        // add points to member Score
        db.run(
          'UPDATE members SET Score = COALESCE(Score, 0) + ? WHERE idmembers = ?',
          [task.Points || 0, memberId],
          function (err) {
            if (err) console.error('Failed to update member score:', err.message);
          }
        );
      }

      // remove the task
      db.run('DELETE FROM Tasks WHERE idTasks = ?', [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        if (memberId) {
          // return updated score
          db.get('SELECT Score FROM members WHERE idmembers = ?', [memberId], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            return res.json({ success: true, memberId, score: row ? row.Score : 0 });
          });
        } else {
          return res.json({ success: true });
        }
      });
    });
  });
});

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Start server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));