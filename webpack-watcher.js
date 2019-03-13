const childProcess = require('child_process');

module.exports = (options) => {
   console.log("Forking " + options.username);
   const child = childProcess.fork(__dirname + '/webpack-compiler.js')

   let onBundled = () => {}
   const watchers = new Set();

   child.on('message', (message) => {
      switch (message && message.event) {
         // {err, stats}
         case 'built':
            onBundled(message.err, message.stats);
            notifyWatchers(message.err);
            break;

         // If we're not running (building), then there's nothing to wait on.
         case 'notRunning':
            notifyWatchers();
            break;
      }
   });

   function notifyWatchers(err) {
      if (watchers.length) {
         const success = err ? " has failed" : " has succeeded";
         console.log("notifying " + watchers.length + " watchers that bundling " + options.username + success);
      }
      watchers.forEach(({resolve, reject}) => err ? reject(err) : resolve());
      watchers.clear();
   }

   function whenDone() {
      return new Promise((resolve, reject) => {
         watchers.add({resolve, reject});
         child.send({event: 'isRunning'})
      });
   }

   const watcher = {
      close: () => {
         console.log("Killing " + options.username);
         child.kill();
         notifyWatchers()
      },
      whenDone
   }

   return {
      watch: (watchOptions, callback) => {
         child.send({event: 'watch', options, watchOptions});
         onBundled = callback;
         return watcher;
      },
   }
}
