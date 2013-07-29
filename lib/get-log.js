var mongoose = require('mongoose')
var when = require('when')
var dateFormat = require('dateformat')

var Schema = mongoose.Schema

var mongoPromise

function getMongo(cfg) {
    if (mongoPromise) return mongoPromise

    var defer = when.defer()
    mongoPromise = defer.promise

    var db =  mongoose.connect('mongodb://' + '10.15.52.87' + ':27017/test', {
        server: {
            socketOptions: {
                connectTimeoutMS: 2000
            }
        }
     })

    var LogSchema = new Schema({
        _date: {type : String},
        repo: {type: String},
        orderId: {type : String},
        browsers: {type: Object},
        succ: {type: Boolean},
        totalTime: {type: Number},
        coverage: {type: Number},
        averageDuration: {type: Number},
        tc: {type:Number}
    })

    var LogModel =  db.model('Log', LogSchema)

    db.connection.once('open', function(){
       defer.resolve(LogModel)
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


// TODO cache
module.exports = function(cfg, callback) {
    var mongo = getMongo(cfg)

    return {
        get: function(cfg, cb) {
            mongo.then(function(LogModel) {
                getData(cfg, LogModel, cb)
            }, function() {
                cb('Unable to connect to the mongodb service!')
            })

        }
    }

}

var defers = {}
function getData(cfg, LogModel, cb) {
    var now = getNow()
    if (cfg._date && cfg._date < now) {
        if (defers[cfg._date]) {
            defers[cfg._date].promise.then(function(datas) {
                cb(null, datas)
            }, function(err) {
                cb(err)
            })
        } else {
          var defer = defers[cfg._date] = when.defer()
          LogModel.find(cfg, function(err, datas) {
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
       LogModel.find(cfg, function(err, datas) {
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

