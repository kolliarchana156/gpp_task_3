const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.post('/follow', userController.followUser);

module.exports = router;