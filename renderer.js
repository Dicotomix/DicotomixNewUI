
const BEGIN_SPECIAL_STYLE = "<font color='#33cc33'>";
const END_SPECIAL_STYLE = "</font>";

const network = require('./network.js')
const diacritics = require('./diacritics.js')

class Renderer {
    constructor(port, address) {
        this.client = new network.Client(port, address)

        this.words = [''] // this.words last element is always the string displayed in current-word
        this.prefixSize = 0
        this.activeLetter = -1
    }

    start() {
        this.client.start(
            () => { this.client.requestWord(network.WordRequest.MIDDLE) }, // connect callback
            (word, prefix) => { this.wordReceived(word, prefix) } // receive callback
        )

        $('#next-word').on('click', () => {
            this.client.requestWord(network.WordRequest.RIGHT)
        })

        $('#previous-word').on('click', () => {
            this.client.requestWord(network.WordRequest.LEFT)
        })

        $('#discard-word').on('click', () => {
            this.client.requestWord(network.WordRequest.DISCARD)
        })

        $('#delete-word').on('click', () => {
            if (this.words.length > 1) {
                this.words.pop()
            }
            this.client.requestWord(network.WordRequest.MIDDLE)
        })

        $('#restart').on('click', () => {
            this.words = ['']
            this.client.requestWord(network.WordRequest.MIDDLE)
        })

        $('#validate').on('click', () => {
            this.words.push('')
            this.client.requestWord(network.WordRequest.MIDDLE)
        })
    }

    wordReceived(words, prefix) {
        this.prefixSize = prefix
        let list = words.split('\n')
        console.log('Received: ' + list.join(';'))
        this.words[this.words.length - 1] = list[0]
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
        let sentence = ''

        for (let i = 0; i < this.words.length - 1; ++i) {
            if (i > 0)
                sentence += ' '
            sentence += this.words[i]
        }

        if (sentence != '')
            sentence = sentence[0].toUpperCase() + sentence.slice(1)

        return sentence
    }

    updateDOM() {
        $('#current-word').html(this.currentWord)
        $('#sentence').html(this.currentSentence)

        // clear last active letter
        if (this.activeLetter !== -1) {
            $('#' + this.activeLetter).attr('class', 'letter')
        }

        let withoutDiacritics = diacritics.removeDiacritics(this.words[this.words.length - 1])
        console.log('withoutDiacritics: ' + withoutDiacritics)
        this.activeLetter = this.prefixSize >= withoutDiacritics.length ?
            -1 : withoutDiacritics[this.prefixSize]

        // set new active letter
        if (this.activeLetter !== -1) {
            $('#' + this.activeLetter).attr('class', 'letter active')
        }
    }
}

let handler = new Renderer(5005, '127.0.0.1')
handler.start()

function getIdByKey(key) {
    if (key == 37) // left arrow
        return '#previous-word'
    else if (key == 39) // right arrow
        return '#next-word'
    else if (key == 32) // space
        return '#validate'
    else
        return null
}


document.onkeyup = (evt) => {
    let key = evt.which || evt.keyCode
    console.log(key)
    let id = getIdByKey(key)
    if (id)
        $(id)[0].click()
}
