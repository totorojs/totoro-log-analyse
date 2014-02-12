define("angular-examples/phonecat/1.0.0/app-debug", [ "angularjs-debug", "./filters-debug", "./services-debug", "ngResource-debug", "./controllers-debug" ], function(require, exports, module) {
    "use strict";
    var angular = require("angularjs-debug");
    var filter = require("./filters-debug");
    var service = require("./services-debug");
    var ctrl = require("./controllers-debug");
    /* App Module */
    angular.module("phonecat", [ "phonecatFilters", "phonecatServices" ]).config([ "$routeProvider", function($routeProvider) {
        $routeProvider.when("/phones", {
            templateUrl: "partials/phone-list.html",
            controller: ctrl.PhoneListCtrl
        }).when("/phones/:phoneId", {
            templateUrl: "partials/phone-detail.html",
            controller: ctrl.PhoneDetailCtrl
        }).otherwise({
            redirectTo: "/phones"
        });
    } ]);
    return {
        init: function() {
            angular.bootstrap(document.body, [ "phonecat" ]);
        }
    };
});

define("angular-examples/phonecat/1.0.0/filters-debug", [ "angularjs-debug" ], function(require, exports, module) {
    "use strict";
    var angular = require("angularjs-debug");
    /* Filters */
    angular.module("phonecatFilters", []).filter("checkmark", function() {
        return function(input) {
            return input ? "✓" : "✘";
        };
    });
});

define("angular-examples/phonecat/1.0.0/services-debug", [ "angularjs-debug", "ngResource-debug" ], function(require, exports, module) {
    "use strict";
    var angular = require("angularjs-debug");
    var ngResource = require("ngResource-debug");
    /* Services */
    angular.module("phonecatServices", [ "ngResource" ]).factory("Phone", [ "$resource", function($resource) {
        return $resource("phones/:phoneId.json", {}, {
            query: {
                method: "GET",
                params: {
                    phoneId: "phones"
                },
                isArray: true
            }
        });
    } ]);
});

define("angular-examples/phonecat/1.0.0/controllers-debug", [], function(require, exports, module) {
    "use strict";
    /* Controllers */
    function PhoneListCtrl($scope, P) {
        $scope.phones = P.query();
        $scope.orderProp = "age";
    }
    PhoneListCtrl.$inject = [ "$scope", "Phone" ];
    function PhoneDetailCtrl($scope, $routeParams, Phone) {
        $scope.phone = Phone.get({
            phoneId: $routeParams.phoneId
        }, function(phone) {
            $scope.mainImageUrl = phone.images[0];
        });
        $scope.setImage = function(imageUrl) {
            $scope.mainImageUrl = imageUrl;
        };
    }
    PhoneDetailCtrl.$inject = [ "$scope", "$routeParams", "Phone" ];
    exports.PhoneListCtrl = PhoneListCtrl;
    exports.PhoneDetailCtrl = PhoneDetailCtrl;
});
