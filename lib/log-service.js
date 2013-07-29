var when = require('when')
var pd = require('pretty-data').pd
var getLog = require('./get-log')({})


exports.analyse = function(date, callback) {
    var allResult = getLog.get({}, function(err, logResult) {
        var allResult = {}
        var dateResult = {}
        var dates = []

        logResult.forEach(function(log) {
            var date = log._date
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
        callback(parseResult(allResult))
    })
}

function getOverview() {
    return {
        totalTests: 0,
        succ: 0,
        failure: 0,
        averageCov: 0,
        averageTC: 0,
        averageTime: 0,
        averageDuration: 0,
        maxTC: [],
        minTC: [],
        maxCov: [],
        minCov: []
    }
}

function parseDayResult(orders) {
    var overview = getOverview()
    var result = {}

    var orderIds = Object.keys(orders)
    overview.totalTests = orderIds.length

    orderIds.forEach(function(orderId){
        var orderInfo = orders[orderId]
        var repo = orderInfo.repo
        var test = result[repo] || (result[repo] = {num: 0, succ: 0, failure: 0, averageTime: 0, averageCov: 0, averageTC: 0, averageDuration: 0})
        test.num++
        if (orderInfo.succ) {
            test.succ++
            test.averageTime = test.averageTime + parseInt(orderInfo.totalTime)
            test.averageCov = test.averageCov + orderInfo.coverage
            test.averageTC = test.averageTC + orderInfo.tc
            test.averageDuration = test.averageDuration + orderInfo.averageDuration
        } else {
            test.failure++
        }
    })

    Object.keys(result).forEach(function(repo) {
        var info = result[repo]
        averageValue(info, info.succ, 'averageTime', 'averageTC', 'averageCov', 'averageDuration')

        overview.succ = overview.succ + info.succ
        overview.failure = overview.failure + info.failure

        if (info.succ) {
            overview.averageCov = overview.averageCov + info.averageCov * info.succ
            overview.averageTC = overview.averageTC + info.averageTC * info.succ
            overview.averageDuration = overview.averageDuration + info.averageDuration * info.succ
            overview.averageTime = overview.averageTime + info.averageTime * info.succ
        }

        overview.maxTC = compare(overview.maxTC, [repo, info.averageTC], true)
        overview.minTC = compare(overview.minTC, [repo, info.averageTC], false)
        overview.maxCov = compare(overview.maxCov, [repo, info.averageCov], true)
        overview.minCov = compare(overview.minCov, [repo, info.averageCov], false)
    })

    averageValue(overview, overview.succ, 'averageTime', 'averageTC', 'averageCov', 'averageDuration')
    overview.totalTests = overview.succ + overview.failure

    overview.children = result
    //console.info(pd.json(overview))
    return overview
}

function parseResult(data) {
   var overview = getOverview()
   overview.children = data

   Object.keys(data).forEach(function(date) {
       var dayInfo = data[date]

       sumValue(overview, dayInfo, 'succ', 'failure', 'averageTime', 'averageTC', 'averageCov', 'averageDuration')

       compareValues(overview, dayInfo, 'maxTC', 'minTC', 'maxCov', 'minCov')
   })

   overview.totalTests = overview.succ + overview.failure

   averageValue(overview, Object.keys(data).length, 'averageTime', 'averageTC', 'averageCov', 'averageDuration')
   console.info(pd.json(overview))
   return overview

}

var sumValue = _expandFn(function(target, source, key) {
    target[key] = target[key] + source[key]
})

var averageValue = _expandFn(function(target, size, key) {
    target[key] = target[key] / size
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

function compare(arr1, arr2, max) {
   if (!arr1.length) return arr2

   if (arr2[1] - arr1[1] === 0) {
       return [arr1[0].concat(arr2[0]), arr1[1]]
   }

   if (max) {
      return arr2[1] - arr1[1] > 0 ? arr2 : arr1
   } else {
      return arr2[1] - arr1[1] > 0 ? arr1 : arr2
   }
}

//exports.analyse()
