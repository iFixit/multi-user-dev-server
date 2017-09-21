module.exports = (env) => {
  return {
    entry: `${__dirname}/entry.js`,
    output: {
      path: __dirname,
      filename: 'bundle.js'
    },
    devtool: 'inline-sourcemap'
  };
}
