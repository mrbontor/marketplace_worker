const fs = require('fs')
const iniParser = require('./libs/iniParser')
const logging = require('./libs/logging')
const util = require('./libs/utils')
const args = require('minimist')(process.argv.slice(2));
const bodyParser = require('body-parser')
const express = require('express')
const amqp = require('amqplib/callback_api');
const mongo = require('./libs/mongo')
const app = express()

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

const take_port = config.app.port;
const port = take_port || process.env.PORT;

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

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.listen(config.app.port, () => {
    logging.info(`[APP] TRANSACTION STATUS WORKER STARTED on : ${config.app.port} ENV : ${NODE_ENV}`)
});

process
.on('unhandledRejection', (reason, p) => {
    console.error(reason, 'Unhandled Rejection at Promise', p);
})
.on('uncaughtException', err => {
    console.error(err, 'Uncaught Exception thrown');
});

// process.setMaxListeners(0);

// const mq = require('./libs/MQServices')
// function testQue() {
//     let data = {
//         "id": "123"
//     }
//     mq(config.queue.host, config.queue.queName, data)
// }
// testQue()
config = iniParser.get()


main(config.queue.host, config.queue.queName)
const request = require('./libs/needleRequest')
const pusher = require('./libs/MQServices')
const db = require('./libs/mongoController')


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

                    if (newData.id) {
                        let trx = await getStatusTransaction(newData.trx_id)
                        if (!trx) {
                            logging.info(`[INFO-TRX]  >>>> Transaction is still pending`)
                            sendToQueueTrx(newData)
                        }

                        let result = await updateTrx(newData.id, trx.data)
                        if (!result) {
                            logging.info(`[INFO-TRX]  >>>> Failed while updating data`)
                            sendToQueueTrx(newData)
                        }
                    }else {
                        logging.info(`[INFO-TRX]  >>>> Data not found`)
                    }

                    setTimeout(function() {
                        // logging.info(`[AMQP Msg] >>>> ${JSON.parse(data)}`)
                        channel.ack(data);
                    }, secs * 3000);
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


async function getStatusTransaction(id) {
    let result = await request('GET', id, {}, {json:true})
    logging.info(`[getStatusTransaction] >>>> ${JSON.stringify(result)}`)
    if (!result.status) return false

    if (result.data.status !== 'SUCCESS') return false

    return result
}

async function updateTrx(id, data) {
    try {
        let dataUpdate = {
            $set :
            {
                updated_at: util.formatDateStandard(new Date(), true),
                response: data
            }
        }
        let clause ={
            _id: id
        }

        let update = await db.updateData(config.mongodb.collection_transactions, clause, dataUpdate)
        logging.debug(`[updateTrx]  >>>> ${JSON.stringify(update)}`)
        if (!update) return false

        return true
    } catch (e) {
        logging.error(`[updateTrx]  >>>> ${JSON.stringify(e.stack)}`)
        throw (false)
    }
}

function sendToQueueTrx(data) {
    let dataQueueTrx = {
        id: data.id,
        trx_id: data.trx_id
    }
    pusher(config.queue.host, config.queue.queName, dataQueueTrx)
}
