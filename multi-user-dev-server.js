const fs = require("fs");
const webpack = require("webpack");
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
 * @return Express App
 */
function createDevServer(optionsFromUsername) {
  const app = Express();

  // Map of username -> { compiler, watching, whenDone }
  const compilers = CompilerCollection();

  /**
   * Given a username of a user on the dev machine, this returns an object with:
   *   compiler: a webpack compiler instance
   *   watching: a watching instance from calling compiler.watch()
   *   whenDone: returns a promise that resolves when the user's bundle is done
   *
   * @param string username A username, will be used in optionsFromUsername()
   *
   * @return { compiler, watching, whenDone }
   */
  const getUserCompiler = username => {
    if (!/^[\w\-_]+$/.test(username)) {
      throw new Error('invalid characters in username');
    }

    const options = optionsFromUsername(username);

    // Hack: Make sure that node loads the most up-to-date version of the
    // user's webpack config, since it may have changed since this server
    // started.
    delete require.cache[require.resolve(options.configPath)];
    const getWebpackConfig = require(options.configPath);
    const compiler = webpack(getWebpackConfig(options.webpackEnv || {}));

    // `whenDone` will add pending promises to this list, which will be resolved
    // when the `watching` handler gets called.
    let promises = [];

    const watching = compiler.watch({}, (err, stats) => {
      // resolve and clear all the promises added by `whenDone`.
      promises.forEach(({ resolve, reject }) => err ? reject(err) : resolve());
      promises = [];

      // logging
      const endDateString = new Date(stats.endTime * 1000).toISOString();
      console.log(`${username} bundled at ${endDateString}`);
    });

    const whenDone = () => new Promise((resolve, reject) => {
      if (!watching.running) {
        resolve();
      } else {
        promises.push({ resolve, reject });
      }
    });

    return { compiler, watching, whenDone };
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
        if (compiler) {
          // This user's config has already been loaded.
          if (!forceReload) {
            // If we're not forcing a reload, continue.
            return next();
          } else {
            // If we are forcing a reload, cancel the filesystem watching from
            // the old compiler.
            compiler.watching.close(() =>
              console.log(`${req.username}'s config reloaded`));
          }
        }

        compilers.set(req.username, getUserCompiler(req.username));
        next();
      } catch (e) {
        compilers.remove(req.username);
        res.status(500);
        res.send('Reload failed: ' + e.message);
      }
    };
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
    const bundleDone = compilers.get(req.username).whenDone();

    // After 20 seconds, respond with a 500 and tell the user to wait longer.
    // That way, they know why it's taking so long.
    const timeoutDone = timeoutPromise(20000).then(() =>
      Promise.reject("Bundle still building, try refreshing"));

    Promise.race([
      timeoutDone,
      bundleDone,
    ]).then(() => {
      res.status(200);
      res.send(options.successResponse || 'bundle built');
    }, err => {
      res.status(500);
      res.send(err);
    });
  });

  return app;
}

module.exports = createDevServer;
