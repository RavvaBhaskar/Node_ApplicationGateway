var assert = require('assert');
var path = require('path');


describe('Array', function() {

    describe('hooks', function() {

        before(function() {
            // runs before all tests in this block
            // console.log('before first test hook here');
        });

        after(function() {
            // runs after all tests in this block
            // console.log('after last test hooks here');
        });

        beforeEach(function() {
            // runs before each test in this block
            // console.log('before every test hooks here');
        });

        afterEach(function() {
            // runs after each test in this block
            // console.log('after every test hooks here');
        });

        // test cases
        describe('#indexOf()', function() {
            it('should return -1 when the value is not present', function() {
                assert.equal(-1, [1,2,3].indexOf(4));
            });
            it('should return the array index value when the value is present', function(){
                assert.equal(1, [1,2,3].indexOf(2));
            })
        });
    });
});