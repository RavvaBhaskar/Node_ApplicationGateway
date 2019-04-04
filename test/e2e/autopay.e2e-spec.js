const request = require('superagent'),
	chai = require('chai'),
	expect = chai.expect,
	app_config_settings = require('uscc-app-config')().settings,
    authUser = require('./helper/auth-helper');

describe("Autopay Information", function(){  
    const userInfo = {
        "grant_type":"password",
        "username":"mapp004",
        "password":"test123",
        "cid": "956736386",
        "mdn": "3084140192",
        "ctn": "956736339",
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

    describe.skip("Step 2", function(){
		it("Makes request deleteAutoPay", function(done){  
            request
                .delete(`http://127.0.0.1:3000/apigateway`)
                .type('json')
                .set('service', 'autoPay')
                .set('Content-Type', 'application/json')
                .set({sec02token: tokenSec})
                .send({barId: userInfo.barId})
                .end((err, httpResponse) => { 
                    console.log(`Autopay information Response ${JSON.stringify(httpResponse)}`)
                    expect(err).to.not.exist;
                    expect(httpResponse.status).to.equals(200);
                    done()
                });
        });
    });

    describe("Step 2", function(){
		it("Makes request createAutopay", function(done){  
            request
                .post(`http://127.0.0.1:3000/apigateway`)
                .type('json')
                .set('service', 'autoPay')
                .set('Content-Type', 'application/json')
                .set({sec02token: tokenSec})
                .send({
                    autoPayInfo: {
                        amountType: {
                            id: "DUE_AMOUNT",
                            label: "Always pay amount due"
                        },
                        dateType: {
                            id: 1,
                            label: "On Due Date"
                        }
                    },
                    paymentMethod: {
                        walletAccounts: {
                            selected: {
                                label: "Visa x 1111",
                                type: "credit",
                                fullName: "Simone A",
                                cardNumber: "xxxxxxxxxxxx1111",
                                cardType: "Visa",
                                expMonth: 1,
                                expYear: 2026,
                                zipCode: null,
                                isExpired: false,
                                isPrimary: false,
                                isPrimaryLocked: false,
                                isAutoPay: true,
                                id: 8349195,
                                cardId: "0102855043318300"
                            }
                        }
                    },
                    barId: userInfo.barId
                })
                .end((err, httpResponse) => { 
                    console.log(`Autopay information Response ${JSON.stringify(httpResponse)}`)
                    expect(err).to.not.exist;
                    expect(httpResponse.status).to.equals(200);
                    done()
                });
            });
    });

     describe("Step 3", function(){
		it("Makes request updateAutopay", function(done){  
            request
                .put(`http://127.0.0.1:3000/apigateway`)
                .type('json')
                .set('service', 'autoPay')
                .set('Content-Type', 'application/json')
                .set({sec02token: tokenSec})
                .send({
                    autoPayInfo: {
                        amountType: {
                            id: "DUE_MORE_FIX",
                            label: "Don't pay Amount Due, if over",amount: 20
                        },
                        dateType: { 
                            label: "On Due Date",
                            id: 1
                        }
                    },
                    paymentMethod: {
                        walletAccounts: {
                            selected: { 
                                label: "Visa x1111",
                                type: "credit",
                                fullName: "Test",
                                cardNumber: "xxxxxxxxxxxx1111",
                                cardType: "Visa", 
                                expirationMonth: 5,
                                expirationYear: 2020,
                                zipCode: null,
                                isExpired: true,
                                isPrimary: true,
                                id: 8349146,
                                cardId: "0102852833109708",isPrimaryLocked: false,
                                isAutoPay: true
                            }
                        }
                    },
                    defaultState: "review",
                    barId: "956736339"
                })
                .end((err, httpResponse) => { 
                    console.log(`Autopay information Response ${JSON.stringify(httpResponse)}`)
                    expect(err).to.not.exist;
                    expect(httpResponse.status).to.equals(200);
                    done()
                });
            });
    });


    describe("Step 4", function(){
		it("Makes request retrieveAutopay", function(done){  
            request
                .get(`http://127.0.0.1:3000/apigateway`)
                .type('json')
                .set('service', 'autoPay')
                .set('Content-Type', 'application/json')
                .set({sec02token: tokenSec})
                .end((err, httpResponse) => { 
                    console.log(`Autopay information Response ${JSON.stringify(httpResponse)}`)
                    expect(err).to.not.exist;
                    expect(httpResponse.status).to.equals(200);
                    done()
                });
        });
    });
    
    describe("Step 5", function(){
		it("Makes request deleteAutoPay", function(done){  
            request
                .delete(`http://127.0.0.1:3000/apigateway`)
                .type('json')
                .set('service', 'autoPay')
                .set('Content-Type', 'application/json')
                .set({sec02token: tokenSec})
                .send({barId: "956736339"})
                .end((err, httpResponse) => { 
                    console.log(`Autopay information Response ${JSON.stringify(httpResponse)}`)
                    expect(err).to.not.exist;
                    expect(httpResponse.status).to.equals(200);
                    done()
                });
        });
    });
});