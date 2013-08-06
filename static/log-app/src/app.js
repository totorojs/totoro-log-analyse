define(function(require, exports, module) {
  'use strict';

  var angular = require('angularjs')
  var app = angular.module('totoroLog', [])
  var ngResource = require('ngResource')


  app.controller('LogCtrl', ['$scope', 'logService', function($scope, logService) {
    console.info('----->>')
    $scope.logs = Log.query();
  }])

  /* Services */
  app.service('logService', ['ngResource']).
      factory('Phone', ['$resource', function($resource){
    return $resource('log/:date', {}, {
      query: {method:'GET', params:{date:''}}
    });
  }]);


  return {
    init: function() {
      angular.bootstrap(document.body, ['totoroLog'])
    }
  }
})



