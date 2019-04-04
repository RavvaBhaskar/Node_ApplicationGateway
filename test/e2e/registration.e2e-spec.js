const request = require('superagent'),
	chai = require('chai'),
	expect = chai.expect,
	app_config_settings = require('uscc-app-config')().settings,
	service = require('uscc-services')(),
	dataAccess = require('uscc-data-access')().ldap;


describe("Registration", function(){
	const SERVER_URL = `http://${app_config_settings.get('/APP_HOST')}:${app_config_settings.get('/APP_PORT')}/apigateway`;
	const tempBanObjCN = {
    filter: ('cn=956736385'),
    scope: 'sub'
	}

  before(() => {
  });

  after(() => {
  });

	describe("Step 1", function(){
		it("Does accountLookup with using correct PIN", function(done){
			request
				.post(SERVER_URL)
				.send({ctn: {value: '3084140238'}, pin: {value: '1234' }})
				.set('service', 'registration')
				.set('name', 'accountLookup')
				.set('Content-Type', 'application/json')
				.end((err, httpResponse) => {
					expect(err).to.not.exist;
					expect(httpResponse.status).to.equals(200);
					done()
				});
		});
	});

	describe("Step 2", function(){
		it("Does send verfication request", function(done){
			request
				.post(SERVER_URL)
				.send({ctn: {value: '3084140238'}, cId: '956736502', email: 'robin.a.paul@accenture.com'})
				.set('service', 'registration')
				.set('name', 'sendVerificationRequest')
				.set('Content-Type', 'application/json')
				.end(function(err, httpResponse){
					expect(err).to.not.exist;
					expect(httpResponse.status).to.equals(200);
					done();
			});
		});

		it('created the tempBanObj for MAPP39', function(done) {
			service.searchLdapUser.searchLdapUser({ params: {objectType: "tempBanObj", cId: "956736502"}})
				.then(userArray => {
					expect(userArray).to.not.be.empty;
					done();
				})
				.catch(err => {console.log(err); done();})
		});
	});

	describe("Step 4", function(){
		var tempBanObj;

		before((done) => {
			// adding 2 second delay perhaps due to slowness of tempBanObjCreation???
			service.searchLdapUser.searchLdapUser({ params: {objectType: "tempBanObj", cId: "956736502"}})
				.then(userArray => {
					tempBanObj = JSON.parse(userArray[0]);
					done();
				})
				.catch(err => {
					console.log("ERRORZ",err)
					done();
				});
		});

		it("validates PassCode", function(done) {
			
			request
				.get(`${SERVER_URL}?passcode=%7B%22value%22:%22${tempBanObj.uscPIN}%22%7D&cId=${tempBanObj.uscCustomerID}`)
				.send({ctn: {value: '3084140238'}, cId: '956736502', email: 'robin.a.paul@accenture.com'})
				.set('service', 'registration')
				.set('name', 'validatePasscode')
				.set('Content-Type', 'application/json')
				.end(function(err, httpResponse){
					expect(err).to.not.exist;
					expect(httpResponse.status).to.equals(200);
					done();
				});
		})

		it("validates PIN", function(done) {
			request
				.get(`${SERVER_URL}?pin=%7B%22value%22:%221234%22%7D&cId=${tempBanObj.uscCustomerID}`)
				.send({ctn: {value: '3084140238'}, cId: '956736502', email: 'robin.a.paul@accenture.com'})
				.set('service', 'registration')
				.set('name', 'validatePin')
				.set('Content-Type', 'application/json')
				.end(function(err, httpResponse){
					expect(err).to.not.exist;
					expect(httpResponse.status).to.equals(200);
					done();
			});
		})
	});
});