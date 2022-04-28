const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  mode: "development",
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
  },
  devServer: {
    liveReload: true,
    hot: true,
  },
  plugins: [new HtmlWebpackPlugin({ template: "./src/views/index.html" })],
};
