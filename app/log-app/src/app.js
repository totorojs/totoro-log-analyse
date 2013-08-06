define(function(require, exports, module) {
  'use strict';

  var angular = require('angularjs')
  var app = angular.module('totoroLog', [])
  var ngResource = require('ngResource')


  app.controller('LogCtrl', ['$scope', '$http', function($scope, $http) {
      $http.get('/log').success(function(data) {
          $scope.logs = data 
      })
  }])


  return {
    init: function() {
      angular.bootstrap(document.body, ['totoroLog'])
    }
  }
})



