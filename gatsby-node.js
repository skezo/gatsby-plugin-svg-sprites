const { createHash } = require('crypto')
const SvgStorePlugin = require('external-svg-sprite-loader')
const { resolve } = require('path')

const fixRulesDeclarations = require('./lib/fix-rules-declarations')
const GatsbyTypescriptPluginFix = require('./lib/gatsby-typescript-plugin-fix')
const getMinifiedId = require('./lib/get-minified-id')

const IS_PRODUCTION = process.env.NODE_ENV === 'production'

let randomContentHashValue = null

exports.onCreateWebpackConfig = ({ actions, getConfig, rules }, {
  iconName = '[name]--[hash:base64:5]',
  minifyIds = IS_PRODUCTION,
  name = 'sprites.[contenthash].svg',
  pluginOptions = {},
  plugins: _,
  randomContentHash = false,
  ...externalSvgSpriteLoaderOptions
}) => {
  const config = getConfig()
  const imagesRule = rules.images()
  const imagesRuleTest = String(imagesRule.test)

  if (IS_PRODUCTION && randomContentHash && name.includes('[contenthash]')) {
    if (randomContentHashValue === null) {
      randomContentHashValue = createHash('sha256')
        .update(`${Math.random()}`)
        .digest('hex')
    }
    name = name.replace('[contenthash]', randomContentHashValue)
  }

  fixRulesDeclarations(config.module.rules)

  config.module.rules = [
    ...config.module.rules.filter(rule => (
      String(rule.test) !== imagesRuleTest
    )),

    {
      test: /\.svg$/,
      use: [{
        loader: resolve(__dirname, 'lib', 'symbol-property-name.js'),
        options: { symbolPropertyName: 'url' }
      }, {
        loader: SvgStorePlugin.loader,
        options: {
          iconName: minifyIds ? getMinifiedId : iconName,
          name,
          ...externalSvgSpriteLoaderOptions
        }
      }, {
        loader: resolve(__dirname, 'lib', 'disable-cacheable.js')
      }]
    },

    {
      ...imagesRule,
      test: new RegExp(imagesRuleTest.replace('svg|', '').slice(1, -1))
    }
  ]

  config.plugins = [
    ...config.plugins,
    new GatsbyTypescriptPluginFix(),
    new SvgStorePlugin(pluginOptions)
  ]

  actions.replaceWebpackConfig(config)
}
