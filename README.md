# multi-user-dev-server

This creates a web service that runs `webpack --watch` for multiple users/configs. It can be controlled by a simple web API.

## Example

Try `example/app.js` with

```
npm install
npm start

open localhost:8080/user1
open localhost:8080/user2
```

## Usage

```js
const multiUserDevServer = require('multi-user-dev-server');

const app = multiUserDevServer(username => {
  return {
    // The path to this user's webpack config
    configPath: `${__dirname}/${username}/webpack.config.js`,
    // The `env` to pass into the webpack config
    webpackEnv: {},
    // What to respond with for `GET /:username` (optional)
    successResponse: `Bundle completed in ${__dirname}/${username}`,
  };
});

app.listen(8080);
```

## Server API

Start building `username`'s webpack bundle. If it's already building, this will wait to respond until building is complete.

```
GET /:username
```


Reload `username`'s webpack config.

```
POST :username
```
