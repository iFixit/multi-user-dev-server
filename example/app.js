const multiUserDevServer = require('../multi-user-dev-server.js');

const app = multiUserDevServer(username => {
  return {
    // The path to this user's webpack config
    configPath: `${__dirname}/${username}/webpack.config.js`,
    // The `env` to pass into the webpack config
    webpackEnv: {},
    // What to respond with for `GET /:username` (optional)
    successResponse: `Bundle completed in ${__dirname}/${username}`,
  };
}, /* expireAfter */ 10);

app.listen(8080);
