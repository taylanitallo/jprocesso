// Bus de eventos de progresso — sem dependência React, funciona em qualquer contexto
const listeners = new Set()
let _progress = 0
let _visible = false
let _activeRequests = 0
let _interval = null

function notify() {
  listeners.forEach(fn => fn({ progress: _progress, visible: _visible }))
}

function startTick() {
  if (_interval) return
  _interval = setInterval(() => {
    if (_progress < 85) {
      _progress += (85 - _progress) * 0.08
      notify()
    }
  }, 150)
}

function stopTick() {
  if (_interval) { clearInterval(_interval); _interval = null }
}

export const progressBus = {
  subscribe(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },

  start() {
    _activeRequests++
    if (_activeRequests === 1) {
      _progress = 8
      _visible = true
      notify()
      startTick()
    }
  },

  advance(pct) {
    if (pct > _progress) { _progress = Math.min(pct, 95); notify() }
  },

  done() {
    _activeRequests = Math.max(0, _activeRequests - 1)
    if (_activeRequests === 0) {
      stopTick()
      _progress = 100
      notify()
      setTimeout(() => {
        _visible = false
        _progress = 0
        notify()
      }, 380)
    }
  },
}
