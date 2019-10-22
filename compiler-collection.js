module.exports = (expireAfterSeconds) => {
  const expireMs = expireAfterSeconds * 1000;
  const compilers = new Map();
  const expirationTimers = new Map();

  function resetExpireTimeout(username) {
    clearExpirationTimer(username);
    if (!expireMs) {
       return;
    }
    expirationTimers.set(username, setTimeout(() => {
      collection.remove(username)
      console.log(`${username}: bundle was unused for ${expireAfterSeconds} seconds, expiring.`);
    }, expireMs));
  }

  function clearExpirationTimer(username) {
    const timer = expirationTimers.get(username);
    if (timer) {
      clearTimeout(timer);
    }
  }

  const collection = {
    get: (username) => {
      resetExpireTimeout(username)
      return compilers.get(username)
    },
    set: (username, compiler) => {
      compilers.set(username, compiler)
      resetExpireTimeout(username)
    },
    remove: (username) => {
      clearExpirationTimer(username);
      const compiler = compilers.get(username);
      if (!compiler) return;
      compiler.watching.close();
      compilers.delete(username);
    }
  }

  return collection;
}
