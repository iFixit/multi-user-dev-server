module.exports = (expireAfterSeconds) => {
  const expireMs = expireAfterSeconds * 1000;
  const compilers = new Map();

  function resetExpireTimeout(username) {
    const compiler = compilers.get(username)
    if (!compiler || !expireMs) {
       return;
    }
    clearTimeout(compiler.expiredTimeout);
    compiler.expiredTimeout = setTimeout(() => {
       collection.remove(username)
       console.log(`${username}: bundle was unused for ${expireAfterSeconds} seconds, expiring.`);
    }, expireMs);
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
      const compiler = compilers.get(username);
      if (!compiler) return;
      compiler.watching.close();
      compilers.delete(username);
    }
  }

  return collection;
}
