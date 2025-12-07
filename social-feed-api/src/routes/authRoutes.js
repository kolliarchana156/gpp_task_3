const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Define the route POST /auth/register
router.post('/register', userController.register);

module.exports = router;