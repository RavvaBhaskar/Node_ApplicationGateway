const request = require('superagent'),
	chai = require('chai'),
	expect = chai.expect,
	app_config_settings = require('uscc-app-config')().settings,
    authUser = require('./helper/auth-helper');


describe("Payment Wallet Activity", function(){  
    const userInfo = {
        "grant_type":"password",
        "username":"mapp004",
        "password":"test123",
        "cid": "956736386",
        "barId":"956736339",
        "mdn": "3084140192",
        "ctn": "3084140192",
        "faId": "956736339",
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
		it("Makes request createWallet", function(done){  
            request
                .post(`http://127.0.0.1:3000/apigateway`)
                .type('json')
                .set('service', 'paymentWallet')
                .set('Content-Type', 'application/json')
                .set({sec02token: tokenSec})
                .send({
                    account:{
                        paymentMethod:{
                            walletAccounts:{
                                selected:{
                                    label: "New Credit Card",
                                    accountNumber: 2,
                                    type: "credit",
                                    isNew: true,
                                    id: -2
                                }
                            },
                            newWalletAccount:{
                                saveWalletAccount:{
                                    checked:true
                                },
                                creditCard:{
                                    cardType: "visa",
                                    fullName: "Rakesh Test",
                                    cardNumber: "4539857929977457",
                                    expMonth: 4,
                                    expYear: 2024,
                                    cvv: "123",
                                    address:{
                                        zipCode: "04344",
                                        state: "ME",
                                        addressLine2: null,
                                        addressLine1: "12 Maple",
                                        city: "Farmingdale"
                                    }
                                }
                            }
                        }
                    },
                    barId: userInfo.barId
                })
                .end((err, httpResponse) => { 
                    console.log(`Payment Wallet Response ${JSON.stringify(httpResponse)}`)
                    expect(err).to.not.exist;
                    expect(httpResponse.status).to.equals(200);
                    done()
                });
        });
    });

    describe("Step 3", function(){
		it("Makes request to retrieveWallet", function(done){  
            request
                .get(`http://127.0.0.1:3000/apigateway`)
                .type('json')
                //or is it service wallet
                .set('service', 'paymentWallet')
                .set('Content-Type', 'application/json')
                .set({sec02token: tokenSec})
                .end((err, httpResponse) => { 
                    console.log(`Payment Wallet Response ${JSON.stringify(httpResponse)}`)
                    expect(err).to.not.exist;
                    expect(httpResponse.status).to.equals(200);
                    done()
                });
        });
    });

    describe("Step 4", function(){
		it("Makes request updateWallet", function(done){  
            request
                .post(`http://127.0.0.1:3000/apigateway`)
                .type('json')
                .set('service', 'paymentWallet')
                .set('Content-Type', 'application/json')
                .set({sec02token: tokenSec})
                .send({
                    account:{  
                        label: "Visa X7457",
                        accountNumber: 2,
                        type: "credit",
                        fullName: "Rakesh Test",
                        cardNumber: "xxxxxxxxxxxx7457",
                        cardType: "Visa",
                        expMonth: 4,
                        expYear: 2024,
                        zipCode: null,
                        isExpired: false,
                        isPrimary: true,
                        isPrimaryLocked: false,
                        isAutoPay: false,
                        id: 8431249,
                        cardId: "0138357244657457"
                    },  
                    barId: userInfo.barId
                })
                .end((err, httpResponse) => { 
                    console.log(`Payment Wallet Response ${JSON.stringify(httpResponse)}`)
                    expect(err).to.not.exist;
                    expect(httpResponse.status).to.equals(200);
                    done()
                });
        });
    });

     describe("Step 5", function(){
		it("Makes request to deleteWallet", function(done){  
            request
                .delete(`http://127.0.0.1:3000/apigateway`)
                .type('json')
                .set('service', 'paymentWallet')
                .set('Content-Type', 'application/json')
                .set({sec02token: tokenSec})
                .send({
                    account:{
                        label: "WELLS FARGO BANK, NA x 4321",
                        type: "bank",
                        accountType: "Savings",
                        accountNumber: "12344321",
                        routingNumber: "125200057",
                        isExpired: false,
                        isPrimary: false,
                        isPrimaryLocked: false,
                        isAutoPay: true,
                        id: 8431258,
                        cardId: null
                    },
                    barId: userInfo.barId
                })
                .end((err, httpResponse) => { 
                    console.log(`Payment Wallet Response ${JSON.stringify(httpResponse)}`)
                    expect(err).to.not.exist;
                    expect(httpResponse.status).to.equals(200);
                    done()
                });
        });
    });

});