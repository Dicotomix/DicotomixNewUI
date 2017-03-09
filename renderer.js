
const BEGIN_SPECIAL_STYLE = "<font color='#33cc33'>";
const END_SPECIAL_STYLE = "</font>";

const network = require("./network.js")
const diacritics = require("./diacritics.js")

class Renderer {
    constructor(dom, port, address) {
        this.client = new network.Client(port, address)

        this.dom = dom

        this.words = [''] // this.words last element is always the string displayed in current-word
        this.prefixSize = 0
        this.activeLetter = -1
    }

    start() {
        this.client.start(
            () => { this.client.requestWord(network.WordRequest.MIDDLE) }, // connect callback
            (word, prefix) => { this.wordReceived(word, prefix) } // receive callback
        )

        this.dom.getElementById('next-word').addEventListener('click', () => {
            this.client.requestWord(network.WordRequest.RIGHT)
        })

        this.dom.getElementById('previous-word').addEventListener('click', () => {
            this.client.requestWord(network.WordRequest.LEFT)
        })

        this.dom.getElementById('discard-word').addEventListener('click', () => {
            this.client.requestWord(network.WordRequest.DISCARD)
        })

        this.dom.getElementById('delete-word').addEventListener('click', () => {
            if (this.words.length > 1) {
                this.words.pop()
            }
            this.client.requestWord(network.WordRequest.MIDDLE)
        })

        this.dom.getElementById('restart').addEventListener('click', () => {
            this.words = ['']
            this.client.requestWord(network.WordRequest.MIDDLE)
        })

        this.dom.getElementById('validate').addEventListener('click', () => {
            this.words.push('')
            this.client.requestWord(network.WordRequest.MIDDLE)
        })
    }

    wordReceived(word, prefix) {
        this.prefixSize = prefix
        this.words[this.words.length - 1] = word
        this.updateDOM()
    }

    get currentWord() {
        const word = this.words[this.words.length - 1]

        // known prefix coloration
        return BEGIN_SPECIAL_STYLE +
            word.slice(0, this.prefixSize) +
            END_SPECIAL_STYLE +
            word.slice(this.prefixSize)
    }

    get currentSentence() {
        var sentence = ''

        for (var i = 0; i < this.words.length - 1; ++i) {
            if (i > 0)
                sentence += ' '
            sentence += this.words[i]
        }

        if (sentence != '')
            sentence = sentence[0].toUpperCase() + sentence.slice(1)

        return sentence
    }

    updateDOM() {
        this.dom.getElementById('current-word').innerHTML = this.currentWord
        this.dom.getElementById('sentence').innerHTML = this.currentSentence

        // clear last active letter
        if (this.activeLetter !== -1) {
            this.dom.getElementById(this.activeLetter).className = "letter"
        }

        var withoutDiacritics = diacritics.removeDiacritics(this.words[this.words.length - 1])
        console.log('withoutDiacritics: ' + withoutDiacritics)
        this.activeLetter = this.prefixSize >= withoutDiacritics.length ?
            -1 : withoutDiacritics[this.prefixSize]

        // set new active letter
        if (this.activeLetter !== -1) {
            this.dom.getElementById(this.activeLetter).className = "letter active"
        }
    }
}

var handler = new Renderer(document, 5005, '127.0.0.1')
handler.start()
