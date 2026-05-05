export const track = (eventName, data = {}) => {
  if (typeof window !== 'undefined' && window.umami) {
    window.umami.track(eventName, data)
  }
}
