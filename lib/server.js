'use strict';

var fs = require('fs')
var http = require('http')
var path = require('path')
var express = require('express')
var common = require('totoro-common')

var logger = require('./logger')
var service = require('./log-service')

module.exports = function(coll, host, port) {
  var app = express()
  var server = http.createServer(app)

  app.get('/', function(req, res) {
    res.send('Tla')
  })

  app.get('/overview', function(req, res) {

  })

  app.get('/latest', function(req, res) {

  })

  server.listen(port, host, function() {
    logger.info('Start server.', {host: host, port: port})
  })
}
