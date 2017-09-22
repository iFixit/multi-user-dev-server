# multi-user-dev-server

Create a webpack dev server that supports multiple users (or configs) on one port.

## Example

Try `example/app.js` with

```
npm install
npm start

open localhost:8080/user1/bundle.js
open localhost:8080/user2/bundle.js
```

## Usage

```js
const multiUserDevServer = require('multi-user-dev-server');
const app = multiUserDevServer(user => `/home/${user}/repo/webpack.config.js`);
app.listen(8080);
```

## Server API

Get a bundle

```
GET /:username/:bundle-name
```


Reload one user's webpack config

```
POST /reload/:username
```
