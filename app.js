// ================================
// EXPRESS + SQLITE SERVER
// ================================
const express = require('express');
const app = express();
const Database = require('better-sqlite3');

// Load DB
const db = new Database('oppgavedata.db');

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ================================
// GET MEMBERS
// ================================
app.get('/members', (req, res) => {
    const rows = db.prepare(`
        SELECT idmember, Name, Avatar_url, sum(Points) as points
        FROM members
        inner join Logs on Logs.User_Id = members.idmember
        inner join tasks on Logs.Task_Id = tasks.idTasks group by members.idmembers
    `).all();
    res.json(rows);
});

// ================================
// GET TASKS
// ================================
app.get('/tasks', (req, res) => {
    const rows = db.prepare(`
        SELECT idTasks, Title, Category, Points, AssignedId, AssignedName, AssignedAvatar, Status
        FROM Tasks
    `).all();
    res.json(rows);
});

// ================================
// GET LOGS (JOINED WITH MEMBERS + TASKS)
// ================================
app.get('/logs', (req, res) => {
    const rows = db.prepare(`
        SELECT 
            Logs.idLogs,
            members.Name AS MemberName,
            members.Avatar_url AS MemberAvatar,  -- NOTE: Used Avatar_url as per schema
            Tasks.Title AS TaskTitle,
            Tasks.Points AS TaskPoints,
            Logs.Date_Time
        FROM Logs
        JOIN members ON members.idmembers = Logs.User_Id  -- Changed from idmembers to idmembers (as likely correct)
        JOIN Tasks ON Tasks.idTasks = Logs.Task_Id
        ORDER BY Logs.idLogs DESC
    `).all();
    res.json(rows);
});

// ================================
// ADD MEMBER
// ================================
app.post('/addMember', (req, res) => {
    const { name, avatar_url, avatar } = req.body;

    if (!name) return res.status(400).json({ error: "Name is required" });

    db.prepare(`
        INSERT INTO members (Name, Avatar_url, Score, Avatar)
        VALUES (?, ?, ?, ?)
    `).run(
        name,
        avatar_url || null,
        0,               // default score
        avatar || null   // optional avatar
    );

    res.sendStatus(201);
});

// ================================
// ADD LOG ENTRY
// ================================
app.post('/addLog', (req, res) => {
    const { user_id, task_id, datetime } = req.body;

    if (!user_id || !task_id || !datetime)
        return res.status(400).json({ error: "Missing fields" });

    db.prepare(`
        INSERT INTO Logs (User_Id, Task_Id, Date_Time)
        VALUES (?, ?, ?)
    `).run(user_id, task_id, datetime);

    res.sendStatus(201);
});

// ================================
// START SERVER
// ================================
app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
