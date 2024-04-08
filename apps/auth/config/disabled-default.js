// using defer functions is optional. See example and docs below.
var defer = require('config/defer').deferConfig;

module.exports = {
    firstName: undefined,
    lastName: undefined,
    fullName: defer(function() {
      return this.firstName + ' ' + this.lastName;
    })
}
