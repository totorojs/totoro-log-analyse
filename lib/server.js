'use strict';

var fs = require('fs')
var http = require('http')
var express = require('express')

var logger = require('./logger')
var util = require('./util')


module.exports = server


function server(coll, host, port) {
  var app = express()
  var svr = http.createServer(app)

  var dao = new Dao(coll)

  app.get('/', function(req, res) {
    res.send(
      '<h1>tla</h1>' +
      '<div>totoro log analyse.</div>' +
      '<a href="overview">overview</a><br/>' +
      '<a href="recent">recent</a>'
    )
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

  app.get('/recent', function(req, res) {
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
  var map = function() {
    var info = {
      __laborCount: this.__laborCount,
      __date: this.__date,
      __coverage: this.__coverage,
      duration: this.duration,
      __maxTestDuration: this.__maxTestDuration
    }
    emit('overview', info)
  }

  var reduce = function(key, docs) {
    var recentWeekOrderCount = 0
    var recentWeekLaborCount = 0
    var orderCount = 0
    var laborCount = 0
    var duration = []
    var maxTestDuration = []
    var coverage =[]

    var weekAgo = util.getDate(-7, '-')

    docs.forEach(function(doc) {
      if (doc.__date > weekAgo) {
        recentWeekOrderCount++
        recentWeekLaborCount += doc.__laborCount || 0
      }

      orderCount++
      laborCount += doc.__laborCount || 0

      if (doc.duration && doc.__maxTestDuration) {
        duration.push(doc.duration)
        maxTestDuration.push(doc.__maxTestDuration)
      }

      if (doc.__coverage) {
        coverage.push(doc.__coverage)
      }
    })

    duration = util.average(duration)
    maxTestDuration = util.average(maxTestDuration)
    coverage = util.average(coverage)

    return {
      recentWeekOrderCount: recentWeekOrderCount,
      recentWeekLaborCount: recentWeekLaborCount,
      orderCount: orderCount,
      laborCount: laborCount,
      duration: duration,
      maxTestDuration: maxTestDuration,
      coverage: coverage
    }
  }

  var opts = {
    out: {inline: 1},
    scope: {util: util}
  }

  this.coll.mapReduce(map, reduce, opts, function (err, rts) {
    if (err) {
      cb(err, null)
    } else {
      cb(null, rts[0].value)
    }
  })
}

Dao.prototype.getLatest = function(cb) {
  this.coll.find({}, {limit: 5, sort: {__date: -1}}).toArray(function(err, docs) {
    docs.forEach(function(doc) {
      util.mapLaborsKey(doc, /<dot>/g, '.')
    })
    cb(err, docs)
  })
}





