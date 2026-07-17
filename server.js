const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'database.db');

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Database connection failed:', err.message);
  } else {
    console.log('Connected to SQLite database at:', DB_PATH);
    initializeTables();
  }
});

// Setup database tables & migrations
function initializeTables() {
  db.serialize(() => {
    // 1. Trip table
    db.run(`CREATE TABLE IF NOT EXISTS trip (
      id TEXT PRIMARY KEY,
      destination_id TEXT,
      title TEXT,
      start_date TEXT,
      end_date TEXT,
      booking_info TEXT,
      is_active INTEGER DEFAULT 0
    )`);

    // Migration: add is_active to trip table if not exists
    db.run('ALTER TABLE trip ADD COLUMN is_active INTEGER DEFAULT 0', (err) => {
      if (!err) console.log('Migration: added is_active to trip table');
    });

    // 2. Activities table
    db.run(`CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      day INTEGER,
      time TEXT,
      title TEXT,
      note TEXT,
      trip_id TEXT DEFAULT 'active_trip'
    )`);

    // Migration: add trip_id to activities table if not exists
    db.run("ALTER TABLE activities ADD COLUMN trip_id TEXT DEFAULT 'active_trip'", (err) => {
      if (!err) console.log('Migration: added trip_id to activities table');
    });

    // 3. Expenses table
    db.run(`CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      name TEXT,
      category TEXT,
      currency TEXT,
      amount REAL,
      amount_krw INTEGER,
      date_str TEXT,
      trip_id TEXT DEFAULT 'active_trip'
    )`);

    // Migration: add trip_id to expenses table if not exists
    db.run("ALTER TABLE expenses ADD COLUMN trip_id TEXT DEFAULT 'active_trip'", (err) => {
      if (!err) console.log('Migration: added trip_id to expenses table');
    });

    // 4. Checklist table
    db.run(`CREATE TABLE IF NOT EXISTS checklist (
      id TEXT PRIMARY KEY,
      category TEXT,
      name TEXT,
      checked INTEGER,
      trip_id TEXT DEFAULT 'active_trip'
    )`);

    // Migration: add trip_id to checklist table if not exists
    db.run("ALTER TABLE checklist ADD COLUMN trip_id TEXT DEFAULT 'active_trip'", (err) => {
      if (!err) console.log('Migration: added trip_id to checklist table');
    });

    console.log('Database tables verified and initialized.');
  });
}

// REST API Endpoints

// 1. Trips Management APIs

// Get all trips
app.get('/api/trips', (req, res) => {
  db.all('SELECT * FROM trip ORDER BY start_date ASC', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const mapped = rows.map(r => ({
      id: r.id,
      destinationId: r.destination_id,
      title: r.title,
      startDate: r.start_date,
      endDate: r.end_date,
      bookingInfo: r.booking_info ? JSON.parse(r.booking_info) : null,
      isActive: r.is_active === 1
    }));
    res.json(mapped);
  });
});

// Get active trip (for backward compatibility and initial load)
app.get('/api/trip', (req, res) => {
  db.get('SELECT * FROM trip WHERE is_active = 1 LIMIT 1', [], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      // Fallback: if no active trip, check if any trip exists and return the first one
      db.get('SELECT * FROM trip LIMIT 1', [], (err2, fallbackRow) => {
        if (fallbackRow) {
          // auto activate the fallback trip
          db.run('UPDATE trip SET is_active = 1 WHERE id = ?', fallbackRow.id);
          res.json({
            id: fallbackRow.id,
            destinationId: fallbackRow.destination_id,
            title: fallbackRow.title,
            startDate: fallbackRow.start_date,
            endDate: fallbackRow.end_date,
            bookingInfo: fallbackRow.booking_info ? JSON.parse(fallbackRow.booking_info) : null,
            isActive: true
          });
        } else {
          res.json(null);
        }
      });
    } else {
      res.json({
        id: row.id,
        destinationId: row.destination_id,
        title: row.title,
        startDate: row.start_date,
        endDate: row.end_date,
        bookingInfo: row.booking_info ? JSON.parse(row.booking_info) : null,
        isActive: true
      });
    }
  });
});

// Add new trip
app.post('/api/trips', (req, res) => {
  const { id, destinationId, title, startDate, endDate, bookingInfo, isActive } = req.body;
  if (!destinationId || !title || !startDate || !endDate) {
    res.status(400).json({ error: 'Missing required trip fields' });
    return;
  }

  const tripId = id || 'trip_' + Date.now();
  const bookingInfoStr = bookingInfo ? JSON.stringify(bookingInfo) : null;
  const activeVal = isActive ? 1 : 0;

  db.serialize(() => {
    if (activeVal === 1) {
      // Deactivate all other trips
      db.run('UPDATE trip SET is_active = 0');
    }

    const stmt = db.prepare('INSERT OR REPLACE INTO trip (id, destination_id, title, start_date, end_date, booking_info, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)');
    stmt.run(tripId, destinationId, title, startDate, endDate, bookingInfoStr, activeVal, function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'Trip saved successfully', id: tripId });
    });
    stmt.finalize();
  });
});

// Compatibility wrapper for POST /api/trip
app.post('/api/trip', (req, res) => {
  // Save as default 'active_trip' or create random
  req.body.id = 'active_trip';
  req.body.isActive = true;
  
  // Forward to /api/trips handler
  const { id, destinationId, title, startDate, endDate, bookingInfo, isActive } = req.body;
  const bookingInfoStr = bookingInfo ? JSON.stringify(bookingInfo) : null;
  
  db.serialize(() => {
    db.run('UPDATE trip SET is_active = 0');
    const stmt = db.prepare('INSERT OR REPLACE INTO trip (id, destination_id, title, start_date, end_date, booking_info, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, destinationId, title, startDate, endDate, bookingInfoStr, 1, function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'Trip saved successfully', trip: req.body });
    });
    stmt.finalize();
  });
});

// Set active trip
app.put('/api/trips/:id/active', (req, res) => {
  const { id } = req.params;
  db.serialize(() => {
    db.run('UPDATE trip SET is_active = 0', [], (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      db.run('UPDATE trip SET is_active = 1 WHERE id = ?', id, function(err2) {
        if (err2) {
          res.status(500).json({ error: err2.message });
          return;
        }
        res.json({ message: 'Trip activated successfully', id });
      });
    });
  });
});

// Delete trip and cascade delete activities/expenses/checklists
app.delete('/api/trips/:id', (req, res) => {
  const { id } = req.params;
  db.serialize(() => {
    db.run('DELETE FROM trip WHERE id = ?', id);
    db.run('DELETE FROM activities WHERE trip_id = ?', id);
    db.run('DELETE FROM expenses WHERE trip_id = ?', id);
    db.run('DELETE FROM checklist WHERE trip_id = ?', id);
    res.json({ message: 'Trip and associated details deleted successfully', id });
  });
});


// 2. Activities APIs (with tripId filtering)
app.get('/api/activities', (req, res) => {
  const { tripId } = req.query;
  let query = 'SELECT * FROM activities';
  let params = [];
  
  if (tripId) {
    query += ' WHERE trip_id = ?';
    params.push(tripId);
  }
  
  query += ' ORDER BY day ASC, time ASC';

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/activities', (req, res) => {
  const { id, day, time, title, note, tripId } = req.body;
  if (!id || !day || !time || !title) {
    res.status(400).json({ error: 'Missing required activity fields' });
    return;
  }
  const tId = tripId || 'active_trip';

  const stmt = db.prepare('INSERT INTO activities (id, day, time, title, note, trip_id) VALUES (?, ?, ?, ?, ?, ?)');
  stmt.run(id, day, time, title, note || '', tId, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Activity added successfully', activity: req.body });
  });
  stmt.finalize();
});

app.delete('/api/activities/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM activities WHERE id = ?', id, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Activity deleted successfully', deletedCount: this.changes });
  });
});


// 3. Expenses APIs (with tripId filtering)
app.get('/api/expenses', (req, res) => {
  const { tripId } = req.query;
  let query = 'SELECT * FROM expenses';
  let params = [];

  if (tripId) {
    query += ' WHERE trip_id = ?';
    params.push(tripId);
  }

  query += ' ORDER BY id DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const mapped = rows.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      currency: r.currency,
      amount: r.amount,
      amountKrw: r.amount_krw,
      dateStr: r.date_str,
      tripId: r.trip_id
    }));
    res.json(mapped);
  });
});

app.post('/api/expenses', (req, res) => {
  const { id, name, category, currency, amount, amountKrw, dateStr, tripId } = req.body;
  if (!id || !name || !category || !currency || amount === undefined || amountKrw === undefined || !dateStr) {
    res.status(400).json({ error: 'Missing required expense fields' });
    return;
  }
  const tId = tripId || 'active_trip';

  const stmt = db.prepare('INSERT INTO expenses (id, name, category, currency, amount, amount_krw, date_str, trip_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  stmt.run(id, name, category, currency, amount, amountKrw, dateStr, tId, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Expense added successfully', expense: req.body });
  });
  stmt.finalize();
});

app.delete('/api/expenses/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM expenses WHERE id = ?', id, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Expense deleted successfully', deletedCount: this.changes });
  });
});


// 4. Checklist APIs (with tripId filtering)
app.get('/api/checklist', (req, res) => {
  const { tripId } = req.query;
  let query = 'SELECT * FROM checklist';
  let params = [];

  if (tripId) {
    query += ' WHERE trip_id = ?';
    params.push(tripId);
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const mapped = rows.map(r => ({
      id: r.id,
      category: r.category,
      name: r.name,
      checked: r.checked === 1,
      tripId: r.trip_id
    }));
    res.json(mapped);
  });
});

app.post('/api/checklist', (req, res) => {
  const { id, category, name, checked, tripId } = req.body;
  if (!id || !category || !name) {
    res.status(400).json({ error: 'Missing required checklist fields' });
    return;
  }
  const tId = tripId || 'active_trip';
  const isChecked = checked ? 1 : 0;

  const stmt = db.prepare('INSERT INTO checklist (id, category, name, checked, trip_id) VALUES (?, ?, ?, ?, ?)');
  stmt.run(id, category, name, isChecked, tId, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Checklist item added successfully', item: req.body });
  });
  stmt.finalize();
});

app.put('/api/checklist/:id', (req, res) => {
  const { id } = req.params;
  const { checked } = req.body;
  if (checked === undefined) {
    res.status(400).json({ error: 'Missing checked status' });
    return;
  }
  const isChecked = checked ? 1 : 0;

  db.run('UPDATE checklist SET checked = ? WHERE id = ?', [isChecked, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Checklist item toggled successfully', updatedCount: this.changes });
  });
});

app.delete('/api/checklist/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM checklist WHERE id = ?', id, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Checklist item deleted successfully', deletedCount: this.changes });
  });
});

// Serve Static Frontend Assets (single port unified backend-frontend hosting)
app.use(express.static(path.join(__dirname)));

// Fallback index.html router for SPA behavior
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start express server
app.listen(PORT, () => {
  console.log(`거북코여행 Server is running on port ${PORT}`);
});
