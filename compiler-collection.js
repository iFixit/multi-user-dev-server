modules.exports = () => {
  const compilers = {}

  return {
    get: (username) => compilers[username],
    set: (username, compiler) => compilers[username] = compiler,
    remove: (username) => {
      const compiler = compilers[username];
      if (!compiler) return;
      compiler.watching.close();
      delete compilers[username];
    }
  }
}
