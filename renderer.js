const network = require('./network.js')
const diacritics = require('./diacritics.js')
const stringUtil = require('grapheme-js').stringUtil;

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
        $('#words-list').removeClass("list-2 list-3 list-4 list-several")
        if(this.words.length > 1)
            $('#words-list').addClass("list-several list-"+ this.words.length)

        let html = ''
        for (let i = 0; i < this.words.length; ++i) {
            if (i == this.boundedCursor)
                html += '<li class="selected-word">'
            else
                html += '<li>'

            const word = this.words[i]
            html += '<span class="prefix">' +
                stringUtil.sliceGraphemeClusters(word, 0, this.prefixSize) +
                '</span>' +
                stringUtil.sliceGraphemeClusters(word, this.prefixSize)

            if (i == this.boundedCursor)
                html += '</li>'
        }
        $('#words-list').html(html)

        // clear last active letter
        if (this.activeLetter !== -1) {
            $('#' + this.activeLetter).attr('class', 'letter')
        }

        const withoutDiacritics = diacritics.removeDiacritics(this.words[0])

        this.activeLetter = -1
        let index = this.prefixSize
        while (index < withoutDiacritics.length) {
            const letter = withoutDiacritics[index]
            if (letter >= 'a' && letter <= 'z') { // beware of special chars
                this.activeLetter = letter
                break
            }
            ++index
        }

        // set new active letter
        this.activeLetter = "'"
        if (this.activeLetter !== -1) {
            $("#" + this.activeLetter).attr('class', 'letter active')
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
    const key = evt.which || evt.keyCode

    if (key == 40) { // up arrow
        ++handler.cursor
        return
    } else if (key == 38) { // down arrow
        --handler.cursor
        return
    }

    const id = getIdByKey(key)
    if (id)
        $(id)[0].click()
})

$('#sentence').on('keyup', (e) => { e.stopPropagation() })
