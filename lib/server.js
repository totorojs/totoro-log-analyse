'use strict';

var fs = require('fs')
var http = require('http')
var express = require('express')

var logger = require('./logger')


module.exports = server


function server(coll, host, port) {
  var app = express()
  var svr = http.createServer(app)

  var dao = new Dao(coll)

  app.get('/', function(req, res) {
    res.send('<h1>tla</h1>')
  })

  app.get('/overview', function(req, res) {
    dao.getOverview(function(err, data) {
      if (err) {
        res.send(err)
      } else {
        res.send(data)
      }
    })
  })

  app.get('/latest', function(req, res) {
    dao.getLatest(function(err, data) {
      if (err) {
        res.send(err)
      } else {
        res.send(data)
      }
    })
  })

  svr.listen(port, host, function() {
    logger.info('Start server.', {host: host, port: port})
  })
}


function Dao(coll) {
  this.coll = coll
}

Dao.OVERVIEW_CACHE_TIME = 30 * 60 * 1000;

Dao.prototype.getOverview = function(cb) {
 cb(null, 'overview info')
}

Dao.prototype.getLatest = function(cb) {
  this.coll.find({}, {limit: 5, sort: {__date: -1}}).toArray(function(err, docs) {
    cb(err, docs)
  })
}



