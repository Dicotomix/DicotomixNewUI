const Step = {
    LENGTH: 0,
    WORD: 1,
    PREFIX: 2,
}

/*
    class State {
        abstract get bufferLen()
        abstract get step()
    }
}
*/

// first state: waiting for the length (in bytes) of the requested word, int32 big endian
class StateLength {
    constructor() { }

    get bufferLen() {
        return 4
    }

    get step() {
        return Step.LENGTH
    }
}

// second state: waiting for the requested word itself, string[0..len] utf8
class StateWord {
    constructor(len) {
        this.len = len
    }

    get bufferLen() {
        return this.len
    }

    get step() {
        return Step.WORD
    }
}

// third state: waiting for the known prefix size, int32 big endian
class StatePrefix {
    constructor(word) {
        this.word = word
    }

    get bufferLen() {
        return 4
    }

    get step() {
        return Step.PREFIX
    }
}

const WordRequest = {
    MIDDLE: 1,
    LEFT: 2,
    RIGHT: 3,
    DISCARD: 4,
}

class Client {
    constructor(port, address) {
        const net = require('net')
        this.client = new net.Socket()

        this.port = port
        this.address = address

        this.stateMachine = new StateLength()
    }

    start(connectCallback, receiveCallback) {
        this.client.connect(this.port, this.address, () => {
            console.log('connected')
            connectCallback()
        })

        this.client.on('close', () => {
        	console.log('connection closed')
        })

        this.client.on('readable', () => {
            var buffer
            while (null !== (buffer = this.client.read(this.stateMachine.bufferLen))) {
                if (this.stateMachine.step == Step.LENGTH) {
                    var len = buffer.readInt32BE()
                    this.stateMachine = new StateWord(len)
                } else if (this.stateMachine.step == Step.WORD) {
                    var word = buffer.toString('utf8')
                    this.stateMachine = new StatePrefix(word)
                } else if (this.stateMachine.step == Step.PREFIX) {
                    var prefix = buffer.readInt32BE()
                    receiveCallback(this.stateMachine.word, prefix)
                    this.stateMachine = new StateLength() // go back to first state
                }
            }
        })
    }

    requestWord(requestType) {
        this.client.write(Buffer.from([requestType]))
    }
}

module.exports.Client = Client
module.exports.WordRequest = WordRequest
