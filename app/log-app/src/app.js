define(function(require, exports, module) {
  'use strict';

  var angular = require('angularjs')
  var moment = require('moment')
  var app = angular.module('totoroLog', [])


  app.controller('overviewCtrl', ['$scope', 'logService', function($scope, logService) {


      $scope.selectDate = function(type) {
          if (type === 'week') {
              $scope.isAll = false
              $scope.isWeek = true
          } else {
              $scope.isAll = true
              $scope.isWeek = false
          }

          loadLog(type)
      }

      $scope.selectDate('all')

      function loadLog(date) {
          var weekDate = date = moment().subtract('days', 7).format('YYYYMMDD')
          var weekLoaded = false
          var allLoaded = false

          $scope.loaded = false

          logService.loadLog(null, function(data) {
              $scope.logs = data
              allLoaded = true
              $scope.loaded = weekLoaded && allLoaded
          })

          logService.loadLog(weekDate, function(data) {
              $scope.weekLogs = data
              weekLoaded = true
              $scope.loaded = allLoaded && weekLoaded
          })
      }

      logService.getLatest(function(datas) {
          $scope.latest = datas.datas.slice(0, 5)
          $scope.succRate = datas.succRate
      })

      logService.getMost(function(datas) {
          $scope.most = datas
      })

  }])

  app.factory('logService', ['$http', function($http) {
      return {
          loadLog: function(date, cb) {
              var url = '/log/'
              if (date) {
                 url += date
              }
              $http.get(url).success(function(data) {
                  cb(data)
              })
          },
          getLatest: function(cb) {
              $http.get('/latest').success(function(data) {
                  cb(data)
              })

          },
          getMost: function(cb) {
              $http.get('/most').success(function(data) {
                  cb(data)
              })
          }
      }
  }])

  app.directive('tdlink', function() {
      return {
          restrict: 'A',
          compile: function compile(tElement, tAttrs, transclude) {
              return {
                  pre: function preLink(scope, element, attrs) {
                  },
                  post: function postLink(scope, element, attrs) {
                  }
              }
          },
          replace: true
      }
  })


  app.factory('socket', function ($rootScope) {
      var socket = io.connect();
      return {
        on: function (eventName, callback) {
          socket.on(eventName, function () {
            var args = arguments;
            $rootScope.$apply(function () {
              callback.apply(socket, args);
            });
          });
        },
        emit: function (eventName, data, callback) {
          socket.emit(eventName, data, function () {
            var args = arguments;
            $rootScope.$apply(function () {
              if (callback) {
                callback.apply(socket, args);
              }
            });
          })
        }
      };
  });



  return {
    init: function() {
      angular.bootstrap(document.body, ['totoroLog'])
    }
  }
})



