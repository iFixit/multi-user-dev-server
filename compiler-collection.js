module.exports = (expireAfterSeconds) => {
  const expireUnused = new TimerCollection(
    expireAfterSeconds * 1000,
    (username) => {
      collection.remove(username);
      console.log(`${username}: bundle was unused for ${expireAfterSeconds} seconds, expiring.`);
    }
  );

  const compilers = new Map();

  const collection = {
    get: (username) => {
      expireUnused.reset(username);
      return compilers.get(username);
    },
    set: (username, compiler) => {
      compilers.set(username, compiler);
      expireUnused.reset(username);
    },
    remove: (username) => {
      expireUnused.clear(username)
      const compiler = compilers.get(username);
      if (!compiler) return;
      compiler.watching.close();
      compilers.delete(username);
    }
  }

  return collection;
}

function TimerCollection(expireMs, onExpire) {
  const expirationTimers = new Map();
  this.reset = function resetTimer(username) {
    clearTimer(username);
    if (!expireMs) {
       return;
    }
    expirationTimers.set(username, setTimeout(() => onExpire(username)));
  }

  this.clear = function clearTimer(username) {
    const timer = expirationTimers.get(username);
    if (timer) {
      clearTimeout(timer);
    }
  }
}
