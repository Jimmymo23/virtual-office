if (process.env.NODE_ENV !== 'production') require('dotenv').config()

const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')

const authRoutes = require('./routes/auth.routes')
const adminRoutes = require('./routes/admin.routes')
const { initSocket } = require('./socket')

const app = express()
const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }))

app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)

initSocket(io)

const PORT = process.env.PORT || 4000
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})