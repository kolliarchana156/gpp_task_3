const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');

router.post('/', postController.createPost);
router.get('/feed', postController.getFeed);
router.post('/:id/like', postController.likePost);
module.exports = router;