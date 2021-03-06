var util = require('util');
var saml = require('./lib/passport-saml/saml');
var InMemoryCacheProvider = require('./lib/passport-saml/inmemory-cache-provider').CacheProvider;
var SamlStrategy = require('./lib/passport-saml/strategy');

function MultiSamlStrategy (options, verify) {
  if (!options || typeof options.getSamlOptions != 'function') {
    throw new Error('Please provide a getSamlOptions function');
  }

  if(!options.requestIdExpirationPeriodMs){
    options.requestIdExpirationPeriodMs = 28800000;  // 8 hours
  }

  if(!options.cacheProvider){
      options.cacheProvider = new InMemoryCacheProvider(
          {keyExpirationPeriodMs: options.requestIdExpirationPeriodMs });
  }

  SamlStrategy.call(this, options, verify);
  this._options = options;
}

util.inherits(MultiSamlStrategy, SamlStrategy);

MultiSamlStrategy.prototype.authenticate = function (req, options) {
  var self = this;

  this._options.getSamlOptions(req, function (err, samlOptions) {
    if (err) {
      return self.error(err);
    }

    self._saml = new saml.SAML(Object.assign({}, self._options, samlOptions));
    self.constructor.super_.prototype.authenticate.call(self, req, options);
  });
};

MultiSamlStrategy.prototype.logout = function (req, callback) {
  var self = this;

  this._options.getSamlOptions(req, function (err, samlOptions) {
    if (err) {
      return callback(err);
    }

    self._saml = new saml.SAML(Object.assign({}, self._options, samlOptions));
    self.constructor.super_.prototype.logout.call(self, req, callback);
  });
};

MultiSamlStrategy.prototype.generateServiceProviderMetadata = function( req, decryptionCert, signingCert, callback ) {
  if (typeof callback !== 'function') {
    throw new Error("Metadata can't be provided synchronously for MultiSamlStrategy.");
  }

  var self = this;

  return this._options.getSamlOptions(req, function (err, samlOptions) {
    if (err) {
      return callback(err);
    }

    decryptionCert = decryptionCert ? decryptionCert : samlOptions.cert;
    signingCert = signingCert ? signingCert : samlOptions.cert;

    self._saml = new saml.SAML(Object.assign({}, self._options, samlOptions));
    return callback(null, self.constructor.super_.prototype.generateServiceProviderMetadata.call(self, decryptionCert, signingCert ));
  });
};

module.exports = MultiSamlStrategy;
