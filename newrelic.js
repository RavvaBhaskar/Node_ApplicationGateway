'use strict'

/**
 * New Relic agent configuration.
 *
 * See lib/config.defaults.js in the agent distribution for a more complete
 * description of configuration variables and their potential values.
 */
var path = require('path'),
    app_config_settings = require('uscc-app-config')().settings;
exports.config = {
  /**
   * Array of application names.
   */
  app_name: app_config_settings.get('/NEW_RELIC/APP_NAME'),
  /**
   * Your New Relic license key.
   */
//  license_key: app_config_settings.get('/NEW_RELIC/LICENSE_KEY'),
  license_key: '20a2569eee83ea96fde231cb8bc5aae5894f09ce',
  logging: {
    /**
     * Level at which to log. 'trace' is most useful to New Relic when diagnosing
     * issues with the agent, 'info' and higher will impose the least overhead on
     * production applications.
     */
    level: 'trace'
  }
}
