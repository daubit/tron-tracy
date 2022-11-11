const decodeParams = require("./abi.js");

module.exports = async function logError(e) {
    if (!e.output || !e.output.contractResult) {
        console.log(e);
        return;
    }
    try {
        const response = await decodeParams(["string"], e.output.contractResult[0], true)
        console.log(`LOG: ${response}`)
        return;
    } catch (e) {
        console.log("Not a string")
    }
    try {
        console.log(e.output.contractResult)
        const response = await decodeParams(["uint256"], e.output.contractResult[0], true)
        console.log(`LOG: ${response}`)
        return
    } catch (e) {
        console.log("Not a uint256")
    }
}

