let _loading = false
const _listeners = new Set()

export function setPDFLoading(v) {
  _loading = v
  _listeners.forEach(fn => fn(v))
}

export function getPDFLoading() { return _loading }

export function subscribePDFLoading(fn) {
  _listeners.add(fn)
  return () => _listeners.delete(fn)
}
