window.jQuery = window.$ = require('jquery');

var processInclude = require('base/util');

$(document).ready(function () {
    processInclude(require('./components/loyalty'));
    processInclude(require('base/components/footer'));
});


require('base/thirdParty/bootstrap');
require('base/components/spinner');
