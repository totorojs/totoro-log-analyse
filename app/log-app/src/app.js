define(function(require, exports, module) {
  'use strict';

  var angular = require('angularjs')
  var moment = require('moment')
  var app = angular.module('totoroLog', [])

  app.controller('errorListCtrl', ['$scope', '$routeParams', '$location', 'logService', function($scope, $routeParams, $location, logService) {
      var orderId = $routeParams.orderId || ' '

      logService.getErrorList(function(datas) {
          datas.forEach(function(data) {
              if (data.orderList.indexOf(orderId) > -1) {
                  data.show = true
              } else {
                  data.show = false
              }
          })
          $scope.latest = datas
      })
  }])


  app.config(['$routeProvider', function($routeProvider) {
      $routeProvider.
          when('/', {controller: 'overviewCtrl', templateUrl: 'partials/index.html'}).
          when('/errors', {templateUrl: 'partials/error-list.html', controller: 'errorListCtrl'}).
          when('/errors/:orderId', {templateUrl: 'partials/error-list.html', controller: 'errorListCtrl'}).
          otherwise({redirectTo: '/'});
  }])


  var overviewCtrl = app.controller('overviewCtrl', ['$scope', '$routeParams', '$location', 'logService', function($scope, $routeParams, $location, logService) {

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

          getErrorList: function(cb) {
              $http.get('/errors').success(function(data) {
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

  app.directive('repolink', function() {
      return {
          restrict: 'E',
          compile: function() {
              return function($scope, $element, $attr){
                  var data = JSON.parse($attr.data)
                  if (data.isSucc) {
                      $element.html(data.repo)
                  } else {
                      $element.html('<a href="#errors/' + data.orderList.slice(-1).pop() + '">' + data.repo + '</a>')
                  }
              }
          }
      }
  })

  app.directive('errlink', function() {
      return {
          restrict: 'E',
          compile: function() {
              return function($scope, $element, $attr, $routeParams){
              }
          }
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



