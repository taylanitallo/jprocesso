const DEFAULTS = { top: 20, bottom: 20, left: 14, right: 14 }
let _mg = { ...DEFAULTS }

function clamp(v, min, max) { return Math.min(max, Math.max(min, isNaN(v) ? min : v)) }

export function setMargens(v) {
  if (!v) { _mg = { ...DEFAULTS }; return }
  _mg = {
    top:    clamp(Number(v.top),    5, 50),
    bottom: clamp(Number(v.bottom), 5, 50),
    left:   clamp(Number(v.left),   5, 50),
    right:  clamp(Number(v.right),  5, 50),
  }
}

export function getMargens() { return { ..._mg } }
