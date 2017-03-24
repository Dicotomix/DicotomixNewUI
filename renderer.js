
const BEGIN_SPECIAL_STYLE = "<span style='color: #33cc33'>"
const END_SPECIAL_STYLE = "</span>"

const BEGIN_SPECIAL_SIZE = "<span style='font-size: calc(40px + 2.5vw)'>"
const END_SPECIAL_SIZE = "</span>"

const network = require('./network.js')
const diacritics = require('./diacritics.js')

class Renderer {
    constructor(port, address) {
        this.client = new network.Client(port, address)

        this.words = []
        this.boundedCursor = 0
        this.prefixSize = 0
        this.activeLetter = -1
    }

    get cursor() {
        return this.boundedCursor
    }

    set cursor(val) {
        if (val < 0)
            val = 0
        if (val >= this.words.length)
            val = this.words.length - 1
        this.boundedCursor = val
        this.updateDOM()
    }

    start() {
        this.client.start(
            () => { this.client.requestWord(network.WordRequest.MIDDLE) }, // connect callback
            (words, prefix) => { this.wordsReceived(words, prefix) } // receive callback
        )

        $('#next-word').on('click', () => {
            this.client.requestWord(network.WordRequest.RIGHT)
        })

        $('#previous-word').on('click', () => {
            this.client.requestWord(network.WordRequest.LEFT)
        })

        $('#discard-all').on('click', () => {
            this.client.requestWord(network.WordRequest.MIDDLE)
        })

        $('#discard-one').on('click', () => {
            this.client.requestWord(network.WordRequest.DISCARD)
        })

        $('#restart').on('click', () => {
            this.client.requestWord(network.WordRequest.MIDDLE)
        })

        $('#validate').on('click', () => {
            $('#sentence').html((_, html) => {
                const word = this.words[this.boundedCursor]
                return html.length == 0 ? word : html + ' ' + word
            })
            this.client.requestWord(network.WordRequest.MIDDLE)
        })
    }

    wordsReceived(words, prefix) {
        this.boundedCursor = 0
        this.prefixSize = prefix
        this.words = words.split('\n')
        console.log('Received: ' + this.words.join(';'))
        this.updateDOM()
    }

    updateDOM() {
        let html = ''
        for (let i = 0; i < this.words.length; ++i) {
            if (i != 0)
                html += '<br>'
            if (i == this.boundedCursor)
                html += BEGIN_SPECIAL_SIZE

            const word = this.words[i]
            html +=
                BEGIN_SPECIAL_STYLE +
                word.slice(0, this.prefixSize) +
                END_SPECIAL_STYLE +
                word.slice(this.prefixSize)


            if (i == this.boundedCursor)
                html += END_SPECIAL_SIZE
        }
        $('#words-list').html(html)

        // clear last active letter
        if (this.activeLetter !== -1) {
            $('#' + this.activeLetter).attr('class', 'letter')
        }

        let withoutDiacritics = diacritics.removeDiacritics(this.words[0])
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

$('body').on('keyup', (evt) => {
    let key = evt.which || evt.keyCode

    if (key == 40) { // up arrow
        ++handler.cursor
        return
    } else if (key == 38) { // down arrow
        --handler.cursor
        return
    }

    let id = getIdByKey(key)
    if (id)
        $(id)[0].click()
})

$('#sentence').on('keyup', (e) => { e.stopPropagation() })
