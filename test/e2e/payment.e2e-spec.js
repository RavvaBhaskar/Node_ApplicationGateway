/**
 * Created by kajal.a.sinha on 5/11/2017.
 */

const request = require('superagent'),
    chai = require('chai'),
    expect = chai.expect,
    app_config_settings = require('uscc-app-config')().settings;

describe("Payment", function(){
    const params = {scheduledId:"null"};
    const userInfo = {
        "grant_type":"password",
        "username":"mapp17",
        "password":"test123",
        "client_id":"f454c653-d928-4b33-8aed-b58ad488a078",
        "client_secret": "sdTzosJeWCNy8SzJc2MSKNYiw3MyjMZ2H30Qu0f_5lVhtJoc3YvRJjB0_7H5Nnurmkk50E9Hod6-FJHsSG4fEQ",
        "scope":"full"
    }
    var oAuthTokenValue;

    before((done) => {
        this.timeout(50000);
        request
            .post(`http://127.0.0.1:3000/idpproxy?password=${userInfo.password}&username=${userInfo.username}&scope=${userInfo.scope}&client_id=${userInfo.client_id}&client_secret=${userInfo.client_secret}&grant_type=${userInfo.grant_type}`)
            .set('Content-Type', 'application/json')
            .end(( err, httpResponse) => {
                if(err) {
                    console.log(`err ${err}`)
                    done();
                }

                oAuthTokenValue = httpResponse.body.access_token;

                expect(err).to.not.exist;
                expect(httpResponse.status).to.equals(200);

                done()
            })

    });

    describe("Step 1", function(){
        it("Does sec02token generation", function(done){
            this.timeout(50000);
            request
                .post(`http://${app_config_settings.get('/APP_HOST')}:${app_config_settings.get('/APP_PORT')}/apigateway`)
                .type('json')
                .set('service', 'auth')
                .set('Content-Type', 'application/json')
                .send({oAuthToken: oAuthTokenValue})
                .end((err, httpResponse) => {
                console.log("httpResponse"+httpResponse);
                    global.sec02tokenValue =  JSON.parse(httpResponse.text).sec02token;
                    //console.log(`response 2 ${JSON.stringify(global.sec02tokenValue)}`)
                    expect(err).to.not.exist;
                    expect(httpResponse.status).to.equals(200);
                    done()
                });
        });
    });

    describe("Step 2", function(){
        it("Retrieve Payment having ScheduleID null", function(done){
            this.timeout(50000);
            request
                .get(`http://${app_config_settings.get('/APP_HOST')}:${app_config_settings.get('/APP_PORT')}/apigateway?scheduledId=${params.scheduledId}`)
                .set('service', 'payment')
                .set('Content-Type', 'application/json')
                .set({sec02token: global.sec02tokenValue})
                .end((err, httpResponse) => {
                    expect(err).to.not.exist;
                    expect(httpResponse.status).to.equals(200);
                    done()
                });
        });
    });

    describe("Step 3", function () {
        it("One Time Payment with New Bank Account", function (done) {
            this.timeout(50000);
            request
                .post(`http://${app_config_settings.get('/APP_HOST')}:${app_config_settings.get('/APP_PORT')}/apigateway`)
                .set('service', 'payment')
                .set('Content-Type', 'application/json')
                .set({sec02token: global.sec02tokenValue})
                .send({
                "paymentInfo": {
                    "amountType": {
                        "label": "Other Amount",
                            "amount": 6,
                            "type": "OTHER",
                            "id": 3
                    },
                    "scheduledId": null,
                        "paymentDate": "2017-05-18T18:30:00.000Z"
                },
                "paymentMethod": {
                    "walletAccounts": {
                        "selected": {
                            "label": "New Bank Account <br><span class=\"badge badge-block\">(Checking or Savings)</span>",
                                "accountNumber": 1,
                                "type": "bank",
                                "isNew": true,
                                "id": -1
                        }
                    },
                    "newWalletAccount": {
                        "saveWalletAccount": {
                            "checked": true
                        },
                        "creditCard": {
                            "cardType": null
                        },
                        "bankAccount": {
                            "accountType": "Checking",
                                "routingNumber": "021101108",
                                "accountNumber": "92348798"
                        }
                    }
                }
            })
                .end((err, httpResponse) => {
                    expect(err).to.not.exist;
                    expect(httpResponse.status).to.equals(200);
                    done()
                });
        });
    });


    describe("Step 4", function () {
        it("Schedule a future Payment using New Credit Card", function (done) {
            this.timeout(50000);
            request
                .post(`http://${app_config_settings.get('/APP_HOST')}:${app_config_settings.get('/APP_PORT')}/apigateway`)
                .set('service', 'payment')
                .set('Content-Type', 'application/json')
                .set({sec02token: global.sec02tokenValue})
                .send({
                    "paymentInfo": {
                        "amountType": {
                            "label": "Other Amount",
                            "amount": 5,
                            "type": "OTHER",
                            "id": 3
                        },
                        "scheduledId": null,
                        "paymentDate": "2017-06-12T09:07:44.009Z"
                    },
                    "paymentMethod": {
                        "walletAccounts": {
                            "selected": {
                                "label": "New Credit Card",
                                "accountNumber": 2,
                                "type": "credit",
                                "isNew": true,
                                "id": -2
                            }
                        },
                        "newWalletAccount": {
                            "saveWalletAccount": {
                                "checked": true
                            },
                            "creditCard": {
                                "cardType": "mastercard",
                                "fullName": "Rakesh Test 5",
                                "cardNumber": "5336835756263078",
                                "expMonth": 2,
                                "expYear": 2020,
                                "cvv": "123",
                                "address": {
                                    "zipCode": "04344",
                                    "state": "ME",
                                    "addressLine2": null,
                                    "addressLine1": "12 Maple",
                                    "city": "Farmingdale"
                                }
                            }
                        }
                    }
                })
                .end((err, httpResponse) => {
                    expect(err).to.not.exist;
                    expect(httpResponse.status).to.equals(200);
                    done()
                });
        });
    });

    describe("Step 5", function () {
        it("Edit the Scheduled Payment by updating the currently selected Credit Card to a New Bank Account", function (done) {
            this.timeout(50000);
            request
                .put(`http://${app_config_settings.get('/APP_HOST')}:${app_config_settings.get('/APP_PORT')}/apigateway`)
                .set('service', 'payment')
                .set('Content-Type', 'application/json')
                .set({sec02token: global.sec02tokenValue})
                .send({
                    "paymentInfo": {
                        "amountType": {
                            "label": "Other",
                            "amount": 8,
                            "type": "OTHER",
                            "id": 3
                        },
                        "paymentDate": "2017-05-10T05:00:00.000Z",
                        "scheduledId": 22895930
                    },
                    "paymentMethod": {
                        "walletAccounts": {
                            "selected": {
                                "label": "New Bank Account <br><span class=\"badge badge-block\">(Checking or Savings)</span>",
                                "accountNumber": 1,
                                "type": "bank",
                                "isNew": true,
                                "id": -1
                            }
                        },
                        "newWalletAccount": {
                            "saveWalletAccount": {
                                "checked": true
                            },
                            "bankAccount": {
                                "accountType": "Checking",
                                "routingNumber": "121042882",
                                "accountNumber": "1313141412"
                            }
                        }
                    }
                })
                .end((err, httpResponse) => {
                    expect(err).to.not.exist;
                    expect(httpResponse.status).to.equals(200);
                    done()
                });
        });
    });

    describe("Step 6", function () {
        it("Delete Payment", function (done) {
            this.timeout(50000);
            request
                .delete(`http://${app_config_settings.get('/APP_HOST')}:${app_config_settings.get('/APP_PORT')}/apigateway`)
                .set('service', 'payment')
                .set('Content-Type', 'application/json')
                .set({sec02token: global.sec02tokenValue})
                .send({
                    "date": "05/01/2016",
                    "source": "Visa - x1111",
                    "amount": 534.17,
                    "type": "one",
                    "reference": 1234567890,
                    "scheduledId": 22895461,
                    "status": "Scheduled"
                })
                .end((err, httpResponse) => {
                    expect(err).to.not.exist;
                    expect(httpResponse.status).to.equals(200);
                    done()
                });
        });
    });

});
