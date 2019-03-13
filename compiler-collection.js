module.exports = (expireAfterSeconds) => {
  const expireMs = expireAfterSeconds * 1000;
  const compilers = new Map();

  if (expireAfterSeconds) {
    // Check for expired things often enough to exipre things within
    // 20% of their true expiration time.
    setInterval(removeExpiredCompilers, expireAfterSeconds / 5);
  }

  function removeExpiredCompilers() {
    compilers.forEach((compiler, username) => {
      if (isExpired(compiler)) {
        console.log(`${username}: bundle was unused for ${expireAfterSeconds} seconds, expiring.`);
        collection.remove(username);
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

  const collection = {
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

  return collection;
}
