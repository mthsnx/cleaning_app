const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '..', 'projects', 'oppgavedata.db');
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node removeMembers.js <idOrName> [<idOrName> ...]');
  process.exit(1);
}

const ids = args.filter(a => /^\d+$/.test(a)).map(Number);
const names = args.filter(a => !/^\d+$/.test(a));

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) { console.error('Failed to open DB:', err.message); process.exit(1); }
});

db.serialize(() => {
  db.run('BEGIN TRANSACTION');

  if (ids.length) {
    const placeholders = ids.map(() => '?').join(',');
    db.run(`UPDATE Tasks SET Assigned_To = NULL WHERE Assigned_To IN (${placeholders})`, ids, function(err) {
      if (err) console.error('Error clearing assignments for ids:', err.message);
    });
    db.run(`DELETE FROM members WHERE idmembers IN (${placeholders})`, ids, function(err) {
      if (err) console.error('Error deleting member ids:', err.message);
      else console.log('Deleted member ids:', ids);
    });
  }

  if (names.length) {
    const placeholders = names.map(() => '?').join(',');
    db.run(`UPDATE Tasks SET Assigned_To = NULL WHERE Assigned_To IN (SELECT idmembers FROM members WHERE Name IN (${placeholders}))`, names, function(err) {
      if (err) console.error('Error clearing assignments for names:', err.message);
    });
    db.run(`DELETE FROM members WHERE Name IN (${placeholders})`, names, function(err) {
      if (err) console.error('Error deleting members by name:', err.message);
      else console.log('Deleted member names:', names);
    });
  }

  db.run('COMMIT', (err) => {
    if (err) console.error('Commit error:', err.message);
    else console.log('Removal completed.');
    db.close();
  });
});
