const crypto = require('crypto');

function handleErrorValidation(array) {
    return array.reduce((obj, item) => (obj['message'] = {field: item.dataPath, message: `${item.dataPath} ` +item.message}, obj) ,{});
}

function genReff() {
    return crypto.randomBytes(3).toString('hex');
}

function formatDateStandard(date, opt = false){
    let a = new Date(date);

    let year = a.getFullYear()
    let month = ("0" + (a.getMonth() + 1)).slice(-2)
    let day = ("0" + a.getDate()).slice(-2)
    let hour = ("0" + a.getHours()).slice(-2)
    let min = ("0" + a.getMinutes()).slice(-2)
    let sec = ("0" + a.getSeconds()).slice(-2)
    let result = ''
    if (opt) result = year + '-' + month + '-' + day+ ' '+hour+':'+min+':'+ sec
    else result = year + '-' + month + '-' + day
    return result
}

module.exports = {
    handleErrorValidation,
    genReff,
    formatDateStandard
};
