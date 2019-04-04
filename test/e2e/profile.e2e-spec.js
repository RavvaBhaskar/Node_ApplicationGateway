const request = require('superagent'),
	chai = require('chai'),
	expect = chai.expect,
	app_config_settings = require('uscc-app-config')().settings,
    authUser = require('./helper/auth-helper');

describe("Profile Information", function(){  
    const userInfo = {
        "grant_type":"password",
        "username":"mapp004",
        "password":"test123",
        "cid": "956736386",
        "mdn": "3084140192",
        "ctn": "3084140192",
        "faId": "956736339",
        "barId": "956736339",
        "client_id":"f454c653-d928-4b33-8aed-b58ad488a078",
        "client_secret": "sdTzosJeWCNy8SzJc2MSKNYiw3MyjMZ2H30Qu0f_5lVhtJoc3YvRJjB0_7H5Nnurmkk50E9Hod6-FJHsSG4fEQ",
        "scope":"full"
    }
   
    var otokenVal;
    var tokenSec; 

    before((done) => {
       //this.timeout(50000);
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
		it("Makes request retrieveProfile", function(done){  
            request
                .get(`http://127.0.0.1:3000/apigateway`)
                .type('json')
                .set('service', 'profile')
                .set('Content-Type', 'application/json')
                .set('name', 'notificationPreferences')
                .set({sec02token: tokenSec})
                .end((err, httpResponse) => { 
                    console.log(`Profile Response ${JSON.stringify(httpResponse)}`)
                    expect(err).to.not.exist;
                    expect(httpResponse.status).to.equals(200);
                    done()
                });
        });
    });

    describe("Step 3", function(){
		it("Makes request updateProfile", function(done){  
            request
                .put(`http://127.0.0.1:3000/apigateway`)
                .type('json')
                .set('service', 'profile')
                .set('Content-Type', 'application/json')
                .set({sec02token: tokenSec})
                //.set('name', "submitEmail")
                .set('name', "notificationPreferences")
                //.send({email: "simone.a.alleyne@accenture.com"})
                .send({
                    notification: {
                        id: 0,
                        label: "Every time my account is accessed",type:"profile",
                        methods: [{
                            type: "email",
                            isChecked: false,
                            isRequired: false
                        },
                        {
                            type: "text",
                            isChecked: true,
                            isRequired: false
                        }]
                    }
                })
                .end((err, httpResponse) => { 
                    console.log(`Profile information Response ${JSON.stringify(httpResponse)}`)
                    expect(err).to.not.exist;
                    expect(httpResponse.status).to.equals(200);
                    done()
                });
        });
    });
    
});