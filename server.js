const express = require('express');
const path = require('path');
const https = require('https');
const socketIo = require('socket.io');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const session = require('express-session');
const sharedSession = require('express-socket.io-session');
const fs = require('fs');
const { body, validationResult } = require('express-validator');


const app = express();


const privateKey = fs.readFileSync('server.key', 'utf8');
const certificate = fs.readFileSync('server.cert', 'utf8');
const credentials = { key: privateKey, cert: certificate };

const server = https.createServer(credentials, app);
const io = socketIo(server);


const expressSession = session({
  secret: 'HPwOSY8OZwAmto8asoi9lNHNjUZJGufgP0wFFjyRu/s=', 
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true } // Set to true when serving over HTTPS !!!!! !!!!!
});


app.use(expressSession);

io.use(sharedSession(expressSession));

app.use(express.json());

app.use((req, res, next) => {
  console.log('Received registration request:', req.body);
  next();
});

app.use(express.static(path.join(__dirname, 'public'))); // Serve static files


const registrationValidation = [
  body('username', 'Username must be 3+ characters long')
    .exists()
    .trim()
    .isLength({ min: 3 }),
  body('password', 'Password must be 5+ characters long')
    .exists()
    .isLength({ min: 5 }),
  body().escape() // Sanitizes other fields to escape HTML entities
];

const loginValidation = [
  body('username', 'Username is required').trim().isLength({ min: 1 }),
  body('password', 'Password is required').trim().isLength({ min: 1 }),
  body().escape() // Sanitize other fields to prevent XSS
];

// Initialize MySQL Database Connection
async function initializeDatabase() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost', 
            user: 'root', 
            database: 'chatDB', 
            password: 'Xddrakerisx156'
        });
        console.log("Database connection established successfully.");
        return connection;
    } catch (err) {
        console.error('Database connection failed: ', err);
        throw err; 
    }
}

let dbConnection;
initializeDatabase().then(connection => {
    dbConnection = connection;
    startServer(); // Start the server after establishing the database connection
}).catch(err => {
    console.error('Failed to initialize database connection:', err);
});

function startServer() {
    app.use(express.static(__dirname + '/public')); // Serve static files

    app.post('/login', async (req, res) => {
      try {
          
          const { username, password } = req.body;
          const [rows] = await dbConnection.execute('SELECT * FROM users WHERE username = ?', [username]);
          
          if (rows.length > 0) {
              const user = rows[0];
        
              const match = await bcrypt.compare(password, user.password);
              if (match) {
                  
                  req.session.userId = user.id;
                  req.session.username = user.username;
  
      
                  res.json({ success: true });
              } else {
                  
                  res.json({ success: false, message: 'Incorrect username or password' });
              }
          } else {
              
              res.json({ success: false, message: 'Incorrect username or password' });
          }
        } catch (error) {
          console.error('Login error:', error);
          // Send a JSON response indicating an error with the login process
          res.status(500).json({ success: false, message: 'An error occurred during login' });
        }
    });

    app.get('/session', (req, res) => {
      if (req.session && req.session.username) {
        res.json({ isLoggedIn: true, username: req.session.username });
      } else {
        res.json({ isLoggedIn: false });
      }
    });

    app.post('/register', registrationValidation, async (req, res) => {
    
      //console.log('Received registration request: ' + JSON.stringify(req.body, null, 2)); // Debug log
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
  
      const { username, password } = req.body;

      // Make sure that password is not empty
      if (!password) {
        return res.status(400).json({ success: false, message: 'Password is required' });
      }
  
      try {
        const saltRounds = 10;
        console.log('Received registration request:', req.body);
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const [rows] = await dbConnection.execute('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
  
        if (rows.affectedRows > 0) {
          res.json({ success: true });
        } else {
          res.json({ success: false, message: 'Registration failed' });
        }
       } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          res.json({ success: false, message: 'Username is already taken' });
          } else {
          console.error('Registration error:', error);
          res.status(500).json({ success: false, message: 'An error occurred during registration' });
          }
        }
      });

    io.on('connection', (socket) => {
      console.log('A user connected');
      socket.on('disconnect', () => console.log('User disconnected'));
    
      socket.on('sendMessage', async (data) => {
        // Retrieve session from the connected socket
        const session = socket.handshake.session;
        console.log('Session:', session);
        console.log('Message Data:', data);
    
        try {
          if (dbConnection && session && session.userId) {
            // Use the userId from the session
            await dbConnection.execute(
              'INSERT INTO messages (user_id, message, created_at) VALUES (?, ?, NOW())',
              [session.userId, data.message]
            );
    
            // Broadcast the message along with the username
            io.emit('receiveMessage', {
              name: session.username,
              message: data.message
            });
          } else {
            console.error('Session or dbConnection is not set, or userId is null.');
          }
        } catch (err) {
          console.error('Failed to insert message:', err);
        }
      });
    });

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
