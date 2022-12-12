var path = require('path');

module.exports = {
    module: {
        rules: [
            {
                test: /\.html$/,
                exclude: [/elm-stuff/, /node_modules/],
                loader: 'file-loader',
                options: {
                    debug: true,
                    name: '[name].[ext]',
                },
            },
            {
                test: /\.elm$/,
                exclude: [/elm-stuff/, /node_modules/],
                loader: 'elm-webpack-loader',
                options: {
                    debug: true,
                    optimize: false,
                },
            },
        ],
    },
    devServer: {
        contentBase: path.join(__dirname, 'src'),
        stats: 'errors-only',
    },
    output: {
        clean: true,
    },
};
