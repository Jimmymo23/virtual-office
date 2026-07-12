const router = require('express').Router()
const { requireAuth } = require('../middleware/auth')
const prisma = require('../utils/prisma')

// Get all tasks visible to the logged-in user
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    const tasks = await prisma.task.findMany({
      where: {
        parentTaskId: null,
        OR: [
          { visibility: 'PUBLIC' },
          { creatorId: userId },
          { assignees: { some: { userId } } },
          { visibility: 'CUSTOM', customAccess: { some: { userId } } },
        ]
      },
      include: {
        assignees: { include: { user: { select: { id: true, displayName: true, avatarColor: true, avatarTextColor: true } } } },
        subTasks: { include: { assignees: { include: { user: { select: { id: true, displayName: true, avatarColor: true, avatarTextColor: true } } } } } },
        creator: { select: { id: true, displayName: true, avatarColor: true, avatarTextColor: true } },
        timeLogs: { where: { userId }, orderBy: { startedAt: 'desc' }, take: 1 },
        _count: { select: { comments: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ tasks })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Create a task
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, description, priority, visibility, dueDate, estimateMin, assigneeIds, roomId } = req.body
    if (!title) return res.status(400).json({ error: 'Title is required' })

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority: priority || 'MEDIUM',
        visibility: visibility || 'ASSIGNEES',
        dueDate: dueDate ? new Date(dueDate) : null,
        estimateMin: estimateMin || null,
        creatorId: req.user.id,
        roomId: roomId || null,
        assignees: {
          create: [
            { userId: req.user.id },
            ...(assigneeIds || []).filter(id => id !== req.user.id).map(userId => ({ userId }))
          ]
        }
      },
      include: {
        assignees: { include: { user: { select: { id: true, displayName: true, avatarColor: true, avatarTextColor: true } } } },
        creator: { select: { id: true, displayName: true, avatarColor: true, avatarTextColor: true } },
        subTasks: true,
        _count: { select: { comments: true } }
      }
    })
    res.status(201).json({ task })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Update a task
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { title, description, priority, status, visibility, dueDate, estimateMin } = req.body
   const task = await prisma.task.update({
  where: { id: req.params.id },
  data: {
    ...(title && { title }),
    ...(description !== undefined && { description }),
    ...(priority && { priority }),
    ...(status && { status }),
    ...(status === 'DONE' && { completedAt: new Date() }),
    ...(status && status !== 'DONE' && { completedAt: null }),
    ...(visibility && { visibility }),
    ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
    ...(estimateMin !== undefined && { estimateMin }),
  },
        assignees: { include: { user: { select: { id: true, displayName: true, avatarColor: true, avatarTextColor: true } } } },
        subTasks: true,
        creator: { select: { id: true, displayName: true } },
        _count: { select: { comments: true } }
      }
    })
    res.json({ task })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Create a sub-task
router.post('/:id/subtasks', requireAuth, async (req, res) => {
  try {
    const { title, priority, assigneeIds } = req.body
    if (!title) return res.status(400).json({ error: 'Title is required' })

    const subTask = await prisma.task.create({
      data: {
        title,
        priority: priority || 'MEDIUM',
        visibility: 'ASSIGNEES',
        creatorId: req.user.id,
        parentTaskId: req.params.id,
        assignees: {
          create: (assigneeIds || [req.user.id]).map(userId => ({ userId }))
        }
      },
      include: {
        assignees: { include: { user: { select: { id: true, displayName: true, avatarColor: true, avatarTextColor: true } } } }
      }
    })
    res.status(201).json({ subTask })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Start timer
router.post('/:id/timer/start', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    const activeTimer = await prisma.timeLog.findFirst({ where: { userId, endedAt: null } })
    if (activeTimer) {
      const now = new Date()
      const minutes = Math.round((now - activeTimer.startedAt) / 60000)
      await prisma.timeLog.update({ where: { id: activeTimer.id }, data: { endedAt: now, minutes } })
    }
    const log = await prisma.timeLog.create({ data: { taskId: req.params.id, userId } })
    res.json({ log })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Stop timer
router.post('/:id/timer/stop', requireAuth, async (req, res) => {
  try {
    const { note } = req.body
    const active = await prisma.timeLog.findFirst({ where: { taskId: req.params.id, userId: req.user.id, endedAt: null } })
    if (!active) return res.status(404).json({ error: 'No active timer' })
    const now = new Date()
    const minutes = Math.round((now - active.startedAt) / 60000)
    const log = await prisma.timeLog.update({ where: { id: active.id }, data: { endedAt: now, minutes, note: note || null } })
    res.json({ log })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get comments
router.get('/:id/comments', requireAuth, async (req, res) => {
  try {
    const comments = await prisma.message.findMany({
      where: { taskId: req.params.id, channelType: 'THREAD' },
      include: { sender: { select: { id: true, displayName: true, avatarColor: true, avatarTextColor: true } } },
      orderBy: { sentAt: 'asc' }
    })
    res.json({ comments })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Add comment
router.post('/:id/comments', requireAuth, async (req, res) => {
  try {
    const { body } = req.body
    if (!body?.trim()) return res.status(400).json({ error: 'Comment body required' })
    const comment = await prisma.message.create({
      data: {
        senderId: req.user.id,
        channelType: 'THREAD',
        channelId: req.params.id,
        taskId: req.params.id,
        body: body.trim()
      },
      include: { sender: { select: { id: true, displayName: true, avatarColor: true, avatarTextColor: true } } }
    })
    res.status(201).json({ comment })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router