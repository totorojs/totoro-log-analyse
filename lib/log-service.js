var when = require('when')
var async = require('async')
var moment = require('moment')
var pd = require('pretty-data').pd
var getLog = require('./get-log')({})
var fs = require('fs')

/**
getLog.get = function(cfg, cb) {
    var logResult = JSON.parse(fs.readFileSync('./test/log.json'))

    cb(null, logResult)
}
**/

exports.getErrorList = function(cb) {
    exports.getLatestOrderInfo({isSucc: false}, function(datas) {
        var errorList = datas.datas
        async.forEach(errorList, function(data, cb) {
            var orderId = data.orderList.slice(-1).pop()
            var errorList = []
            getLog.getOrder({orderId: orderId}, function(err, order) {
                if (order) {
                    var orderOverview = getOrderOverview(order)
                    data.errMsg = orderOverview.errMsg
                }
                cb()
            })
        }, function() {
            cb(errorList)
        })
    })
}

exports.getLatestOrderInfo = function(cfg, cb) {
    getLog.getRepoInfos(cfg, function(err, datas) {
        var succ = 0

        datas = datas.map(function(data) {
            if (data.isSucc) {
                succ++
            }
            return {
                repo: data.repo,
                orderList: data.orderList,
                isSucc: data.isSucc,
                date: formatDate(data.updateDate)
            }
        })

        cb({
            succRate: succ / datas.length,
            datas: datas
        })
    })
}

exports.getMostRunTest = function(cb) {
    var results = {}
    getLog.getRepos(function(err, datas) {
        datas.forEach(function(data) {
            results[data.repo] = results[data.repo] || (results[data.repo] = 0)
            results[data.repo]++
        })

        results = Object.keys(results).map(function(repo) {
            return [results[repo], repo]
        }).sort(function(arr1, arr2) {
            return arr2[0] - arr1[0]
        })
        cb(results.splice(0, 5))
    })
}

exports.getLogInfo = function(cfg, callback) {
    getLog.getOverviews(cfg, function(err, overviews) {
        var dates = []

        var result = {}
        overviews = overviews.forEach(function(data) {
            var date = data.date
            dates.push(date)
            result[date] = data.overview
        })

        dates = dates.sort()

        var now = moment().format('YYYYMMDD')

        var cfg = {}

        if (dates[dates.length - 1]) {
            cfg = {"date": {$gt: dates[dates.length - 1]}}
        }
        analyse(cfg, function(logs) {
            Object.keys(logs).forEach(function(date) {
                if (date < now) {
                    var ov = {}
                    ov[date] = logs[date]
                    getLog.saveOverview({
                        date: date,
                        overview: logs[date]
                    })
                }
                result[date] = logs[date]
            })

            callback(parseResult(result))
        })
    })
}

function analyse(cfg, callback) {
    var allResult = getLog.get(cfg, function(err, logResult) {
        var allResult = {}
        var dateResult = {}
        var dates = []

        logResult.forEach(function(log) {
            var date = log.date
            if (dateResult[date]) {
                dateResult[date].push(log)
            } else {
                dates.push(date)
                dateResult[date] = [log]
            }
        })

        dates.forEach(function(date) {
            allResult[date] = parseDayResult(dateResult[date])
        })
        callback(allResult)
    })
}

function getOverview() {
    return {
        totalTests: 0,
        totalBrowsersTests: 0,
        succTests: 0,
        failure: 0,

        totalCov: 0,
        totalTc: 0,
        totalTime: 0,
        totalDuration:0,

        maxTC: [],
        minTC: [],
        maxCov: [],
        minCov: []
    }
}


function getOrderOverview(order) {
    var bsInfo = {}
    var labors = order.labors
    var bIds = Object.keys(labors)
    var errMsg = []


    if (order.errorList.length > 0) {
        errMsg = order.errorList
    } else if (!order.totalTime) {
        errMsg.push('Unable to get totaltime.')
    } else {
        bIds.forEach(function(bId) {
            var testResult = labors[bId]
            var ua = parseUa(testResult.ua)
            var stats = testResult.stats
            if (!ua) return
            var bInfo = ua.name + ' ' + ua.version

            if (testResult.failures.length) {
                testResult.failures.forEach(function(msg) {
                    errMsg.push(bInfo + ' > ' + msg.parent + ' > ' +  msg.title + ' > ' + msg.message)
                })
            } else if (testResult.duration < 0) {
                errMsg.push(bInfo + ' Illegal duration')
            } else if (stats.error) {
                var err = stats.error
                var url = err.url
                var orderId = order.orderId
                var src = url.slice(url.indexOf(orderId) + orderId.length)
                errMsg.push(bInfo + ' ' + err.message + ' occurred at ' +  src + ' [' + err.line + ']')
            }
        })
    }

    bsInfo.succ = errMsg.length < 1

    if (!bsInfo.succ) {
        bsInfo.errMsg = errMsg
    }

    bsInfo.browsersNum = bIds.length
    bsInfo.tc = order.tc
    bsInfo.time = order.totalTime
    bsInfo.cov = order.coverage

    bsInfo.duration = order.averageDuration

    return bsInfo
}

function parseUa(uaStr) {
    var uaInfo = uaStr.split('/')
    var browsersInfo = uaInfo[0].split(' ')
    return {
        name: browsersInfo[0].trim(),
        version: browsersInfo[1].trim(),
        os: uaInfo[1]
    }
}

function parseDayResult(orders) {
    var result = {}
    var dayOverview = getOverview()
    var orderIds = Object.keys(orders)
    dayOverview.totalTests = orderIds.length

    var maxTC = []
    var minTC = []
    var maxCov = []
    var minCov = []

    orderIds.forEach(function(orderId){
        var orderInfo = orders[orderId]
        var repo = orderInfo.repo
        if (!repo) return

        var allRepoTest = result[repo] || (result[repo] = {})

        var orderOverview = getOrderOverview(orderInfo)

        allRepoTest[orderId] = orderOverview

        dayOverview.totalBrowsersTests += orderOverview.browsersNum

        if (orderOverview.succ) {
            dayOverview.succTests++
            dayOverview.totalCov += orderOverview.cov
            dayOverview.totalTc += orderOverview.tc
            dayOverview.totalTime += orderOverview.time
            dayOverview.totalDuration += orderOverview.duration

            maxTC = compare(maxTC, [repo, orderOverview.tc], true)
            minTC = compare(minTC, [repo, orderOverview.tc], false)

            maxCov = compare(maxCov, [repo, orderOverview.cov], true)
            minCov = compare(minCov, [repo, orderOverview.cov], false)

        } else {
            dayOverview.failure++
        }
    })

    dayOverview.maxTC = maxTC
    dayOverview.minTC = minTC
    dayOverview.maxCov = maxCov
    dayOverview.minCov = minCov
    //console.info(pd.json(dayOverview))
    return dayOverview

}

function parseResult(data) {
   var overview = getOverview()
   overview.children = data

   Object.keys(data).forEach(function(date) {
       var dayInfo = data[date]

       sumValue(overview, dayInfo, 'totalTests', 'totalBrowsersTests', 'succTests', 'failure', '', 'totalTc', 'totalCov', 'totalTime', 'totalDuration')

       compareValues(overview, dayInfo, 'maxTC', 'minTC', 'maxCov', 'minCov')
   })

   // console.info(pd.json(overview))
   return overview

}

var sumValue = _expandFn(function(target, source, key) {
    target[key] = target[key] + source[key]
})


var compareValues = _expandFn(function(target, source, key) {
    if (/max/.test(key)) {
        target[key] = compare(target[key], source[key], true)
    } else {
        target[key] = compare(target[key], source[key], false)
    }
})

function _expandFn(fn) {
    return function(target, source, keys) {
        if (typeof keys === 'string') {
            keys = [].slice.call(arguments, 2)
        }
        keys.forEach(function(key) {
            fn.call(null, target, source, key)
        })
    }
}

function compare(arr1, arr2, isMax) {
   if (!arr1.length) return arr2

   if (arr2[1] - arr1[1] === 0) {
       //console.info('------>', arr1)
       if (arr1[0] !== arr2[0] && (Array.isArray(arr1[0]) && arr1[0].indexOf(arr2[0]) < 0)) {
           return [arr1[0].concat(arr2[0]), arr1[1]]
       } else {
           return arr1
       }
   }

   if (isMax) {
      return arr2[1] - arr1[1] > 0 ? arr2 : arr1
   } else {
      return arr2[1] - arr1[1] > 0 ? arr1 : arr2
   }
}

/**
exports.getLatestOrderInfo(function(os) {
    console.info('---->', os)
})
**/

function getDateById(id) {
    return moment(new Date(parseInt((id+'').slice(0,8), 16)*1000)).format('YYYY-MM-DD H:mm:ss')
}

function formatDate(date) {
    return moment(new Date(date).getTime()).format('YYYY-MM-DD H:mm:ss')
}
