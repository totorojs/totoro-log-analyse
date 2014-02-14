var fs = require('fs')
var mongo = require('mongodb').MongoClient
var common = require('totoro-common')

var logger = require('./logger')
var extract = require('./extract')


var defaultCfg = {
  path: 'totoro-server-logs/',
  db: 'localhost:27017/test',
  name: 'test',
  pwd: 'test',
  host: common.getExternalIpAddress(),
  port: 9997
}


module.exports = function(cfg) {
  var fileCfg = common.readCfgFile('tla-config.json')
  cfg = common.mix(cfg, fileCfg, defaultCfg)

  validate(cfg)

  extract(cfg.path)
  return

  mongo.connect('mongodb://' + cfg.name + ':' + cfg.pwd + '@' + cfg.db, function (err, db) {
    if (err) logger.error(err)

    db.collection('testdata').find(function(err, rt) {
      logger.info(err)
      rt.toArray(function(err, rt){
        console.info(rt)
        db.close()
      })

    })
  })


  /*
  connectDb()
  startServer()
    outline
  startProcess()
    findMark()
    if (handleDodaysFile) watchUpdate()
    while (hasUpdate) {
      hasUpdate = 0
      readLogFile()
      record = getRecord()
      if (recordIsInitOrder) {
        if (hasRepeatRecord) {
          reportErr()
        } else {
          insert()
        }
      } else if (recordIsDestroyOrder) {
        if (hasRepeatRecord) {
          reportErr()
        } else {
          update()
        }
      }
  processNextFile()
  */
}


function validate(cfg) {
  if (!fs.existsSync(cfg.path)) {
    logger.error(cfg.path, 'not exists.')
  } else if (!fs.statSync(cfg.path).isDirectory()) {
    logger.error(cfg.path, 'is not directory.')
  }
}
