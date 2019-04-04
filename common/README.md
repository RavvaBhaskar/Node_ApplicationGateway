The common/ directory at the gateway server level will have only those 
configuration, utility, etc items that are needed by the gateway to perform
its function

Its function is to route to the microservices and perform those tasks that are
required for every request.

i.e. 
Validate the token with every request
log the request and response for every request with the transaction logger
... more things as they arise