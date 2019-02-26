module.exports = () => {
  const compilers = new Map();

  return {
    get: (username) => compilers.get(username),
    set: (username, compiler) => compilers.set(username, compiler),
    remove: (username) => {
      const compiler = compilers.get(username);
      if (!compiler) return;
      compiler.watching.close();
      compilers.delete(username);
    }
  }
}
