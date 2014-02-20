'use strict';

var fs = require('fs')
var path = require('path')
var http = require('http')
var url = require('url')
var express = require('express')
var when = require('when')

var logger = require('./logger')
var util = require('./util')

var CACHE_TIME = 30 * 60 * 1000


module.exports = server


function server(coll, host, port) {
  var app = express()
  var svr = http.createServer(app)

  var dao = new Dao(coll)

  // set cache for getOverview
  var cachePromise
  var cacheTime
  function getOverviewPromise(){
    var now = new Date()
    if(cachePromise && now - cacheTime < CACHE_TIME) {
      logger.debug('Get overview from cache.')
      return cachePromise
    } else {
      var deferred = when.defer()
      dao.getOverview(function(err, data) {
        deferred.resolve({err: err, data: data})
      })

      cacheTime = now
      cachePromise = deferred.promise

      logger.debug('Get overview from db.')
      return deferred.promise
    }
  }

  app.get('/overview', function(req, res) {
    getOverviewPromise().then(function(rt) {
      if (rt.err) {
        res.send(err)
      } else {
        res.send(rt.data)
      }
    })
  })

  app.get('/recent', function(req, res) {
    var parsedUrl = url.parse(req.url, true)

    dao.getRecent(parsedUrl.query, function(err, data) {
      if (err) {
        res.send(err)
      } else {
        res.send(data)
      }
    })
  })

  var staticPath = path.join(__dirname, '..', 'static')
  app.use(express.static(staticPath))

  svr.listen(port, host, function() {
    logger.info('Start server.', {host: host, port: port})
  })
}


function Dao(coll) {
  this.coll = coll
}

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
    // NOTE
    // cannot pass scope: {util: util}, this will change util object in this context
    scope: {util: {
      getDate: util.getDate,
      average: util.average
    }}
  }

  this.coll.mapReduce(map, reduce, opts, function (err, rts) {
    if (err) {
      cb(err, null)
    } else {
      cb(null, rts[0].value)
    }
  })
}

Dao.prototype.getRecent = function(query, cb) {
  var q = query.repo ? {'config.repo': query.repo} : {}
      q.__statsCode = {$ne: 0}
  var limit = query.limit ? parseInt(query.limit) : 5

  this.coll.find(q, {limit: limit, sort: {__date: -1}}).toArray(function(err, docs) {
    docs.forEach(function(doc) {
      util.mapLaborsKey(doc, /<dot>/g, '.')
    })
    cb(err, docs)
  })
}





