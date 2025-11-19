let db;

(async () => {
    const SQL = await initSqlJs({
        locateFile: file => file
    });

    // Load your hjemmeoppgaver.db SQLite file
    const response = await fetch("hjemmeoppgaver.db");
    const buffer = await response.arrayBuffer();
    db = new SQL.Database(new Uint8Array(buffer));

    refreshDropdowns();
    refreshLogs();
})();

// Add member
function addMember() {
    const name = document.getElementById("memberName").value;
    if (!name) return;

    db.run("INSERT INTO members (name) VALUES (?);", [name]);
    document.getElementById("memberName").value = "";
    refreshDropdowns();
}

// Add task
function addTask() {
    const title = document.getElementById("taskTitle").value;
    if (!title) return;

    db.run("INSERT INTO tasks (title) VALUES (?);", [title]);
    document.getElementById("taskTitle").value = "";
    refreshDropdowns();
}

// Add log entry
function addLog() {
    const member = document.getElementById("memberSelect").value;
    const task = document.getElementById("taskSelect").value;

    db.run("INSERT INTO logs (user_id, task_id) VALUES (?, ?);", [member, task]);
    refreshLogs();
}

// Update dropdown lists
function refreshDropdowns() {
    const members = db.exec("SELECT id, name FROM members")[0];
    const tasks = db.exec("SELECT id, title FROM tasks")[0];

    const mSel = document.getElementById("memberSelect");
    const tSel = document.getElementById("taskSelect");

    mSel.innerHTML = "";
    tSel.innerHTML = "";

    if (members) {
        members.values.forEach(row => {
            mSel.innerHTML += `<option value="${row[0]}">${row[1]}</option>`;
        });
    }

    if (tasks) {
        tasks.values.forEach(row => {
            tSel.innerHTML += `<option value="${row[0]}">${row[1]}</option>`;
        });
    }
}

// Show logs
function refreshLogs() {
    const result = db.exec(`
        SELECT logs.id, members.name, tasks.title, logs.date_time
        FROM logs
        JOIN members ON logs.user_id = members.id
        JOIN tasks ON logs.task_id = tasks.id
        ORDER BY logs.id DESC
    `);

    const table = document.getElementById("logTable");
    table.innerHTML = `
        <tr>
            <th>ID</th>
            <th>Member</th>
            <th>Task</th>
            <th>Date/Time</th>
        </tr>
    `;

    if (!result.length) return;

    result[0].values.forEach(row => {
        table.innerHTML += `
            <tr>
                <td>${row[0]}</td>
                <td>${row[1]}</td>
                <td>${row[2]}</td>
                <td>${row[3]}</td>
            </tr>
        `;
    });
}
