const childProcess = require('child_process');
const fs = require('fs');

module.exports = (options) => {
   console.log("Forking " + options.username);
   const child = forkCompiler();

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
            notifyWatchers(message.err);
            break;
      }
   });

   function notifyWatchers(err) {
      if (watchers.length) {
         const success = err ? " has failed" : " has succeeded";
      }
      watchers.forEach(({resolve, reject}) => err ? reject(err) : resolve());
      watchers.clear();
   }

   const watchController = {
      close: () => {
         console.log("Killing " + options.username);
         child.kill();
         notifyWatchers("Webpack killed before building completed")
      },
      whenDone: () => new Promise((resolve, reject) => {
         watchers.add({resolve, reject});
         child.send({event: 'isRunning'})
      })
   }

   function forkCompiler() {
      const forkOptions = getForkOptions();
      const child = childProcess.fork(__dirname + '/webpack-compiler.js', forkOptions)
      logOutput(child)
      return child;
   }

   function getForkOptions() {
      const output = options.logPath ? 'pipe' : 'inherit';
      return {
         stdio: ['inherit', output, output, 'ipc']
      };
   }

   function logOutput(child) {
      if (!options.logPath) {
         return;
      }

      options.log = fs.createWriteStream(options.logPath, {flags: "a"});
      child.stdout.pipe(options.log);
      child.stderr.pipe(options.log);
   }

   return {
      watch: (watchOptions, callback) => {
         child.send({event: 'watch', options, watchOptions});
         onBundled = callback;
         return watchController;
      },
   }
}
