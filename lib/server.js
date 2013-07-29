'use strict';

var fs = require('fs')
var http = require('http')
var path = require('path')
var express = require('express')

var service = require('./log-service')


exports.create = function(launcher, opts, cb) {
    var app = express()
    var server = http.createServer(app)
    var staticPath = path.join(__dirname, '../app')

    app.use(express.static(staticPath))
    app.use(express.bodyParser())

    app.get('/', function(req, res) {
        // 1. 显示当前系统有效的浏览器
        // 2. 显示当前已经启动的浏览器
        // 3. 页面中增加减少和添加浏览器操作
        res.render('index.html')
    })

    app.get('/log/:date', function(req, res) {
        var date = req.param.date

        service.analyse(req.param.date, function(logs) {
            res.send(logs)
        })
    })
}
