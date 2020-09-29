const logging = require('./logging')
const mongo = require('./mongo')

function saveData(collection, data) {
    return new Promise(function(resolve, reject) {
        mongo.insertOne(collection, data, function (err, result){
            if(err) reject (err)
            resolve({_id:result["ops"][0]["_id"]})
        })
    })
}

function updateData(collection, clause, data) {
    return new Promise(function(resolve, reject){
        mongo.updateOne(collection, clause, data, function(err, result){
            if(err) reject(err)
            resolve(result)
        })
    })
}


function updateDataWithOpt(collection, clause, data, option = {}) {
    return new Promise(function(resolve, reject){
        mongo.updateOneWithOpt(collection, clause, data, option, function(err, result){
            console.log(result);
            if(err) reject(err)
            resolve(result)
        })
    })
}

function deleteData(collection, data) {
    return new Promise(function(resolve, reject){
        mongo.deleteOne(collection, data, function(err, result){
            if(err) reject(err)
            resolve(result)
        })
    })
}

function findData(collection, data) {
    return new Promise(function(resolve, reject){
        mongo.find(collection, data, function(err, result){
            if(err) reject(err)
            resolve(result)
        })
    })
}

function findDataWithOpt(collection, data) {
    return new Promise(function(resolve, reject){
        mongo.findDataWithOpt(collection, data, function(err, result){
            if(err) reject(err)
            resolve(result)
        })
    })
}

function findAgg(collection, data) {
    return new Promise(function(resolve, reject){
        mongo.aggregate(collection, data, function(err, result){
            if(err) reject(err)
            resolve(result)
        })
    })
}

function findLast(collection) {
    return new Promise(function(resolve, reject){
        mongo.findLast(collection, {}, function(err, result){
            if(err) reject(err)
            resolve(result)
        })
    })
}

function findDataBy(collection, data) {
    return new Promise(function(resolve, reject){
        mongo.findOne(collection, data, function(err, result){
            if(err) reject(err)
            resolve(result)
        })
    })
}

function checkData(collection, data) {
    return new Promise(function(resolve, reject){
        mongo.checkData(collection, data, function(err, result){
            if(err) reject(err)
            resolve(result)
        })
    })
}

module.exports = {
    saveData,
    updateData,
    updateDataWithOpt,
    deleteData,
    findData,
    findDataWithOpt,
    findAgg,
    findLast,
    findDataBy,
    checkData
}
