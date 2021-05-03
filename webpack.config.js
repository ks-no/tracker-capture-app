'use strict';
var webpack = require('webpack');

const HTMLWebpackPlugin = require('html-webpack-plugin');
var path = require('path');
var colors = require('colors');

const dhisConfigPath = process.env.DHIS2_HOME && `${process.env.DHIS2_HOME}/config.json`;
let dhisConfig;

try {
    dhisConfig = require(dhisConfigPath);
    console.log('\nLoaded DHIS config:');
} catch (e) {
    // Failed to load config file - use default config
    console.warn('\nWARNING! Failed to load DHIS config:', e.message);
    console.info('Using default config');
    dhisConfig = {
        baseUrl: 'https://covid19.fiks.dev.ks.no',
        authorization: 'Basic ZG92cmU6VGVzdDEyMyE=' //c2VsOlRlc3QxMjMh sel:Test123!    //bWFya3VzOlN0b3BDb3ZpZDE5IQ== markus:StopCovid19!    // YWRtaW46ZGlzdHJpY3Q=' // admin:district
    };
}
const fiksConfig = {
    mockApiPath: "http://localhost:4040/dhis2-mock"
};
console.log(JSON.stringify(dhisConfig, null, 2), '\n');

function bypass(req, res, opt) {
    req.headers.Authorization = dhisConfig.authorization;
}

function makeLinkTags(stylesheets) {
    return function (hash) {
        return stylesheets
            .map(([url, attributes]) => {
                const attributeMap = Object.assign({ media: 'screen' }, attributes);

                const attributesString = Object
                    .keys(attributeMap)
                    .map(key => `${key}="${attributeMap[key]}"`)
                    .join(' ');

                return `<link type="text/css" rel="stylesheet" href="${url}?_=${hash}" ${attributesString} />`;
            })
            .join(`\n`);
    };
}

function makeScriptTags(scripts) {
    return function (hash) {
        return scripts
            .map(script => (`<script src="${script}?_=${hash}"></script>`))
            .join(`\n`);
    };
}

function createProxy(data) {
    return Object.assign(
        {
            target: dhisConfig.baseUrl,
            secure: false,
            bypass:bypass,
            changeOrigin: true
        },
        data);
}

module.exports = {
    context: __dirname,
    entry: './scripts/index.js',
    output: {
        path: path.join(__dirname, '/build'),
        filename: 'app-[hash].js'
    },
    module: {
        loaders: [
            {
                test: /\.jsx?$/,
                exclude: [/(node_modules)/],
                loaders: ['ng-annotate-loader', 'babel-loader'],
            },
            {
                test: /\.css$/,
                loader: 'style-loader!css-loader'
            },
            {
                test: /\.(gif|png|jpg|svg)$/,
                loader: 'file-loader'
            },
        ],
        noParse: /node_modules\/leaflet-control-geocoder\/dist\/Control.Geocoder.js/,
    },
    plugins: [
        new webpack.optimize.DedupePlugin(),
        new HTMLWebpackPlugin({
            template: './index.ejs',
            stylesheets: makeLinkTags([
                ['styles/style.css'],
                ['styles/print.css', { media: 'print' }],
            ]),
            scripts: makeScriptTags([
                'core/tracker-capture.js',
                'vendor/main/main.js',
            ]),
        }),
    ],
    devtool: 'sourcemap',

    devServer: {
        contentBase: '.',
        progress: true,
        colors: true,
        port: 8081,
        inline: false,
        compress: false,
        proxy: [
            createProxy({ path: '/api/person/sok', target: fiksConfig.mockApiPath}),
            createProxy({ path: '/api/provesvar/sok', target: fiksConfig.mockApiPath}),
            createProxy({ path: '/api/klinikermelding', target: fiksConfig.mockApiPath}),
            createProxy({ path: '/api/**'}),
            createProxy({ path: '/dhis/dhis-web-commons/**'}),
            createProxy({ path: '/dhis-web-commons-ajax-json/**'}),
            createProxy({ path: '/dhis-web-commons-stream/**'}),
            createProxy({ path: '/dhis-web-commons/***', proxyTimeout: 1000 * 60 * 5}),
            createProxy({ path: '/dhis-web-core-resource/**'}),
            createProxy({ path: '/icons/**'}),
            createProxy({ path: '/images/**'}),
            createProxy({ path: '/main.js'}),
            createProxy({ path: '/api/person/sok', target: fiksConfig.mockApiPath}),
            createProxy({ path: '/api/provesvar/sok', target: fiksConfig.mockApiPath})
        ],
    },
};
