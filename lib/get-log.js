var mongoose = require('mongoose')
var when = require('when')
var dateFormat = require('dateformat')

var Schema = mongoose.Schema

var mongoPromise

var LogModel
var LogOverviewModel


function getMongo(cfg) {
    if (mongoPromise) return mongoPromise

    var defer = when.defer()
    mongoPromise = defer.promise

    var db =  mongoose.connect('mongodb://' + '10.15.52.87' + ':27017/totoro', {
        server: {
            socketOptions: {
                connectTimeoutMS: 20000
            }
        }
     })

    var LogSchema = new Schema({
        date: {type: String},
        repo: {type: String},
        orderId: {type: String},
        browsers: {type: Object},
        totalTime: {type: Number},
        coverage: {type: Number},
        averageDuration: {type: Number},
        tc: {type:Number}
    })

    var LogOverviewSchema = new Schema({
        date: {type: String},
        overview: {type: Object}
    })


    LogModel =  db.model('Log', LogSchema)
    LogOverviewModel = db.model('LogOverview', LogOverviewSchema)

    db.connection.once('open', function(){
       defer.resolve()
       /**
       LogModel.find({'_date': cfg.date}, function(err, obj) {
           if (err) {
             console.info('get data error', cfg)
           } else {
               cb(obj)
           }
       })
       **/
    })

    db.connection.on('error', function() {
        console.info('connect mongodb server error ', cfg)
        defer.reject()
    })

    return mongoPromise
}


var blackRepos = ['undefined', 'git@github.com:totorojs/totoro.git']

module.exports = function(cfg, callback) {
    var mongo = getMongo(cfg)

    return {
        get: function(cfg, cb) {
            mongo.then(function() {
                getData(cfg, LogModel, cb)
            }, function() {
                cb('Unable to connect to the mongodb service!')
            })
        },

        getRepos: function(cb) {
            mongo.then(function() {
               LogModel.find({}).sort('-_id').limit(5).exec(function(err, datas) {
                   datas = datas.filter(function(data) {
                       return blackRepos.indexOf(data.repo) < 0
                   })
                   cb(null, datas)
               })
            }, function() {
                cb('Unable to connect to the mongodb service!')
            })
        },

        getOverviews: function(cfg, cb) {
            mongo.then(function() {
                LogOverviewModel.find(cfg, function(err, datas) {
                    cb(null, datas)
                })
            }, function() {
                cb('Unable to connect to the mongodb service!')
            })
        },

        saveOverview: function(overview, cb) {
            mongo.then(function(models) {
                var overviewModel = new LogOverviewModel(overview)
                overviewModel.save(function(err) {
                    if (err) {
                        console.warn('save log error | ' + JSON.stringify(overview))
                    }
                })
            })
        }
    }
}

var defers = {}
function getData(cfg, model, cb) {
    var now = getNow()
    if (cfg.date && cfg.date < now) {
        if (defers[cfg.date]) {
            defers[cfg.date].promise.then(function(datas) {
                cb(null, datas)
            }, function(err) {
                cb(err)
            })
        } else {
          var defer = defers[cfg.date] = when.defer()
          model.find(cfg, function(err, datas) {
              if (err) {
                  defer.reject(err)
              } else {
                  defer.resolve(datas)
              }
          })

          defer.promise.then(function(datas) {
              cb(null, datas)
          }, function(err) {
              cb(err)
          })
        }
    } else {
       model.find(cfg, function(err, datas) {
           var fs = require('fs')
         fs.writeFileSync('log.json', JSON.stringify(datas))
         cb(err, datas)
       })
    }
}


function getNow() {
    return dateFormat(new Date(), 'yyyymmdd')
}

/**
var test = module.exports({})

test.getLog({_date: '20130726'}, function(err, datas) {
    console.info(1111, err, datas)
})
**/

