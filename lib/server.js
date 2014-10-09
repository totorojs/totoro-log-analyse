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
    var q = url.parse(req.url, true).query

    getOverviewPromise().then(function(rt) {
      res.send(wrap(rt, q.callback))
    })
  })

  /*
  app.get('/recent', function(req, res) {
    var q = url.parse(req.url, true).query

    dao.getRecent(q, function(err, data) {
      res.send(wrap({err: err, data: data}, q.callback))
    })
  })
  */

  var staticPath = path.join(__dirname, '..', 'static')
  app.use(express.static(staticPath))

  svr.listen(port, host, function() {
    logger.info('Start server <' + host + ':' + port + '>')
  })
}


function wrap(rt, jsonpCb) {
  if (jsonpCb) {
    return jsonpCb + '(' + JSON.stringify(rt) + ')'
  } else {
    return rt
  }
}


function Dao(coll) {
  this.coll = coll
}

Dao.prototype.getOverview = function(cb) {
  this.coll.find(
    {},
    {
      fields: {
        duration: 1,
        __laborCount:1,
        __date: 1
      }
    }
  )
  .toArray(function(err, docs) {
    if (err) {
      cb(err, docs)
      return
    }

    var recentWeekOrderCount = 0
    var recentWeekLaborCount = 0
    var orderCount = 0
    var laborCount = 0
    var weekAgo = util.getDate(-7, '-')

    docs.forEach(function(doc) {
      if (doc.__date > weekAgo) {
        recentWeekOrderCount++
        recentWeekLaborCount += doc.__laborCount || 0
      }
      orderCount++
      laborCount += doc.__laborCount || 0
    })

    cb(err, {
      recentWeekOrderCount: recentWeekOrderCount,
      recentWeekLaborCount: recentWeekLaborCount,
      orderCount: orderCount,
      laborCount: laborCount
    })
  })
}


/*
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
*/





