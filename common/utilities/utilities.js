var Promise = require("bluebird"),
    pathsConfig = require(__dirname +'/../config/paths');

var path = Promise.promisifyAll(require('path')),
    glob = Promise.promisify(require('glob')),
    microservicesRootDirectory = pathsConfig.paths.microservicesDirectory,
    routesRootDirectory = pathsConfig.paths.routesDirectory,
    generalLogger = require('uscc-logging')().general,
    app_config_settings = require('uscc-app-config')().settings,
    services = require('uscc-services')();

// This is designed so we can add microservices without changes to the server.js file
exports.registerMicroservices = function (seneca) {

    var clientInfoSettings = app_config_settings.get('/microservicesClientInfo');
    // read the list of config files in the microservicesRootDirectory and set the clients
    Object.keys(clientInfoSettings).forEach( function(key) {
        if (clientInfoSettings.hasOwnProperty(key)){
            console.log('setting microservice with clientInfo', clientInfoSettings[key]);
            seneca.client({
                type: clientInfoSettings[key].type,
                port: clientInfoSettings[key].port,
                pin: clientInfoSettings[key].pin
            });
        }
    })
};

// This is designed so we can add routes without changes to the server.js file
exports.registerRoutes = function (server) {
    // read the list of js files in the routesRootDirectory and set the routes from them
    glob(path.resolve( routesRootDirectory, '**/*.js'))
        .each(function (file) {
            //node handles requires from the calling directory, so this forces us to have microservice node modules
            // installed at the server level, an antipattern
            var requiredRoute = require(path.resolve(file));
            if (requiredRoute.route) {
                //generalLogger.log.info('Setting route: ', requiredRoute.route);
                console.log('registering route ', requiredRoute.route);

                server.route(requiredRoute.route);
            } else {
                generalLogger.log.info('Found file ' + file + ' in ' + routesRootDirectory +
                    ' but it doesn\'t export a route');
            }
        })
        .catch(function (reason) {
            generalLogger.log.info('Error in setting routes: ', reason);
        });
};

/*
We could set this up to clone the microservice project if it's not found
some caveats:
    we'd have to have a gitlab login for the server. maybe some config/env variables set by the gateway when it starts
    registerMicroservices would have to wait synchronously on the result of registerRoutes to ensure the clone is done
    the routes files would have to export repositoryInfo for each of the desired routes and associated microservices

// in registerRoutes check for the presence of the microservice
//    call this function if a route is found but microservice is missing
var cloneRepo = function(repositoryInfo) {
  node.exec('git clone ' + repositoryInfo.url + ' ./microservices/'+repositoryInfo.name);
};

    */