// This module is run via childProcess.fork() and communicates via IPC
// messages with the parent process.
const webpack = require("webpack");

var watcher = null;

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
            process.send({event: 'notRunning'});
         }
      break;
   }
});

function getWebpack(options, watchOptions) {
   const getWebpackConfig = require(options.configPath);
   const config = getWebpackConfig(options.webpackEnv || {});
   return webpack(config).watch(watchOptions, (err, stats) => {
      // let the parent know we built our bundle
      process.send({event: 'built', err, stats: {endTime: stats && stats.endTime}});
   });
}
