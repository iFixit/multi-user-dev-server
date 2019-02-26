module.exports = (expireAfterSeconds) => {
  const expireMs = expireAfterSeconds * 1000;
  const compilers = new Map();

  if (expireAfterSeconds) {
    setInterval(removeExpiredCompilers, 30 * 1000);
  }

  function removeExpiredCompilers() {
    compilers.forEach((compiler, username) => {
      if (isExpired(compiler)) {
        console.log(`${username}: bundle was unused for ${expireAfterSeconds} seoncds, expiring.`);
        interface.remove(username);
      }
    })
  }

  function isExpired(compiler) {
    const oldestAllowedAccessTime = Date.now() - expireMs;
    return compiler.lastAccessed < oldestAllowedAccessTime;
  }

  function updateLastAccessed(username) {
    const compiler = compilers.get(username)
    if (!compiler) return;
    compiler.lastAccessed = Date.now();
  }

  const interface = {
    get: (username) => {
      updateLastAccessed(username)
      return compilers.get(username)
    },
    set: (username, compiler) => {
      compilers.set(username, compiler)
      updateLastAccessed(username)
    },
    remove: (username) => {
      const compiler = compilers.get(username);
      if (!compiler) return;
      compiler.watching.close();
      compilers.delete(username);
    }
  }

  return interface;
}
