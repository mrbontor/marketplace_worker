const amqp = require('amqplib/callback_api');
const logging = require('./logging')

function pusherData(queueConn, queueName, postData) {
    amqp.connect(queueConn, function(err, conn) {
        if (err) {
            logging.error(`[AMQP][Err] >>>> ${JSON.stringify(err.message)}`)
            return setTimeout(pusherData, 1000);
        }

        conn.on("error", function(err) {
            if (err.message !== "Connection closing") {
                logging.error(`[AMQP Connection Error] >>>> ${JSON.stringify(err.message)}`)
            }
        });

        logging.info(`[AMQP] >>>> CONNECTION ESTABLISHED}`)

        conn.createChannel(function(err1, channel) {
            if (err1) {
                logging.error(`[AMQP channel][Err] >>>> ${JSON.stringify(err1.message)}`)
            }

            channel.assertQueue(queueName, {
                durable: true
            })
            channel.sendToQueue(queueName, Buffer.from(JSON.stringify(postData)),{
                persistent: true
            })

            logging.info(`[AMQP][PUSHER-DATA] >>>> ${JSON.stringify(postData)}`)
            setTimeout(function() {
                logging.info(`[AMQP] >>>> channel closed`)
                conn.close();
            }, 1000);
        });
    });
}

module.exports = pusherData
