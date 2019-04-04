
const request = require('superagent'),
	chai = require('chai'),
	expect = chai.expect,
    Promise = require('bluebird'),
	app_config_settings = require('uscc-app-config')().settings,
    authHelper = require('./helper/auth-helper');

describe("Payment Activity", function(){  
    const userInfo = {
        "grant_type":"password",
        "username":"mapp004",
        "password":"test123",
        "cid": "956736386",
        "mdn": "3084140192",
        "ctn": "3084140192",
        "faId": "956736339",
        "client_id":"f454c653-d928-4b33-8aed-b58ad488a078",
        "client_secret": "sdTzosJeWCNy8SzJc2MSKNYiw3MyjMZ2H30Qu0f_5lVhtJoc3YvRJjB0_7H5Nnurmkk50E9Hod6-FJHsSG4fEQ",
        "scope":"full"
    }

    const dates = {
        "from":"2016-11-12T11:41:01.611Z","to":"2017-07-01T11:41:01.611Z"
    };

    
    var otokenVal;
    var tokenSec; 

    before((done) => {
        //authHelper.authUser();
        //done();    
        request
            .post(`http://127.0.0.1:3000/idpproxy?password=${userInfo.password}&username=${userInfo.username}&scope=${userInfo.scope}&client_id=${userInfo.client_id}&client_secret=${userInfo.client_secret}&grant_type=${userInfo.grant_type}`)
            .set('Content-Type', 'application/json')
            .end(( err, httpResponse) => {
                if(err) {
                    console.log(`err ${err}`)
                    done();
                }

                otokenVal = httpResponse.body.access_token;

                expect(err).to.not.exist;
                expect(httpResponse.status).to.equals(200);

                done()
            })
            
        
    });
   
   describe("Step 1", function(){
        it("Does sec02token generation", function(done){    
            request
                .post('http://127.0.0.1:3000/apigateway')
                .type('json')
                .set('service', 'auth')
                .set('Content-Type', 'application/json')
                .send({oAuthToken: otokenVal})
                .end((err, httpResponse) => { 
                     if(err) {
                        console.log(`err ${err}`)
                        done();
                    } 

                    tokenSec = httpResponse.body.sec02token;
            
                    expect(err).to.not.exist;
                    expect(httpResponse.status).to.equals(200);
                    done()
                    
                });
		});
	});

	describe("Step 2", function(){
		it("Makes request to paymentActivity", function(done){  
            /*
            authHelper.authUser().then((result) => {
                console.log(`RESULT ${result}`)
                */
            request
                .get(`http://127.0.0.1:3000/apigateway?from=${dates.from}&to=${dates.to}`)
                .type('json')
                .set('service', 'paymentActivity')
                .set('Content-Type', 'application/json')
                .set({sec02token: tokenSec})
                .end((err, httpResponse) => { 
                    console.log(`Payment Activity Response ${JSON.stringify(httpResponse)}`)
                    expect(err).to.not.exist;
                    expect(httpResponse.status).to.equals(200);
                    done()
                });
		    });
	    });
    });