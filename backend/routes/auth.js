const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const router = express.Router();

// Signup Route
router.post('/signup', async (req, res) => {
  const { username, firstname, lastname, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return res.status(400).send('Username already taken');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const newUser = new User({
      username,
      firstname,
      lastname,
      password: hashedPassword
    });
    await newUser.save();
    res.status(201).send({ message: 'User created' });
  } catch (err) {
    res.status(400).send('Error creating user');
  }
});

// Login Route
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Find the user by username
    const user = await User.findOne({ username });
    if (!user) return res.status(404).send('User not found');

    // Compare the password
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).send('Invalid credentials');

    res.send({ user }); // Send user details (you can send a token if using JWT)
  } catch (err) {
    res.status(500).send('Server error');
  }
});

module.exports = router;
