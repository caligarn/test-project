// PeerJS setup shared by the multiplayer games.
// Defaults to the free PeerJS cloud server. Set VITE_PEER_HOST (and
// VITE_PEER_PORT, VITE_PEER_PATH, VITE_PEER_SECURE) to use your own server.
import Peer from 'peerjs'

export function peerOptions() {
  const env = import.meta.env
  if (!env.VITE_PEER_HOST) return {}
  return {
    host: env.VITE_PEER_HOST,
    port: Number(env.VITE_PEER_PORT || 443),
    path: env.VITE_PEER_PATH || '/',
    secure: env.VITE_PEER_SECURE !== 'false',
  }
}

export function createPeer(id) {
  return id ? new Peer(id, peerOptions()) : new Peer(peerOptions())
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // no I or O: easy to read aloud

export function makeRoomCode(length = 4) {
  let code = ''
  for (let i = 0; i < length; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  return code
}
