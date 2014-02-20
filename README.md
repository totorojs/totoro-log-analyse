![totoro](https://f.cloud.github.com/assets/340282/891339/657d9018-fa54-11e2-9760-6955388fd8fc.jpg)

# tla

Totoro log analyse.

Latest stable version：v0.5.x

---

## 1. Installation

### Install from npm

```
$ npm install totoro-log-analyse -g
```

If it not works, you may need add `sudo` before the command, as follows.

### Install from github

To get the latest function (may not be stable)

```
$ git clone git@github.com:totorojs/totoro-log-analyse.git
$ cd totoro-log-analyse
$ npm install -g
```

## 2. Set Mongodb

`tla` use mongodb to store log message, thus, first of all, [install](http://docs.mongodb.org/manual/installation/) it.

Then, [create a database](http://docs.mongodb.org/manual/tutorial/getting-started/#select-a-database) (recommend named it `totoro`) and [add a user](http://docs.mongodb.org/manual/tutorial/add-user-to-database/) which has readWrite privileges to it.

Last, restart mongodb with [auth option](http://docs.mongodb.org/manual/reference/configuration-options/#auth) .


## 3. Cli Options

### -D, --dir

Specifies log directory.

Default: 'totoro-server-logs/'

### -S, --start [s]

Start date of log file to process.

Let's assume today is 2014-02-14, and there are some log files as bellow:

```
totoro-server-logs/
  20140201.log
  20140202.log
  ...
  20140213.log
  20140214.log
```

If specifies `--start=20140201`, `tla` will process log files created since 2014-02-01.

If not specifies this option, will only process log files created today and later.

NOTE: `tla` will handle repeat log message and watch increased log message automatically.

Default: today

### -s, --db

Db server.

Default: 'localhost:27017/totoro'

### -u, --user

Db user name that is given readWrite privileges.

### -w, --pwd

Db password.

### -H, --host

HTTP server host.

`tla` supplies some HTTP api to query log info. After run `tla`, open `{{host}}:{{port}}` in browser, you will see all APIs.

Default: IP of your computer.

### -P, --port

HTTP server port.

Default: 9997

### -d, --debug

Show debug log.

### -v, --version

Output the version number.

### -h, --help

Output usage information.
