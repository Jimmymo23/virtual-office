const router = require('express').Router()
const { register, login, logout, me } = require('../controllers/auth.controller')
const { requireAuth } = require('../middleware/auth')

router.post('/register', register)
router.post('/login', login)
router.post('/logout', requireAuth, logout)
router.get('/me', requireAuth, me)

module.exports = router
