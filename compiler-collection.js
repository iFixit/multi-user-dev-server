const TimerCollection = require('./timer-collection');

module.exports = (expireUnusedAfterSeconds) => {
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
