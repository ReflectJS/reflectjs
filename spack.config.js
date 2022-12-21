module.exports = {
  entry: {
    web: __dirname + "/src/client.ts",
  },
  output: {
    path: __dirname + "/dist",
    name: "client.js",
  },
  options: {
    // "minify": true,
  }
};
