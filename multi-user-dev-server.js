const fs = require("fs");
const WebpackWatcher = require("./webpack-watcher.js");
const Express = require("express");
const CompilerCollection = require("./compiler-collection.js");

/**
 * This creates a simple web service that runs `webpack --watch` for multiple
 * users/configs. It can be controlled by a simple web API.
 *
 * Build a user's bundle and wait until it is done bundling
 *   POST /bundle/:username
 *
 * Reload a user's webpack config
 *   POST /reload/:username
 *
 * @param optionsFromUsername A function that takes a username and returns a
 *                            options for multi-user-dev-server. See sample in
 *                            example/app.js.
 * @param expireUnusedAfterSeconds Number of seconds after which webpack
 *                            watchers that are unused will be closed /
 *                            released. 0 or null == no expiration.
 * @return Express App
 */
function createDevServer(optionsFromUsername, expireUnusedAfterSeconds) {
  const app = Express();

  // Map of username -> { compiler, watching }
  const compilers = CompilerCollection(expireUnusedAfterSeconds);

  /**
   * Given a username of a user on the dev machine, this returns an object with:
   *   compiler: a webpack compiler instance
   *   watching: a watching instance from calling compiler.watch()
   *
   * @param string username A username, will be used in optionsFromUsername()
   *
   * @return { compiler, watching }
   */
  const getUserCompiler = username => {
    if (!/^[\w\-_]+$/.test(username)) {
      throw new Error('invalid characters in username');
    }

    const options = optionsFromUsername(username);
    // Record the username in the options so the watcher can log relevant
    // messages. The function here is provided by the runner of the app
    // so we can't depend on them doing this.
    options.username = username;

    const compiler = WebpackWatcher(options);

    const watching = compiler.watch({}, (err, stats) => {
      // logging
      const endDateString = new Date(stats.endTime * 1000).toISOString();
      console.log(`${username} bundled at ${endDateString}`);
    });

    return { compiler, watching };
  }

  /**
   * Returns a middleware that will attempt to reload the user's config.
   *
   * @param forceReload If set to true, this will always reload the user's
   *                    config. If set to false, it will only reload it if the
   *                    user's config isn't loaded or had an error loading
   *                    last time.
   */
  const reloadConfig = forceReload => {
    return (req, res, next) => {
      try {
        const compiler = compilers.get(req.username);
        if (compiler && !forceReload) {
          // If we're not forcing a reload, continue.
          return next();
        }
        startNewCompiler(req.username);
        next();
      } catch (e) {
        compilers.remove(req.username);
        res.status(500);
        res.send('Reload failed: ' + e.message);
      }
    };
  }

  const startNewCompiler = function(username) {
    const compiler = compilers.get(username);
    if (compiler) {
      // If a compiler exists, cancel the filesystem watching from
      // the old compiler.
      compiler.watching.close(() =>
        console.log(`${req.username}'s config reloaded`));
    }

    compilers.set(username, getUserCompiler(req.username));
    maxLifetimeTimers.reset(username);
  }

  const timeoutPromise = timeout =>
    new Promise(resolve => setTimeout(resolve, timeout));

  app.param('username', (req, res, next, username) => {
    req.username = username;
    next();
  });

  /**
   * This endpoint reloads the webpack configuration for `username`.
   */
  app.post('/reload/:username', reloadConfig(true), (req, res, next) => {
    res.status(201);
    res.send('devServer reloaded\n');
  });

  /**
   * This endpoint responds when username's bundle has finished being bundled.
   */
  app.post('/bundle/:username', reloadConfig(false), (req, res, next) => {
    const options = optionsFromUsername(req.username);
    const bundleDone = compilers.get(req.username).watching.whenDone();

    // After 60 seconds, respond with a 500 and tell the user to wait longer.
    // That way, they know why it's taking so long.
    const timeoutDone = timeoutPromise(60000).then(() =>
      Promise.reject("Bundle still building, try refreshing"));

    Promise.race([
      timeoutDone,
      bundleDone,
    ]).then(() => {
      res.status(200);
      res.send(options.successResponse || 'bundle built');
    }, err => {
      const errorInfo = {
         stack: err && err.stack,
         details: err && err.details,
         err: err,
         errAsString: String(err),
      }
      res.status(504);
      res.send(JSON.stringify(errorInfo));
    });
  });

  return app;
}

module.exports = createDevServer;
