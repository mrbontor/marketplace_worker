const fs = require('fs')
const iniParser = require('./libs/iniParser')
const logging = require('./libs/logging')
const util = require('./libs/utils')
const args = require('minimist')(process.argv.slice(2));
const amqp = require('amqplib/callback_api');
const mongo = require('./libs/mongo')

const NODE_ENV = process.env.NODE_ENV || 'development'
process.env.TZ = 'Asia/Jakarta'

// default config if config file is not provided
let config = {
    log: {
        path: "var/log/",
        level: "debug"
    }
}

if (args.h || args.help) {
    // TODO: print USAGE
    console.log("Usage: node " + __filename + " --config");
    process.exit(-1);
}

// overwrite default config with config file
let configFile = ('production' === NODE_ENV) ? args.c || args.config || './configs/config.trx.worker.api.prod.ini' : args.c || args.config || './configs/config.trx.worker.api.dev.ini'
config = iniParser.init(config, configFile, args)
config.log.level = args.logLevel || config.log.level

// Initialize logging library
logging.init({
    path: config.log.path,
    level: config.log.level
})

// Initialize MongoDB database
mongo.init(config.mongodb)
mongo.ping( (err, res) => {
    if (err) return logging.error(err.stack)

    if ( ! res.ok)
    return logging.error(`[MONGO] CONNECTION NOT ESTABLISHED. Ping Command not returned OK`)

    logging.debug(`[MONGO] CONNECTION ESTABLISHED`)
})

logging.info(`[CONFIG] ${JSON.stringify(iniParser.get())}`)
logging.info(`[APP] TRANSACTION STATUS WORKER STARTED on : ENV : ${NODE_ENV}`)

config = iniParser.get()

main(config.queue.host, config.queue.queName)

const request = require('./libs/needleRequest')
const pusher = require('./libs/MQServices')
const db = require('./libs/mongoController')

//main function to manage data queue
function main(queueConn, queueName) {
    amqp.connect(queueConn, function(error0, connection) {
        try {
            if (error0) {
                logging.error(`[rabbitMq] >>>> ${JSON.stringify(error0)}`)
            }

            connection.createChannel(function(error1, channel) {
                if (error1) {
                    logging.error(`[rabbitMq] >>>> ${JSON.stringify(error1)}`)
                }

                connection.on("error", function(err) {
                    if (err.message !== "Connection closing") {
                        logging.error(`[AMQPConnectionError] >>>> Queue Server disconnected ...`)
                    }
                });

                channel.assertQueue(queueName, {
                    durable: true
                });
                channel.prefetch(1);
                channel.consume(queueName, async function(data) {
                    var secs = data.content.toString().split('.').length - 1;

                    let newData = JSON.parse(data.content.toString())
                    logging.info(`[receiverData] >>>> ${JSON.stringify(newData)}`)

                    if (newData.id) {//if data exist
                        let trx = await getStatusTransaction(newData.trx_id)
                        if (!trx) {
                            logging.info(`[INFO-TRX]  >>>> Transaction is still pending`)
                            sendToQueueTrx(newData)
                        }else {
                            console.log(JSON.stringify(trx));
                            let result = await updateTrxStatusFlip(newData.id, trx)
                            if (result) { //if Something happen with db, we should send back to queue
                                // logging.info(`[INFO-TRX]  >>>> Failed while updating data`)
                                // sendToQueueTrx(newData)
                                let userInfo = await getUserSaldo(newData.user_id)
                                let preSaldo = userInfo.saldo - (trx.amount + trx.fee)

                                let updateSaldo_ = await updateSaldo(userInfo._id, preSaldo)
                                if (!updateSaldo_) { //if Something happen with db, we should send back to queue
                                    logging.debug(`[INFO-TRX]  >>>> Failed while updating data`)
                                    sendToQueueTrx(newData)
                                }
                                logging.debug(`[INFO-TRX]  >>>> Successfully done.`)
                                let total = trx.amount +
                                await updateTrxDetail(newData.id, trx)
                            }
                        }

                    }else {
                        logging.info(`[INFO-TRX]  >>>> Data not found`)
                    }

                    setTimeout(function() {
                        // logging.info(`[AMQP Msg] >>>> ${JSON.parse(data)}`)
                        channel.ack(data);
                    }, secs * 5000);
                }, {
                    // manual acknowledgment mode,
                    // see https://www.rabbitmq.com/confirms.html for details
                    noAck: false
                });

            });

        } catch (e) {
            logging.error(`[rabbitMq] >>>> ${JSON.stringify(e.stack)}`)
        }
    })
}

//get info transaction from main service
async function getStatusTransaction(id) {
    try {
        let result = await request('GET', id, {}, {json:true})
        logging.debug(`[getStatusTransaction] >>>> ${JSON.stringify(result)}`)
        if (!result.status || result.data.status !== 'SUCCESS') {
            return false
        }
        return result.data
    } catch (e) {
        logging.error(`[getStatusTransaction] >>>> ${JSON.stringify(e.stack)}`)
        return false;
    }
}

// get Detail transaction
async function getTransaction(id) {
    try {
        let getTrx = await db.findData(config.mongodb.collection_transactions_flip, {_id: id})
        if (getTrx.length === 0) {
            return false;
        }

        return getTrx[0];
    } catch (e) {
        throw (false)
    }
}

// data get user dan user saldo
async function getUserSaldo(user_id) {
    let docs = [
        {$match: {user_id: require('mongodb').ObjectId(user_id)}},
        {
            $lookup: {
                from: config.mongodb.collection_users,
                localField: "user_id",
                foreignField: "_id",
                as: "user_id"
            }
        },
        {
            $unwind: '$user_id'
        }
    ]

    let result = await db.findAgg(config.mongodb.collection_users_saldo, docs)

    logging.debug(`[userInfo&Saldo] >>>> ${JSON.stringify(result)}`)
    if (result.length > 0) return result[0];
    return null;
}

// update status transaction's flip
async function updateTrxStatusFlip(id, data) {
    try {
        let dataUpdate = {
            $set :
            {
                updated_at: util.formatDateStandard(new Date(), true),
                response: data
            }
        }
        let clause = {_id: id}

        let update = await db.updateData(config.mongodb.collection_transactions_flip, clause, dataUpdate)
        logging.debug(`[updateTrxStatusFlip]  >>>> ${JSON.stringify(update)}`)
        if (update.result.n >= 1) return true
    } catch (e) {
        logging.error(`[updateTrxStatusFlip]  >>>> ${JSON.stringify(e.stack)}`)
        return false
    }
}

// update status transaction detail
async function updateTrxDetail(id, data, total) {
    try {
        let total = data.fee + data.amount
        let dataUpdate = {
            $set :
            {
                updated_at: util.formatDateStandard(new Date(), true),
                response_vendor: data,
                status: 'SUCCESS',
                fee: data.fee,
                total_bill: total,
                // reff: '', //no needed for now
            }
        }
        let clause = {trx_vendor: id}

        let update = await db.updateData(config.mongodb.collection_transactions, clause, dataUpdate)
        logging.debug(`[updateTrxDetail]  >>>> ${JSON.stringify(update)}`)
        if (update.result.n >= 1) return true
    } catch (e) {
        logging.error(`[updateTrxDetail]  >>>> ${JSON.stringify(e.stack)}`)
        return false
    }
}

//update balance user
async function updateSaldo(id, saldo) {
    try {
        let dataUpdate = {
            $set :
            {
                updated_at: util.formatDateStandard(new Date(), true),
                saldo: saldo
            }
        }
        let clause = {_id: require('mongodb').ObjectId(id)}

        let update = await db.updateData(config.mongodb.collection_users_saldo, clause, dataUpdate)
        logging.debug(`[updateSaldo]  >>>> ${JSON.stringify(update)}`)
        if (update.result.n >= 1) return true
    } catch (e) {
        logging.error(`[updateSaldo]  >>>> ${JSON.stringify(e.stack)}`)
        throw (false)
    }
}

//send back again data into queue
function sendToQueueTrx(data) {
    let dataQueueTrx = {
        id: data.id,
        trx_id: data.trx_id,
        user_id: data.user_id
    }
    pusher(config.queue.host, config.queue.queName, dataQueueTrx)
}
