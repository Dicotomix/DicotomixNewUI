const Step = {
    HEADER: 0,
    DATA: 1,
}

/*
    class State {
        abstract get bufferLen()
        abstract get step()
    }
}
*/

// first state: waiting for the header, two int32 big endian
class StateHeader {
    constructor() { }

    get bufferLen() {
        return 4
    }

    get step() {
        return Step.HEADER
    }
}

// second state: waiting for the requested words, string[0..len] utf8
class StateData {
    constructor(len, prefix) {
        this.len = len
        this.prefix = prefix
    }

    get bufferLen() {
        return this.len
    }

    get step() {
        return Step.DATA
    }
}

const WordRequest = {
    MIDDLE: 1,
    LEFT: 2,
    RIGHT: 3,
    DISCARD: 4,
    SPELLING: 5,
    USERNAMES: 6,
    LOGIN: 7,
}

class Client {
    constructor(port, address) {
        const net = require('net')
        this.client = new net.Socket()

        this.port = port
        this.address = address

        this.stateMachine = new StateHeader()
    }

    start(connectCallback, receiveCallback) {
        this.client.connect(this.port, this.address, () => {
            console.log('connected')
            connectCallback() // last instruction in asynchronous code so exception safe
        })

        this.client.on('close', () => {
        	console.log('connection closed')
        })

        this.client.on('readable', () => {
            let buffer
            while (null !== (buffer = this.client.read(this.stateMachine.bufferLen))) {
                if (this.stateMachine.step == Step.HEADER) {
                    const len = buffer.readInt16BE()
                    const prefix = buffer.readInt16BE(2)
                    this.stateMachine = new StateData(len, prefix)
                } else if (this.stateMachine.step == Step.DATA) {
                    const words = buffer.toString('utf8')
                    try {
                        /* receiveCallback could throw and unwind, so stateMachine as well as
                           client internal buffer would be in an inconsistent state, leading
                           to weird errors while decoding subsequent messages
                        */
                        receiveCallback(words, this.stateMachine.prefix)
                    } catch(e) {
                        console.log('Error while executing callback: ' + e)
                    }
                    this.stateMachine = new StateHeader() // go back to first state
                }
            }
        })
    }

    requestWord(requestType, requestData) {
        this.client.write(Buffer.from([requestType]))
        this.client.write(Buffer.from([requestData.length, requestData]))
    }
}

module.exports.Client = Client
module.exports.WordRequest = WordRequest
