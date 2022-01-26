module.exports = function TimerCollection(expireMs, onExpire) {
  const expirationTimers = new Map();
  this.reset = function resetTimer(username) {
    clearTimer(username);
    if (!expireMs) {
       return;
    }
    expirationTimers.set(username, setTimeout(() => onExpire(username)));
  };

  this.clear = function clearTimer(username) {
    const timer = expirationTimers.get(username);
    if (timer) {
      clearTimeout(timer);
    }
  };
}
