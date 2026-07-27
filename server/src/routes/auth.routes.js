const router = require('express').Router()
const { register, login, logout, me, listOffices } = require('../controllers/auth.controller')
const { requireAuth } = require('../middleware/auth')

router.get('/offices', listOffices)
router.post('/register', register)
router.post('/login', login)
router.post('/logout', requireAuth, logout)
router.get('/me', requireAuth, me)

module.exports = router
