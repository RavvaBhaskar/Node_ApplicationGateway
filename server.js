// const nr = require('newrelic');
const Promise = require("bluebird");

const Hapi = require('hapi'),
    Security = require('uscc-security')(),
    Chairo = require('chairo'),
    has = require('lodash.has'),
    Server = new Hapi.Server();


// promisifyAll is the Bluebird way to make node CommonJS libraries into Promises, does not work with all libraries
var fs = Promise.promisifyAll(require('fs')),
    path = Promise.promisifyAll(require('path')),
    inert = require('inert'),
    Boom = require('boom'),
    /*************************Logging*************************************/
    uscc_logging = require('uscc-logging')(),
    generalLogger = uscc_logging.general,
    logTypes = uscc_logging.logTypes,
    transactionLogger = uscc_logging.transaction, // Transaction logger: only requests/responses
    performanceLogger = uscc_logging.performance, // Performance logger
    /*************************Config and helpers**************************/
    app_config = require('uscc-app-config')(),
    app_config_settings = app_config.settings,
    app_config_constants = app_config.constants,
    gatewayUtil = require(path.resolve(__dirname +'/common/utilities/utilities.js')),
    cache = require('uscc-cache')(); // Redis Connection

if(app_config_settings.get('/NEW_RELIC/ACTIVE')) {
    require('newrelic');
}

// Initialize the general logger that can log all levels depending on configuration
// Configure the hapi bunyan plugin that injects the general bunyan logger into req.log
var config_bunyan = {
    register: require('hapi-bunyan'),
    options: {logger: generalLogger.log}
};

var config_chairo = {
    register: Chairo
};

var plugins = [config_bunyan, config_chairo, inert];

// Create HTTP connection
if (app_config_settings.get('/CONNECTION_MODE') == "HTTP" || app_config_settings.get('/CONNECTION_MODE') == "BOTH") {
    // console.log('setting PORT ', process.env.PORT || app_config_settings.get('/APP_PORT'));
    var connection = {
        port: process.env.PORT || app_config_settings.get('/APP_PORT'),
        host: process.env.HOST || app_config_settings.get('/APP_HOST')
    };

    Server.connection(connection);
}

// Create HTTPS connection
if (app_config_settings.get('/CONNECTION_MODE') == "HTTPS" || app_config_settings.get('/CONNECTION_MODE') == "BOTH") {
    var connection = {
        port: process.env.PORT || app_config_settings.get('/SSL/PORT'),
        host: process.env.HOST || app_config_settings.get('/APP_HOST'),
        tls: {
            key: process.env.SSL_KEY || app_config_settings.get('/SSL/KEY'),
            cert: process.env.SSL_CERT || app_config_settings.get('/SSL/CERT')
        }
    };
    Server.connection(connection);
}

const onRequest = function (req, reply) {
    global.transStart = new Date();
    reply.continue();
}

const allowAnonOverride = function allowAnonOverride(service, operation) {
    if ( service && operation ) {
        if ( app_config_settings.get(`/microservicesClientInfo/${service}/operation/${operation}/allowAnonymous`) ) {
            return true;
        } else {
            //operation was not found in ms object
            return false;
        }
    } else {
        // operation not sent by NG
        return false;
    }
}

const checkRestrictedAccess = function checkRestrictedAccess(request, serviceObj) {
    const overrideKey = request.headers.name || request.method; // determines if this is mobile-app or ebpp service
    if (has(serviceObj, `operation.${overrideKey}`) && has(serviceObj, `operation.${overrideKey}.restricted`) ) {
        return Boolean(serviceObj.operation[overrideKey].restricted);
    } else {
        // return service level restricted flag
        return Boolean(serviceObj.restricted);
    }
}

const onPreAuth = function onPreAuth(req, reply) {
    const microservices = app_config_settings.get('/microservicesClientInfo');
    const service = req.headers.service;
    if (service !== 'auth' ) {
        const jwt = app_config_settings.get('/JWT/COOKIE_ENABLED') ? Security.jwt.getJwtCookie(req, {type: "customer"}) : req.headers[app_config_settings.get('/JWT/COOKIE/NAME')];
        // req.server.app.cacheKey = jwt; // store JWT in server variable to be accessed in the router/handler
        if (microservices[service].allowAnonymous || allowAnonOverride(service, req.headers.name) ) {
            // service is allowAnonymous
            if (jwt) {
                // anonymous user with a JWT; validate it
                Security.jwt.isJwtValidAsync(jwt)
                    .then((res) => {
                        if (res) {
                            return Security.jwt.getJwtPayloadAsync(jwt, {type: "customer"})
                                .then(payload => {
                                    req.server.app.cacheKey = payload.customerId;
                                    return cache.fetchEsbResult(payload.customerId, "userinfo");
                                })
                                .then(result => {
                                    req.headers.userinfo = result;
                                    reply.continue();
                                })
                                .catch(err => {
                                    generalLogger.log.error(logTypes.fnInside({err:err}), 'unable to retrieve JWT Token');
                                    return reply(Boom.unauthorized('Unable to retrieve JWT', 'sample'));
                                })
                        } else {
                            return reply(Boom.unauthorized('JWT Expired', 'sample'));
                        }
                    })
                    .catch((err) => {
                        console.log('jwt validation error:', err)
                        return reply().code(401);
                    });
            } else {
                // This is an anonymous user w/o a JWT
                reply.continue();
            }
        } else {
            //allowAnonymous = 0, therefore validate the JWT
            if (!jwt) return reply(Boom.unauthorized('missing JWT Cookie', 'sample'));
            Security.jwt.isJwtValidAsync(jwt)
                .then((res) => {
                    if (res) {
                        return Security.jwt.getJwtPayloadAsync(jwt, {type: "customer"})
                            .then(payload => {
                                generalLogger.log.debug(logTypes.fnInside({}), "fetch get JWT Async");
                                req.server.app.cacheKey = payload.customerId;
                                return cache.fetchEsbResult(payload.customerId, "userinfo");
                            })
                            .then(result => {
                                generalLogger.log.debug(logTypes.fnInside({}), "fetch cached userinfo using customerId");
                                // check if user has a restricted scope in JWT and tries to access a restricted service
                                if (result.scope === "restricted" && checkRestrictedAccess(req, microservices[service]) ) return reply(Boom.unauthorized('restricted access', 'sample'));
                                req.headers.userinfo = result;
                                reply.continue();
                            })
                            .catch(err => {
                                return reply(Boom.unauthorized('Unable to retrieve JWT', 'sample'));
                            });
                    } else {
                        return reply(Boom.unauthorized('JWT Expired', 'sample'));
                    }
                })
                .catch((err) => {
                    console.log('jwt validation error:', err)
                    return reply().code(401);
                });
        }
    } else {
        //auth Service Call: inject sec04 cookie into header
        if (app_config_settings.get('/JWT/COOKIE_ENABLED')) req.headers[app_config_settings.get('/JWT/CMT/COOKIE/NAME')] = Security.jwt.getJwtCookie(req, {type: "cmt"});
        reply.continue();
    }
}

Server.ext('onRequest', onRequest);
Server.ext('onPreAuth', onPreAuth);



Server.ext('onPreHandler', function (req, reply){
    // Save the reqId (transactionId) to be used by the logger in places where there is no reference to 'req'
    global.reqId = req.id;

    reply.continue();
});

Server.ext('onPreResponse', function (req, reply) {
    let response = req.response;


    // set JWT Cookie for success oAuth JWT response
    if (app_config_settings.get('/JWT/COOKIE_ENABLED')) {
        if (req.headers.service === "auth" && response.source[app_config_settings.get('/JWT/COOKIE/NAME')] && response.statusCode === 200) {
            const new_response = reply();
            // Alter cookie expiration time depending on oAuthToken prescence
            Security.jwt.setJwtCookie(
                response.source[app_config_settings.get('/JWT/COOKIE/NAME')],
                new_response,
                req.payload.oAuthToken ? app_config_settings.get('/JWT/EXPIRATION') : app_config_settings.get('/JWT/CMT/COOKIE/EXPIRE_TIME')
            );
        }
    }
    var allowHeaders = app_config_constants.get("/ALLOW_HEADERS");

    if (response.header !== undefined) {
        response.header('Access-Control-Allow-Credentials', true);
        response.header('Access-Control-Allow-Headers', allowHeaders.join(', '));
        response.header('Access-Control-Allow-Methods', "POST,GET,PUT,DELETE,OPTIONS");
        response.header('Access-Control-Expose-Headers', allowHeaders.join(', '));
        response.header('Access-Control-Allow-Origin', req.headers.origin);
    }

    // Send transactionId back to frontend in a header (this property is called req_id in our logs, but will be called transactionId
    // for the response header
    if (response.header !== undefined) {
        response.header('transactionId', req.id);
    }


    return reply.continue();
});

// Configure sec02token cookie settings
Server.state(app_config_settings.get('/JWT/COOKIE/NAME'), {
    isSecure: app_config_settings.get('/JWT/COOKIE/isSecure'),
    isHttpOnly: app_config_settings.get('/JWT/COOKIE/isHttpOnly')
});

// HTTP Response logging:
// Instead of hooking into the hapi extension point, onPreResponse, we have to do logging here because when
// onPreResponse is called, the header values haven't been populated yet and we want to log those. Header
// values are populated on this general Node 'response' event so we do response logging here
// We are using a bunyan object to do the logging instead of the hapi-bunyan plugin because the plugin doesn't support
// two loggers
Server.on('response', function (data, tags) {
    var transEnd = new Date(); // Get the end time of the transaction

    // console.log('\n\nIn response with data.response:\n', data.response);

    data.response.transactionTime = transEnd - global.transStart; // Calculate the total transaction time
    transactionLogger.log.info(logTypes.res(data.response), "Response back to client");
    performanceLogger.log.info(logTypes.res(data.response), "Response back to client");


});

Server.register(plugins, function (err) {
    if (err) {
        return err;
    } else {
        Server.start(function (err) {
            if (err) {
                throw err;
            } else {
                gatewayUtil.registerMicroservices(Server.seneca);
                gatewayUtil.registerRoutes(Server);
                cache.getRedisClient();
            }
        })
    }
});
module.exports = Server;
