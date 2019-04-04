This is the gateway server for the mobile-app project.

It will perform basic routing for the microservices.

It will also perform functions related to activities that must be performed on every request/response
i.e. 
Validate the token with every request
log the request and response for every request with the transaction logger
... more things as they arise


Basic Structure:

    server.js initializes the server, sets up some logging/caching, pulls in configuration settings, etc
    
    routes/generalRouter/generalRouter.js has the routing information for the microservices
            
    uscc-app-config, settings.js contains the settings for each microservice
        both the gateway and microservice get the settings from there
        i.e:
                auth: {
                    type: 'tcp',
                    port: 3029,
                    pin: 'service:auth',
                    allowAnonymous: 0,
                    restricted: 0
                },
        
        
            