// This module is run via childProcess.fork() and communicates via IPC
// messages with the parent process.
const webpack = require("webpack");

process.umask(0o002);

var watcher = null;
let errFromPreviousBuild = null;

process.on('message', (message) => {
   switch (message && message.event) {
      // {options, watchOptions}
      case 'watch':
         if (!watcher) {
            watcher = getWebpack(message.options, message.watchOptions);
         }
         break;

      // The parent is asking if we're in the middle of running (building)
      case 'isRunning':
         // If we're not running (building), let them know we're done;
         // otherwise, they'll find out via the 'built' event.
         if (watcher && !watcher.running) {
            process.send({event: 'notRunning', err: errFromPreviousBuild});
         }
      break;
   }
});

function getWebpack(options, watchOptions) {
   if (options.username) {
      process.title = "webpack-watcher for " + options.username;
   }
   const getWebpackConfig = require(options.configPath);
   const config = getWebpackConfig(options.webpackEnv || {});
   return webpack(config).watch(watchOptions, (err, stats) => {
      const endTime = stats && stats.endTime;
      // let the parent know we built our bundle
      if (err) {
         console.error("build failed at: " + timestamp(endTime));
         console.error(err);
      } else if (stats && stats.compilation && stats.compilation.errors.length) {
         err = "Build failed";
         console.error("build failed at: " + timestamp(endTime));
         console.error(stats.compilation.errors);
      } else {
         console.log("build succeeded at: " + timestamp(endTime));
      }

      process.send({event: 'built', err, stats: {endTime: endTime}});
      errFromPreviousBuild = err;
   });
}

function timestamp(timestampMs){
   return (new Date(timestampMs)).toLocaleString();
}
