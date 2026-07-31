import { useEffect, useRef, useState, useCallback } from 'react'
import Peer from 'simple-peer'
import { useOfficeStore } from '../store/officeStore'

const VOICE_ROOMS = {
  'meeting-1': 'ALWAYS_ON',
  'kitchen': 'ALWAYS_ON',
  'focus': 'PUSH_TO_TALK',
  'reception': 'PUSH_TO_TALK',
}

export function useVoice(currentRoomId) {
  const socket = useOfficeStore(s => s.socket)
  const [connectedPeers, setConnectedPeers] = useState([])
  const [micError, setMicError] = useState('')
  const [isMuted, setIsMuted] = useState(false)
  const [isTalking, setIsTalking] = useState(false)

  const localStreamRef = useRef(null)
  const peersRef = useRef(new Map())
  const audioElsRef = useRef(new Map())
  const activeRoomRef = useRef(null)
  const voiceModeRef = useRef(null)

  const roomMode = currentRoomId ? VOICE_ROOMS[currentRoomId] : null
  const isVoiceRoom = roomMode === 'ALWAYS_ON' || roomMode === 'PUSH_TO_TALK'
  const isPushToTalk = roomMode === 'PUSH_TO_TALK'

  const cleanupPeer = useCallback((userId) => {
    const peer = peersRef.current.get(userId)
    if (peer) {
      peer.destroy()
      peersRef.current.delete(userId)
    }
    const el = audioElsRef.current.get(userId)
    if (el) {
      el.srcObject = null
      el.remove()
      audioElsRef.current.delete(userId)
    }
    setConnectedPeers(prev => prev.filter(id => id !== userId))
  }, [])

  const teardownVoice = useCallback(() => {
    if (activeRoomRef.current && socket) {
      socket.emit('voice:leave', { roomId: activeRoomRef.current })
    }
    for (const userId of Array.from(peersRef.current.keys())) {
      cleanupPeer(userId)
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
    }
    activeRoomRef.current = null
    voiceModeRef.current = null
    setConnectedPeers([])
    setIsTalking(false)
  }, [socket, cleanupPeer])

  const createPeer = useCallback((targetUserId, initiator, stream) => {
    const peer = new Peer({ initiator, trickle: true, stream })

    peer.on('signal', (signal) => {
      socket.emit('voice:signal', { toUserId: targetUserId, signal })
    })

    peer.on('stream', (remoteStream) => {
      let el = audioElsRef.current.get(targetUserId)
      if (!el) {
        el = document.createElement('audio')
        el.autoplay = true
        document.body.appendChild(el)
        audioElsRef.current.set(targetUserId, el)
      }
      el.srcObject = remoteStream
      setConnectedPeers(prev => prev.includes(targetUserId) ? prev : [...prev, targetUserId])
    })

    peer.on('error', () => cleanupPeer(targetUserId))
    peer.on('close', () => cleanupPeer(targetUserId))

    peersRef.current.set(targetUserId, peer)
    return peer
  }, [socket, cleanupPeer])

  useEffect(() => {
    if (!socket) return

    let cancelled = false

    async function setupVoiceForRoom(roomId, mode) {
      try {
        setMicError('')
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }

        if (mode === 'PUSH_TO_TALK') {
          stream.getAudioTracks().forEach(t => { t.enabled = false })
        }

        localStreamRef.current = stream
        activeRoomRef.current = roomId
        voiceModeRef.current = mode
        socket.emit('voice:join', { roomId })
      } catch (err) {
        setMicError('Microphone access denied or unavailable')
      }
    }

    if (isVoiceRoom && activeRoomRef.current !== currentRoomId) {
      teardownVoice()
      setupVoiceForRoom(currentRoomId, roomMode)
    } else if (!isVoiceRoom && activeRoomRef.current) {
      teardownVoice()
    }

    return () => { cancelled = true }
  }, [currentRoomId, isVoiceRoom, roomMode, socket, teardownVoice])

  useEffect(() => {
    if (!socket) return

    const onExistingPeers = ({ peers }) => {
      if (!localStreamRef.current) return
      peers.forEach(userId => {
        if (!peersRef.current.has(userId)) {
          createPeer(userId, true, localStreamRef.current)
        }
      })
    }

    const onSignal = ({ fromUserId, signal }) => {
      if (!localStreamRef.current) return
      let peer = peersRef.current.get(fromUserId)
      if (!peer) {
        peer = createPeer(fromUserId, false, localStreamRef.current)
      }
      peer.signal(signal)
    }

    const onPeerLeft = ({ userId }) => {
      cleanupPeer(userId)
    }

    socket.on('voice:existing_peers', onExistingPeers)
    socket.on('voice:signal', onSignal)
    socket.on('voice:peer_left', onPeerLeft)

    return () => {
      socket.off('voice:existing_peers', onExistingPeers)
      socket.off('voice:signal', onSignal)
      socket.off('voice:peer_left', onPeerLeft)
    }
  }, [socket, createPeer, cleanupPeer])

  // Push-to-talk: hold spacebar to unmute the mic track
  useEffect(() => {
    if (!isPushToTalk) return

    const onKeyDown = (e) => {
      const tag = document.activeElement && document.activeElement.tagName
        ? document.activeElement.tagName.toLowerCase() : ''
      if (['input', 'textarea', 'select'].includes(tag)) return
      if (e.code !== 'Space' || e.repeat) return
      if (!localStreamRef.current) return
      e.preventDefault()
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = true })
      setIsTalking(true)
    }

    const onKeyUp = (e) => {
      if (e.code !== 'Space') return
      if (!localStreamRef.current) return
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = false })
      setIsTalking(false)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [isPushToTalk])

  useEffect(() => {
    return () => { teardownVoice() }
  }, [teardownVoice])

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current || isPushToTalk) return
    const nextMuted = !isMuted
    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !nextMuted })
    setIsMuted(nextMuted)
  }, [isMuted, isPushToTalk])

  return {
    isVoiceRoom,
    isPushToTalk,
    isTalking,
    inVoiceCall: !!localStreamRef.current,
    connectedPeers,
    peerCount: connectedPeers.length,
    micError,
    isMuted,
    toggleMute,
  }
}
