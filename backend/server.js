// server.js
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const WebSocket = require('ws');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// User routes (signup, login, etc.)
app.post('/users', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const [result] = await pool.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, password, role]
        );

        const userId = result.insertId;

        if (role === 'mentor') {
            await pool.query('INSERT INTO mentors (user_id, skills) VALUES (?, ?)', [userId, '']);
        } else if (role === 'mentee') {
            await pool.query('INSERT INTO mentees (user_id, goals) VALUES (?, ?)', [userId, '']);
        }

        res.json({ id: userId, message: 'User created' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.get('/users', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM users');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Mentor routes
app.post('/mentors', async (req, res) => {
    try {
        const { userId, skills } = req.body;
        console.log("Received mentor skills update:", userId, skills);

        let skillsArray = [];
        try {
            skillsArray = JSON.parse(skills);
        } catch (e) {
            skillsArray = skills.split(',').map(skill => skill.trim());
        }

        const [existingMentor] = await pool.query('SELECT skills FROM mentors WHERE user_id = ?', [userId]);

        let currentSkills = [];

        if (existingMentor.length > 0 && existingMentor[0].skills) {
            try {
                currentSkills = JSON.parse(existingMentor[0].skills);
            } catch (e) {
                currentSkills = existingMentor[0].skills.split(',');
            }
        }

        // Merge new skills with existing skills (no duplicates)
        skillsArray.forEach(skill => {
            if (!currentSkills.includes(skill)) {
                currentSkills.push(skill);
            }
        });

        const updatedSkillsString = JSON.stringify(currentSkills);

        if (existingMentor.length > 0) {
            await pool.query('UPDATE mentors SET skills = ? WHERE user_id = ?', [updatedSkillsString, userId]);
            res.json({ message: 'Mentor skills updated' });
        } else {
            await pool.query('INSERT INTO mentors (user_id, skills) VALUES (?, ?)', [userId, updatedSkillsString]);
            res.json({ message: 'Mentor skills added' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.get('/mentors/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT skills FROM mentors WHERE user_id = ?', [id]);
        res.json(rows[0] && rows[0].skills ? JSON.parse(rows[0].skills) : []);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/mentees', async (req, res) => {
    try {
        const { userId, goals } = req.body;
        console.log("Received mentee goals update:", userId, goals);

        let goalsArray = [];
        try {
            goalsArray = JSON.parse(goals);
        } catch (e) {
            goalsArray = goals.split(',').map(goal => goal.trim());
        }

        const [existingMentee] = await pool.query('SELECT goals FROM mentees WHERE user_id = ?', [userId]);

        let currentGoals = [];

        if (existingMentee.length > 0 && existingMentee[0].goals) {
            try {
                currentGoals = JSON.parse(existingMentee[0].goals);
            } catch (e) {
                currentGoals = existingMentee[0].goals.split(',');
            }
        }

        // Merge new goals with existing goals (no duplicates)
        goalsArray.forEach(goal => {
            if (!currentGoals.includes(goal)) {
                currentGoals.push(goal);
            }
        });

        const updatedGoalsString = JSON.stringify(currentGoals);

        if (existingMentee.length > 0) {
            await pool.query('UPDATE mentees SET goals = ? WHERE user_id = ?', [updatedGoalsString, userId]);
            res.json({ message: 'Mentee goals updated' });
        } else {
            await pool.query('INSERT INTO mentees (user_id, goals) VALUES (?, ?)', [userId, updatedGoalsString]);
            res.json({ message: 'Mentee goals added' });
        }
    } catch (err) {
        console.error("Error updating mentee goals:", err);
        res.status(500).send('Server Error');
    }
});

app.get('/mentees/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT goals FROM mentees WHERE user_id = ?', [id]);
        res.json(rows[0] && rows[0].goals ? JSON.parse(rows[0].goals) : []);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Connections routes
app.post('/connections', async (req, res) => {
    try {
        const { mentorId, menteeId } = req.body;
        const [result] = await pool.query(
            'INSERT INTO connections (mentor_id, mentee_id) VALUES (?, ?)',
            [mentorId, menteeId]
        );
        res.json({ id: result.insertId, message: 'Connection request sent' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.get('/connections/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const [rows] = await pool.query(
            'SELECT * FROM connections WHERE mentor_id = ? OR mentee_id = ?',
            [userId, userId]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.put('/connections/:connectionId', async (req, res) => {
    try {
        const { connectionId } = req.params;
        const { status, zoomLink } = req.body; // Include zoomLink in the request

        if (status === 'accepted' && zoomLink) {
            await pool.query('UPDATE connections SET status = ?, zoom_link = ? WHERE id = ?', [status, zoomLink, connectionId]);
            res.json({ message: 'Connection status updated and Zoom link added' });
        } else if (status) {
            await pool.query('UPDATE connections SET status = ? WHERE id = ?', [status, connectionId]);
            res.json({ message: 'Connection status updated' });
        } else {
            res.status(400).send('Bad Request: Status or Zoom link missing');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Message routes
app.post('/messages', async (req, res) => {
    try {
        const { senderId, receiverId, message } = req.body;
        await pool.query(
            'INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)',
            [senderId, receiverId, message]
        );
        res.json({ message: 'Message sent' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.get('/messages/:userId/:recipientId', async (req, res) => {
    try {
        const { userId, recipientId } = req.params;
        const [rows] = await pool.query(
            'SELECT * FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) ORDER BY timestamp',
            [userId, recipientId, recipientId, userId]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// New route to find mentors matching mentee's goals
app.get('/mentors/matching/:menteeId', async (req, res) => {
    try {
        const { menteeId } = req.params;

        // Get mentee's goals
        const [menteeRows] = await pool.query('SELECT goals FROM mentees WHERE user_id = ?', [menteeId]);
        if (!menteeRows || menteeRows.length === 0 || !menteeRows[0].goals) {
            return res.json([]); // No goals, no matches
        }
        const menteeGoals = JSON.parse(menteeRows[0].goals);

        // Get all mentors and their skills
        const [mentorRows] = await pool.query('SELECT users.id, mentors.skills, users.name FROM users JOIN mentors ON users.id = mentors.user_id WHERE users.role = "mentor"');

        // Filter mentors based on matching skills and mentee goals
        const matchingMentors = mentorRows.filter(mentor => {
            if (!mentor.skills) return false;
            const mentorSkills = JSON.parse(mentor.skills);
            return menteeGoals.some(goal => mentorSkills.includes(goal));
        });

        res.json(matchingMentors);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

const server = app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

// WebSocket Server
const wss = new WebSocket.Server({ server });

const clients = new Map();

wss.on('connection', (ws, req) => {
    const userId = new URLSearchParams(req.url.slice(1)).get('userId'); // get userId from query parameters
    if (userId) {
        clients.set(userId, ws);
        console.log(`Client connected with userId: ${userId}`);
    } else {
        console.log('Client connected without userId');
        ws.close();
    }

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            const { senderId, receiverId, text } = data;

            await pool.query(
                'INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)',
                [senderId, receiverId, text]
            );

            if (clients.has(receiverId)) {
                clients.get(receiverId).send(JSON.stringify({ senderId, receiverId, message: text }));
            }
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    });

    ws.on('close', () => {
        clients.forEach((client, id) => {
            if (client === ws) {
                clients.delete(id);
                console.log(`Client disconnected with userId: ${id}`);
            }
        });
    });
});