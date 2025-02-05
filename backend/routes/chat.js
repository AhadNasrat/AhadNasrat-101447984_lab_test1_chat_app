const express = require('express');
const Message = require('../models/Message');

const router = express.Router();

router.post('/send', async (req, res) => {
    try {
        const { from_user, room, message } = req.body;
        const newMessage = new Message({ from_user, room, message });
        await newMessage.save();
        res.status(201).json(newMessage);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.get('/room/:room', async (req, res) => {
    try {
        const messages = await Message.find({ room: req.params.room });
        res.json(messages);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;