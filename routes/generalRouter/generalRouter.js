const app_config_settings = require('uscc-app-config')().settings,
    app_config_constants = require('uscc-app-config')().constants,
    _ = require('lodash'),
    async = require('async'),
    clientInfoSettings = app_config_settings.get('/microservicesClientInfo'),
    transactionLogger = require('uscc-logging')().transaction,
    performanceLogger = require('uscc-logging')().performance,
    generalLogger = require('uscc-logging')().general,
    logTypes = require('uscc-logging')().logTypes;

// this route handles all of the direct microservice calls. It serves as an example of
// aggregating calls along variable paths, for example ->  path: '/api/{service}/{operation}'
const errorHandler = function errorHandler (error, type = "/NODE_CODES/INTERNAL_NODE_ERROR") {
    let errorObj = new Error();
    const genericError = app_config_constants.get(type);

    if (error.response) return error;

    errorObj.response = {};
    if (error.isBoom) {
        errorObj.response.errorCode = typeof (error.data) === 'object' ? error.data["ERROR_CODE"] : genericError["ERROR_CODE"];
        errorObj.response.errorMessage = error.data.ERROR_DESCRIPTION;
        errorObj.response.statusCode = error.output.statusCode;
        if (error.data["QUESTION"]) {
            errorObj.response.question = error.data["QUESTION"];
        }
    } else if (error.ERROR_CODE && error.STATUS_CODE) {
        // we were passed a properly formatted error object, set up the response using those values
        errorObj.response.errorCode = error.ERROR_CODE;
        errorObj.response.errorMessage = error.ERROR_DESCRIPTION;
        errorObj.response.statusCode = parseInt(error.STATUS_CODE);
    } else {
        errorObj.response.errorCode = genericError["ERROR_CODE"];
        errorObj.response.errorMessage = genericError["ERROR_DESCRIPTION"];
        errorObj.response.statusCode = parseInt(genericError["STATUS_CODE"]);
    }

    generalLogger.log.error(logTypes.fnInside({errorResponse:errorObj}), 'Error response body returned');
    
    return errorObj;
}

function isSenecaTimeout(err) {
    // Looking at the err object to try and detect if it's a Seneca timeout issue.
    if(err && err.seneca && err.details && err.details.message && err.details.message.includes('[TIMEOUT]')){
        generalLogger.log.debug(logTypes.fnInside(), `Seneca timeout detected`);
        return true;
    }
    else {
        generalLogger.log.debug(logTypes.fnInside(), `Seneca timeout NOT detected`);
        return false;
    }
}

exports.route = [
    {
        method: ['GET', 'POST', 'PUT', 'DELETE'],
        path: '/apigateway',
        config: {
            cors: true
        },
        handler: function (req, reply) {
            console.log(req.method);
            var service = req.headers.service;

            // Log request payload for loginWeb calls - debug oAuth token failures
            if (app_config_constants.get('/LOGGING/LOGINWEB_REQUEST_PAYLOAD') && service === "loginWeb") { 
                try {
                    let payloadClone = JSON.parse(JSON.stringify(req.payload));
                    payloadClone.password = "[HIDDEN]";
                    transactionLogger.log.info(logTypes.req(req, app_config_constants.get('/LOGGING/REQ_TYPE/OAUTH') , `loginWeb Req Payload: ${payloadClone}` ));
                } catch(err) {} // dont care if parsing fails
            }

            transactionLogger.log.info(logTypes.req(req, app_config_constants.get('/LOGGING/REQ_TYPE/API_CALL'), `API Gateway called: [${req.method}] method called on [${service}] service`));
            performanceLogger.log.info(logTypes.req(req, app_config_constants.get('/LOGGING/REQ_TYPE/API_CALL'), `API Gateway called: [${req.method}] method called on [${service}] service`));

            req.log.info(logTypes.fnEnter(), `API Gateway called: [${req.method}] method called on [${service}] service`);

            // only react to specified services, otherwise send empty reply
            if (_.includes(Object.keys(clientInfoSettings), service)) {
                const input = {
                    service: service,
                    headers: req.headers,
                    body: req.payload,
                    query: req.query,
                    params: req.params,
                    method: req.method,
                    cacheKey: req.server.app.cacheKey,
                    reqId: req.id,
                    timeout$: app_config_settings.get('/SENECA_TIMEOUT') // real scenario testing is showing 60s actual
                };

                req.log.debug(logTypes.fnInside({input:input}), `Service: ${service} found with request inputs`);
                

                if (process.env.DEBUG) {
                    console.log("\n");
                    console.log("Sending input to microservice: ", input);
                    console.log("\n");
                }
                
                
                var timesTried = 0;
                req.log.debug(logTypes.fnInside({timesTried: timesTried}), `Using async to send the request to microservice, ${service}`);


                // This forces Gateway to try to call the microservice x number of times in case the call times out
                // Only does a retry if it is a TIMEOUT, does NOT retry if any other error
                async.retry({                    
                    // async will try this x times as long as errorFilter returns true
                    times: app_config_settings.get('/GATEWAY_MAX_TRIES'),

                    // This is the condition that has to be met before it will retry
                    // If this returns true, then async wil retry again, otherwise it is a success and it won't retry
                    // Only retry for GET calls and not POST,PUT,DELETE
                    errorFilter: function(err) {
                            // We only retry on Seneca timeout errors and not other types of errors
                            if(isSenecaTimeout(err) && req.method === "get") {
                                req.log.debug(logTypes.fnInside(), `Attempt ${timesTried} to call ${service} FAILED`);
                                return true;
                            }
                        }
                    },

                    // This is the function that we want async to retry
                    function(cb) {
                        timesTried++;

                        req.log.debug(logTypes.fnInside({timesTried: timesTried}), `Attempt ${timesTried} to call ${service}`);
                        req.seneca.act(input, cb);
                    },

                    // This gets called by the callback above (cb), handles the result/err from the microservice
                    function(err, result) {
                        req.log.debug(logTypes.fnInside({timesTried: timesTried}), `Attempt ${timesTried} received response/error signal from microservice, ${input.service}`);

                        // Most errors should be in err now, but also check result.err just in case
                        // Check 'result' first b/c if there is an unhandled exception, result is undefined
                        // also check for valid error object in the result
                        if ((result && result.err) || err || (result.ERROR_CODE && result.STATUS_CODE)) {

                            let errorRes = errorHandler(err || result.err || result);

                            if(isSenecaTimeout(err || result.err)){
                                req.log.error(logTypes.fnInside({err: err || result.err}), ` ******************   Attempt ${timesTried} resulted in error due to Seneca TIMEOUT`);
                                errorRes.response.statusCode = 503 ;
                                errorRes.response.errorMessage = "Time Out Error: Could not retrieve data from back end";
                                return reply(errorRes.response.errorMessage).code(errorRes.response.statusCode);
                               // return reply("time out err").code(503);
                                // Should we have a custom error code and message for Seneca timeouts?
                            } else {
                                req.log.error(logTypes.fnInside({err: err || result.err}), `Attempt ${timesTried} received an error from microservice, ${input.service}`);
                            }

                            if (process.env.DEBUG) {
                                req.log.info(logTypes.fnInside({err: err || result.err || result}), `processing error result`);
                            }

                            return reply(errorRes.response).code(errorRes.response.statusCode);
                        }
                        else {
                            req.log.debug(logTypes.fnInside(), `Attempt ${timesTried} successful and received transformed JSON`);
                            req.log.info(logTypes.fnInside({result:result.result}), `Returning payload back in response`);
                            reply(result.result);                            
                        }

                        req.log.info(logTypes.fnExit(), `Exiting the API Gateway handler function`);
                   
                    }
                );


 
/* The old method of calling seneca.act without the retry logic
/*
                req.seneca.act(input, function (err, result) {
                    req.log.debug(logTypes.fnInside(), `Response received from microservice, ${service}`);

                    // seneca doesn't want to pass the err message above back to the client
                    // a quick search didn't reveal a good fix so this is a hack
                    // if the result has result.err then handle it here
                    if (result && result.err) { // Check result first b/c if there is an unhandled exception, result is undefined
                        req.log.error(logTypes.fnInside({err:result.err}), `An error has occurred in the application (result.err)`);
                        
                        const error = errorHandler(result.err);

                        if (process.env.DEBUG) {
                            console.log('in result.err err = ', result.err);
                        }
                        // make a function to format error object for front end and then return that instead
                        // reply(formatErrorResponse(result.err));
                        req.log.error(logTypes.fnInside({error:error}), `Returning error response`);
                        return reply(error.response).code(error.response.statusCode);
                    }
                    // Not sure why we're returning errors in result.err instead of err
                    // We are explicitly setting the result.err property in the microservices, but if there is an unhandled error/exception,
                    // It will automatically be assigned to err, so we have to handle unhandled errors here
                    else if (err) {
                        req.log.error(logTypes.fnInside({err:err}), `An error has occurred in the application (err)`);

                        const error = errorHandler(err);

                        if (process.env.DEBUG) {
                            console.log('in result.err err = ', err);
                        }

                        req.log.error(logTypes.fnInside({error:error}), `Returning error response`);

                        return reply(error.response).code(error.response.statusCode);

                    } else {

                        if (process.env.DEBUG) {
                            console.log('in result.result result = ', result.result);
                        }

                        req.log.info(logTypes.fnInside({result:result.result}), `Returning payload back in response`);
                        reply(result.result);
                    }

                    req.log.info(logTypes.fnExit(), `Exiting the API Gateway handler function`);
                });
*/                
            } else {
                req.log.info(logTypes.fnInside(), `Service: ${service} does not exist`);

                reply({
                    message: 'gateway router not configured to route to ' + service + ' service'
                });
            }            



        }
    }
];