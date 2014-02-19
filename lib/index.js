'use strict';

var fs = require('fs')
var path = require('path')
var mongo = require('mongodb').MongoClient
var common = require('totoro-common')

var logger = require('./logger')
var saveLog = require('./save-log')
var server = require('./server')


var defaultCfg = {
  dir: 'totoro-server-logs/',
  db: 'localhost:27017/totoro',
  host: common.getExternalIpAddress(),
  port: 9997
}


module.exports = function(cfg) {
  var fileCfg = common.readCfgFile('tla-config.json')
  cfg = common.mix(cfg, fileCfg, defaultCfg)

  validate(cfg)

  mongo.connect('mongodb://' + cfg.user + ':' + cfg.pwd + '@' + cfg.db, function (err, db) {
    if (err) logger.error('Cannot connect to db.', err)

    db.collection('logs', function(err, coll) {
      if (err) logger.error('Cannot open collection.', err)
      server(coll, cfg.host, cfg.port)
      saveLog(coll, cfg.dir, cfg.start)
    })
  })
}


function validate(cfg) {
  if (!fs.existsSync(cfg.dir)) {
    logger.error(cfg.dir, 'not exists.')
  } else if (!fs.statSync(cfg.dir).isDirectory()) {
    logger.error(cfg.dir, 'is not directory.')
  }
}

