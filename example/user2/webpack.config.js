module.exports = (env) => {
  return {
    entry: `${__dirname}/entry.js`,
    output: {
      filename: 'bundle.js'
    },
    devtool: 'inline-sourcemap'
  };
}
