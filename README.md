# Cleaning App

Simple Express + SQLite app for assigning tasks and tracking points.

**Quick start (Windows PowerShell)**

1. Install Node.js (v14+ recommended).
2. From the repository root install required packages:

```powershell
npm install express sqlite3 body-parser
```

3. Start the server (two options):

```powershell
# run directly
node app.js

# or via npm script
npm start
```

The server will run on `http://localhost:3000` by default.

Database note
-----------
The app presently opens a SQLite database at `./database.db` (path is relative to the process working directory). If you'd like to use the existing database file `projects/oppgavedata.db`, change the database constructor in `projects/app.js`:

```js
- const db = new sqlite3.Database('./database.db');
+ const db = new sqlite3.Database('./projects/oppgavedata.db');
```

API endpoints
-------------
- `GET /api/tasks` — list tasks (includes assigned member name when set).
- `POST /api/tasks` — create a task. JSON body fields supported:
  - `title` (string)
  - `category` (string)
  - `points` (number)
  - `assignedName` (string) — will create the member if they don't exist
  - `assignedId` (number)
- `POST /api/tasks/:id/done` — mark a task done. This will:
  - insert a log entry,
  - add the task's `points` to the assigned member's `Score` (or to `userId` provided in the request body),
  - remove the task from the `Tasks` table,
  - return the updated member score when applicable.

Examples (PowerShell)
---------------------
Create a task and assign by name:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/tasks -ContentType 'application/json' -Body (@{ title='Wash dishes'; category='Kitchen'; points=5; assignedName='Alice' } | ConvertTo-Json)
```

List tasks:

```powershell
Invoke-RestMethod -Method Get -Uri http://localhost:3000/api/tasks
```

Mark a task done (credits points and deletes the task):

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/tasks/123/done -ContentType 'application/json' -Body (@{} | ConvertTo-Json)
# or include userId to credit a specific user if unassigned
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/tasks/123/done -ContentType 'application/json' -Body (@{ userId=1 } | ConvertTo-Json)
```

Examples (curl)
---------------
Create a task:

```bash
curl -X POST http://localhost:3000/api/tasks -H "Content-Type: application/json" -d '{"title":"Vacuum","category":"Living Room","points":3,"assignedName":"Bob"}'
```

Mark task done:

```bash
curl -X POST http://localhost:3000/api/tasks/123/done
```

Next suggestions
----------------
- Add a `package.json` with dependencies (or run `npm install --save express sqlite3 body-parser`).
- Add an API endpoint `GET /api/members` to list members and scores (I can add that for you).
- Add a small frontend to assign and complete tasks using the existing `projects/public/index.html`.

If you'd like, I can update the DB path to use `projects/oppgavedata.db`, add the `GET /api/members` endpoint, or create a minimal UI — tell me which you'd prefer next.
