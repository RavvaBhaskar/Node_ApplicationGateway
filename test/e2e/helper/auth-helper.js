const request = require('superagent'), 
    chai = require('chai'),
    Promise = require('bluebird'),
	expect = chai.expect,
	app_config_settings = require('uscc-app-config')().settings;

var otokenVal;
var tokenSec;

exports.authUser = (() => {
    generateToken().then((result) => {
        otokenVal = result.body.access_token;
        //console.log(otokenVal)
        return otokenVal;
    }).then((result) => {
        //console.log(`SEC RESULT ${result}`)
        return new Promise((resolve, reject) => {
            request
                .post('http://127.0.0.1:3000/apigateway')
                .type('json')
                .set('service', 'auth')
                .set('Content-Type', 'application/json')
                .send({oAuthToken: result})
                .end((err, httpResponse) => {
                    err ? reject(err) : resolve(httpResponse.body.sec02token)
                })     
        }).then((result) => {   
            //console.log(result)
            tokenSec = result.body.sec02token;
            
            if(tokenSec){
                console.log(tokenSec)
                return tokenSec;
            }
        }).return(tokenSec)
        .catch((err) => {
            return err;
        })
    })
})


var generateToken = (() => {
    const userInfo = {
        "grant_type":"password",
        "username":"mapp09",
        "password":"test123",
        "client_id":"f454c653-d928-4b33-8aed-b58ad488a078",
        "client_secret": "sdTzosJeWCNy8SzJc2MSKNYiw3MyjMZ2H30Qu0f_5lVhtJoc3YvRJjB0_7H5Nnurmkk50E9Hod6-FJHsSG4fEQ",
        "scope":"full"
    };

    return new Promise((resolve, reject) => {
        request
            .post(`http://127.0.0.1:3000/idpproxy?password=${userInfo.password}&username=${userInfo.username}&scope=${userInfo.scope}&client_id=${userInfo.client_id}&client_secret=${userInfo.client_secret}&grant_type=${userInfo.grant_type}`)
            .set('Content-Type', 'application/json')
            .end((err, httpResponse) => {
                err ? reject(err) : resolve(httpResponse)
            });     
    });
});

/*
var generateJwt = (() => {
    generateToken().then((otokenVal) => {                   
        request
            .post('http://127.0.0.1:3000/apigateway')
            .type('json')
            .set('service', 'auth')
            .set('Content-Type', 'application/json')
            .send({oAuthToken: otokenVal})
            .end((err, httpResponse) => { 
                if(err) {
                   // console.log(`err ${err}`)
                    return err;
                } else {
                    console.log(`response payment ${httpResponse.body.sec02token}`)
                    tokenSec = httpResponse.body.sec02token;
                    return tokenSec;
                }
            });
 
    });
});
*/