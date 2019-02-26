module.exports = () => {
  const compilers = new Map();

  function updateLastAccessed(username) {
    const compiler = compilers.get(username)
    if (!compiler) return;
    compiler.lastAccessed = Date.now();
  }

  return {
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
}
