const path = require('path');
const JavaScriptObfuscator = require('webpack-obfuscator');

module.exports = {
	devServer: {
		static: "./dist",
	},
	entry: './src/index.js',
	output: {
		filename: 'bundle.js',
		path: path.resolve(__dirname, 'dist'),
	},
	/*plugins: [
		new JavaScriptObfuscator({
			rotateStringArray: true
		})
	]*/
};
