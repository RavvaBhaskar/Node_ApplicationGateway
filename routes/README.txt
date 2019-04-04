Each of the routes that the gateway server uses are defined in this directory

Do not put anything in this directory that isn't a route.  We'll harden/rearrange the code later based on feedback

The generalRouter is set to handle the /api/{service}/{operation} case, no additional routes are needed to handle
routes that follow this format (e.g. /api/usage/getSubscriberUsage )