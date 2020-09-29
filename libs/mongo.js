const logging = require('./logging')

class MongoDB {
    init(database) {
        this.MongoClient = require('mongodb').MongoClient;
        this.url = database.url
        // this.url = `mongodb://${database.user}:${database.password}@${database.host}:${database.port}/${database.database}`;
        this.db = database.database
        this.interval = database.interval
    }

    connect(callback = null) {
        let option = {
            useNewUrlParser: true,
            useUnifiedTopology: true
        }

        let self = this

        this.MongoClient.connect(this.url, option, function(err, client) {
            // assert.equal(null, err);
            if (err) return self.reconnect(callback)

            let db = client.db()

            if (callback) {
                callback(db, client)
            }
        })

    }

    reconnect(callback = null) {
        logging.debug('[DB] Reconnecting...')

        setTimeout(() => {
            this.connect(callback)
        }, this.interval)
    }

    find(collection, document, callback = null) {
        this.connect(function(db, client) {
            db.collection(collection).find(document).toArray(function(err, results) {
                if (callback) {
                    callback(err, results)
                }

                client.close()
            })
        })
    }

    findOpt(collection, document, option= null, callback = null) {
        this.connect(function(db, client) {
            db.collection(collection).find(document, option).toArray(function(err, results) {
                if (callback) {
                    callback(err, results)
                }

                client.close()
            })
        })
    }

    checkData(collection, document, callback = null) {
        this.connect(function(db, client) {
            db.collection(collection).find(document).sort({createAt: -1}).limit(1).toArray(function(err, results) {
                if (callback) {
                    callback(err, results)
                }

                client.close()
            })
        })
    }

    aggregate(collection, document, callback = null) {
        this.connect(function(db, client) {
            db.collection(collection).aggregate(document).toArray(function(err, results) {
                if (callback) {
                    callback(err, results)
                }

                client.close()
            })
        })
    }

    findOne(collection, document, callback = null) {
        this.connect(function(db, client) {
            db.collection(collection).findOne(document, (error, result) => {
                if (callback) {
                    callback(error, result)
                }

                client.close()

            })
        })
    }

    findLast(collection, document, callback = null) {
        this.connect(function(db, client) {
            db.collection(collection).find(document).sort({'_id':-1}).limit(1).toArray(function(err, results) {
                if (callback) {
                    callback(err, results)
                }

                client.close()
            })
        })
    }
    // Return Array of result of mongo findOne command
    // done in syncronous style
    async promiseFindOne(collection, document) {
        let option = { useNewUrlParser: true,
            // retry to connect for 60 times
            reconnectTries: 60,
            // wait 1 second before retrying
            reconnectInterval: 1000,
            autoReconnect : true
        }

        let client = await this.MongoClient.connect(this.url, option)
        let db = client.db()

        let result = await db.collection(collection).findOne(document)

        return result
    }

    insertOne(collection, document, callback = null) {
        this.connect(function(db, client) {
            db.collection(collection).insertOne(document, function(err, results) {
                if (callback) {
                    callback(err, results)
                }

                client.close()
            })
        })
    }

    insertMany(collection, document, option= {}, callback = null) {
        this.connect(function(db, client) {
            db.collection(collection).insertMany(document, option, function(err, results) {
                if (callback) {
                    callback(err, results)
                }

                client.close()
            })
        })
    }

    updateOne(collection, clause, document, callback = null) {
        this.connect(function(db, client) {
            db.collection(collection).updateOne(clause, document, function(err, results) {
                if (callback) {
                    callback(err, results)
                }

                client.close()
            })
        })
    }

    updateOneWithOpt(collection, clause, document, option = {}, callback = null) {
        this.connect(function(db, client) {
            db.collection(collection).updateOne(clause, document, option, function(err, results) {
                if (callback) {
                    callback(err, results)
                }

                client.close()
            })
        })
    }

    updateMany(collection, clause, document, option = {}, callback = null) {
        this.connect(function(db, client) {
            db.collection(collection).updateMany(clause, document, option, function(err, results) {
                if (callback) {
                    callback(err, results)
                }

                client.close()
            })
        })
    }

    removeFields(collection, clause, document, option, callback = null) {
        this.connect(function(db, client) {
            db.collection(collection).updateOne(clause, document, option, function(err, results) {
                if (callback) {
                    callback(err, results)
                }

                client.close()
            })
        })
    }

    replaceOne(collection, clause, document, callback = null) {
        this.connect(function(db, client) {
            db.collection(collection).replaceOne(clause, document, function(err, results) {
                if (callback) {
                    callback(err, results)
                }

                client.close()
            })
        })
    }

    deleteOne(collection, document, callback = null) {
        this.connect(function(db, client) {
            db.collection(collection).deleteOne(document, function(err, results) {
                if (callback) {
                    callback(err, results)
                }

                client.close()
            })
        })
    }

    bulkWrite(collection, operation, option, callback = null) {
        this.connect(function(db, client) {
            db.collection(collection).bulkWrite(operation, option, function(err, results) {
                if (callback) {
                    callback(err, results)
                }

                client.close()
            })
        })
    }


    ping( callback = null) {
        this.connect(function(db, client) {
            db.admin().ping((err, res) => {
                if (callback) {
                    callback(err, res)
                }
            })
        })
    }
}

module.exports = new MongoDB()
