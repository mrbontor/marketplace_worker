## Marketplace worker
### FLIP API ID

Story: a user want to withdraw his/her money from an online marketplace

### Feature
- validation
- transfer
- get detail transfer
- get history transaction
- get profile user and saldo

### Introduction
by our case, i make 2 services to handle it. this is not microservices, but i can say, mini-mini-microservices.
1. marketplace
2. marketplace_worker

* *marketplace* => is to handling user request into flip server, info transaction, saldo and transaction history.
* *marketplace_worker* => is to handling user's transaction status and update saldo

those services should be running together.

### Prerequisites

What things you need to install the software and how to install them

* [NODE JS](https://nodejs.org/) - JavaScript runtime environment
* [Needle Js](https://github.com/tomas/needle) - The leanest and most handsome HTTP client in the Nodelands.
* [amqplib](https://github.com/squaremo/amqp.node) - The Node.Js AMPQ client
* [MongoDB](http://mongodb.github.io/node-mongodb-native/) - MongoDB Node.JS Driver
* [winston](https://github.com/winstonjs/winston) - A logger to monitoring about everything.

This service is running in the `foreground`


### Installing , Running and Monitoring

```sh
git clone
npm install --save
npm start
```
to monitoring every user's requests, you can simply run command:

```sh
tail -f var/log/logMarketplaceWorker.log
```

The default path for config file is `./configs/config.***.dev.ini`, you can explicitly add config file in `--config` or `-c` argument.

### Configuring

```ini
[app]
host                = 0.0.0.0
port                = 20201

; log Configuration
[log]
path                = var/log/
level               = debug

; service marketplace
[service]
url                 = localhost:2020/api/flip/disbursement/id/

; queue of transactions
[queue]
host                = amqp://guest:guest@localhost:5672
queName             = trx_worker_dev

; database
[mongodb]
url                             = mongodb://localhost:27017/marketplace
database                        = marketplace
collection_transactions_flip    = transactions_flip
collection_transactions         = transactions
collection_users                = users
collection_users_saldo          = users_saldo
; interval in millisecond
interval = 5000

```

### Running as a Service

This module is running in the foreground, to run it as a background service please add `2>&1 &` following the command. So it would be like:

```sh
node index.js --config=/path/to/config/file --logLevel=info 2>&1 &
```

Or you can utilize Linux systemd (if you are a Linux user). Create systemd file in `/etc/systemd/system`:

```
[Unit]
Description=Marketplace Worker

[Service]
ExecStart=/path/to/node /app/index.js
Restart=always
User=nobody
# Note Debian/Ubuntu uses 'nogroup', RHEL/Fedora uses 'nobody'
Group=nogroup
Environment=PATH=/usr/bin:/usr/local/bin
Environment=NODE_ENV=production
WorkingDirectory=/app
```

### Deployment

This app has `Dockerfile` to deploy it in docker system. Build image and run it as a container:

```sh
docker build --tag marketplace
docker run --rm marketplace
```

### Acknowledgments

* FLIP ID
