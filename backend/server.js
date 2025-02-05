require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const bcrypt = require('bcryptjs'); // Secure passwords
const User = require('./models/User');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("MongoDB Connected"))
  .catch(err => {
    console.error("Error connecting to MongoDB", err);
    process.exit(1);
  });

// Socket.io connection
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("joinRoom", (room) => {
    socket.join(room);
  });

  socket.on("sendMessage", (data) => {
    io.to(data.room).emit("receiveMessage", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Serve pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/signup.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

// Signup Route
app.post('/signup', async (req, res) => {
  try {
    const { username, firstname, lastname, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({ username, firstname, lastname, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login Route
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    res.status(200).json({ message: 'Login successful', redirect: '/dashboard' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Start the server
server.listen(5000, () => console.log("Server running on port 5000"));

const users = {}; // Store connected users { socketId: username }

// When a user connects
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Handle user joining a room
  socket.on("joinRoom", (room, username) => {
    socket.join(room);
    users[socket.id] = username; // Store username with socket ID
    io.to(room).emit("userList", Object.values(users)); // Send updated user list
  });

  // Handle public messages
  socket.on("sendMessage", (data) => {
    io.to(data.room).emit("receiveMessage", data);
  });

  // Handle private messages
  socket.on("privateMessage", ({ recipient, sender, message }) => {
    const recipientSocket = Object.keys(users).find(key => users[key] === recipient);
    if (recipientSocket) {
      io.to(recipientSocket).emit("receivePrivateMessage", { sender, message });
    }
  });

  // When a user disconnects
  socket.on("disconnect", () => {
    delete users[socket.id]; // Remove user from list
    console.log("User disconnected:", socket.id);
    io.emit("userList", Object.values(users)); // Update user list
  });
});
