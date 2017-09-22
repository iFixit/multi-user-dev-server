const fs = require("fs");
const Webpack = require("webpack");
const Express = require("express");
const DevMiddleware = require("webpack-dev-middleware");

/**
 * This creates a webpack dev server that supports multiple users (configs) on
 * one port.
 *
 * This server can be accessed with
 *   GET /:username/:bundle-name
 *
 * An individual user's webpack config can be reloaded with
 *   POST /reload/:username
 *
 * @param usernameToConfigPath A function that takes a username and returns a
 *                             a path to that user's webpack config.
 * @return Express App
 */
function createDevServer(usernameToConfigPath) {
  const app = Express();

  // Map of username -> DevMiddleware for the currently loaded webpack configs.
  const devMiddlewares = {};

  /**
   * Given a username of a user on the dev machine, this returns a DevMiddleware
   * instance for that user.
   *
   * @param string username A username, such that usernameToConfigPath(username)
   *                        returns username's webpack config.
   * @return Middleware This middleware will respond with built js bundles.
   */
  const getDevMiddlewareForUsername = username => {
    if (!/^[\w\-_]+$/.test(username)) {
      throw new Error('invalid characters in username');
    }

    const configPath = usernameToConfigPath(username);

    // Hack: Make sure that node loads the most up-to-date version of the
    // user's webpack config, since it may have changed since this server
    // started.
    delete require.cache[require.resolve(configPath)];
    const getWebpackConfig = require(configPath);

    const config = getWebpackConfig();

    return DevMiddleware(Webpack(config), {
      publicPath: '/' + username,
      contentBase: false
    });
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
      if (!forceReload && devMiddlewares[req.username]) {
        return next();
      }

      try {
        devMiddlewares[req.username] = getDevMiddlewareForUsername(req.username);
        next();
      } catch (e) {
        devMiddlewares[req.username] = null;
        res.status(500);
        res.send('Reload failed: ' + e.message);
      }
    };
  }

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
   * This endpoint returns a built js bundle for `/username/bundle-name.js`.
   */
  app.get('/:username/*', reloadConfig(false), (req, res, next) => {
    // Note: we can't attach this middleware with `app.use` because there
    // is no way to remove it later. We need to replace it when the user
    // reloads their config.
    devMiddlewares[req.username](req, res, next);
  });

  return app;
}

module.exports = createDevServer;
