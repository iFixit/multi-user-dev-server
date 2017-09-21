const multiUserDevServer = require('../multi-user-dev-server.js');

const app = multiUserDevServer(username =>
    `${__dirname}/${username}/webpack.config.js`);

app.listen(8080);
