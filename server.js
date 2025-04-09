const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors());
app.use(express.static(__dirname));

let db;

function handleDisconnect() {
  db = mysql.createConnection({
    host: '165.227.235.122',
    user: 'kp807',
    password: 'FTPDLAKAMILA',
    database: 'kp807_calorietracker',
    port: 3306
  });

  db.connect(err => {
    if (err) {
      console.error('MySQL connection failed. Retrying in 2s:', err);
      setTimeout(handleDisconnect, 2000);
    } else {
      console.log('✅ Connected to MySQL');
    }
  });

  db.on('error', err => {
    console.error('MySQL error', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      handleDisconnect();
    } else {
      throw err;
    }
  });
}

handleDisconnect();


// Register
app.post('/api/register', async (req, res) => {
    console.log('Received registration request:', req.body); 
    const { username, password } = req.body;
    if (!username || !password) {
        console.log('Missing username or password');
        return res.status(400).json({ success: false, message: 'Username and password are required' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const query = 'INSERT INTO users (username, password_hash) VALUES (?, ?)';
    db.query(query, [username, password_hash], (err, result) => {
        if (err) {
            console.error('Database error:', err); 
            return res.status(500).json({ success: false, message: 'Server error or user already exists' });
        }
        res.json({ success: true });
    });
});

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const query = 'SELECT * FROM users WHERE username = ?';

    db.query(query, [username], async (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        if (results.length > 0) {
            const user = results[0];
            const match = await bcrypt.compare(password, user.password_hash);
            if (match) {
                res.json({ success: true, userId: user.id });
            } else {
                res.json({ success: false, message: 'Invalid credentials' });
            }
        } else {
            res.json({ success: false, message: 'Invalid credentials' });
        }
    });
});

// Add food
app.post('/api/addFood', (req, res) => {
    const { userId, foodName, foodCalories } = req.body;
    if (!userId || !foodName || !foodCalories) {
        return res.status(400).json({ success: false, message: 'Invalid input' });
    }

    const query = 'INSERT INTO user_calories (user_id, calories_gained, log_date) VALUES (?, ?, CURDATE())';
    db.query(query, [userId, foodCalories], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        res.json({ success: true });
    });
});

// Add workout
app.post('/api/addWorkout', (req, res) => {
    const { userId, workoutName, workoutCalories } = req.body;
    if (!userId || !workoutName || !workoutCalories) {
        return res.status(400).json({ success: false, message: 'Invalid input' });
    }

    const query = 'INSERT INTO user_calories (user_id, calories_lost, log_date) VALUES (?, ?, CURDATE())';
    db.query(query, [userId, workoutCalories], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        res.json({ success: true });
    });
});

app.get('/api/getNetCalories', (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const query = `
        SELECT 
            COALESCE(SUM(calories_gained), 0) AS totalGained, 
            COALESCE(SUM(calories_lost), 0) AS totalLost 
        FROM user_calories 
        WHERE user_id = ? AND log_date = CURDATE()
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Server error' });
        }

        if (results.length > 0) {
            const totalGained = results[0].totalGained;
            const totalLost = results[0].totalLost;
            const netCalories = totalGained - totalLost;
            res.json({ success: true, netCalories });
        } else {
            res.json({ success: true, netCalories: 0 });
        }
    });
});


// Get today's food for user
app.get('/api/getTodaysFood', (req, res) => {
    const { userId } = req.query;
    const query = `
        SELECT calories_gained, log_date 
        FROM user_calories 
        WHERE user_id = ? AND log_date = CURDATE() AND calories_gained IS NOT NULL
    `;
    db.query(query, [userId], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'DB error' });
        res.json({ success: true, data: results });
    });
});

// Get today's workouts for user
app.get('/api/getTodaysWorkouts', (req, res) => {
    const { userId } = req.query;
    const query = `
        SELECT calories_lost, log_date 
        FROM user_calories 
        WHERE user_id = ? AND log_date = CURDATE() AND calories_lost IS NOT NULL
    `;
    db.query(query, [userId], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'DB error' });
        res.json({ success: true, data: results });
    });
});


// Add a recipe
app.post('/api/addRecipe', (req, res) => {
    const { userId, recipeName, calories } = req.body;
    if (!userId || !recipeName || !calories) {
        return res.status(400).json({ success: false, message: 'Invalid input' });
    }

    const query = 'INSERT INTO user_recipes (user_id, recipe_name, calories_per_person) VALUES (?, ?, ?)';
    db.query(query, [userId, recipeName, calories], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'DB error' });
        res.json({ success: true });
    });
});

// Get all recipes for a user
app.get('/api/getRecipes', (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ success: false, message: 'User ID required' });

    db.query('SELECT * FROM user_recipes WHERE user_id = ?', [userId], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'DB error' });
        res.json({ success: true, recipes: results });
    });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});