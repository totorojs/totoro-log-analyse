var fs = require('fs')
var path = require('path')
var mongo = require('mongodb').MongoClient
var common = require('totoro-common')

var logger = require('./logger')
var getRecord = require('./get-record')


var defaultCfg = {
  dir: 'totoro-server-logs/',
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

  fs.readdirSync(cfg.dir).forEach(function(name) {
    var obj = getRecord(path.join(cfg.dir, name))
    obj.on('record', function(record) {
      console.log(record)
    })
    obj.on('end', function() {
      console.log('end<===')
    })
  })
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
}


function validate(cfg) {
  if (!fs.existsSync(cfg.dir)) {
    logger.error(cfg.dir, 'not exists.')
  } else if (!fs.statSync(cfg.dir).isDirectory()) {
    logger.error(cfg.dir, 'is not directory.')
  }
}


// return yyyymmdd
function getNow(){
  var now = new Date()
  var y = now.getFullYear()
  var m = now.getMonth() + 1
  var d = now.getDate()
  return y + (m < 10 ? '0' : '') + m + (d < 10 ? '0' : '') + d
}
