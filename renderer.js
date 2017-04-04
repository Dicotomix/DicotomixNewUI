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
        this.wordSeparator = ' '
        this.writingArea = '#sentence'
        this.prefixClass = 'prefix'
        this.login = ''
    }

    get cursor() {
        return this.boundedCursor
    }

    set cursor(val) {
        this.boundedCursor = (val + this.words.length) % this.words.length
        this.updateDOM()
    }

    start() {
        this.client.start(
            () => { this.client.requestWord(network.WordRequest.USERNAMES) }, // connect callback
            (words, prefix) => {
                this.wordsReceived(words, prefix)
            } // receive callback
        )

        $('.username').on('click', () => {

        })

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
            $(this.writingArea).html((_, html) => {
                let word = this.words[this.boundedCursor]

                if(this.login == '') {
                    this.login = word
                    if(word == '[new]') {
                        let name = $('.newUserInput input').val()
                        if(name == '')
                            return
                        else
                            word = diacritics.removeDiacritics(name)
                    }
                    this.client.requestWord(network.WordRequest.LOGIN, word)
                    $('#words-list').html('Bienvenue ' + word)
                    $('#username').html('Bonjour <span>' + word + '</span> !')
                    $('#date').html((new Date()).toLocaleDateString())
                    $('#alphabet').html('');
                    for (let l = 'a'; l <= 'z'; l = String.fromCharCode(l.charCodeAt() + 1)) {
                        $('#alphabet').append(
                            '<div class = "letter" id = "' + l + '">' + l.toUpperCase() + '</div>'
                        )
                    }
                    $('#alphabet').slideDown(200)
                    $('body').removeClass('prelog')


                    $('#sentence').html('').attr('contenteditable', 'true')
                    $('#restart').trigger('click')

                    return ""
                }
                 // spelling mode through words dichotomy (the 2nd condition should be always true)
                if (word[0] == '[' && !$('#top-part').hasClass('spelling-mode')) {
                    $('#spelling').trigger('click')
                    this.words[this.boundedCursor] = word.substr(1)
                    $('#validate').trigger('click')
                    return html
                }

                return html.length == 0 ? word : html + this.wordSeparator + word
            })
            this.client.requestWord(network.WordRequest.MIDDLE)
        })

        $('#spelling').on('click', () => {
            if($('#top-part').hasClass('spelling-mode')) { // quit spelling mode
                this.client.requestWord(network.WordRequest.SPELLING) // tell server to disable spelling

                this.wordSeparator = ' '
                this.words[this.boundedCursor] = $('#spelled').html()

                // tell server to add a new word
                this.client.requestWord(
                    network.WordRequest.CUSTOM_WORD,
                    this.words[this.boundedCursor]
                )

                this.writingArea = '#sentence'
                this.prefixClass = 'prefix'
                $('#top-part').removeClass('spelling-mode')
                $('#validate').trigger('click')
            } else {
                // enter spelling mode
                this.wordSeparator = ''
                this.writingArea = '#spelled'
                this.prefixClass = ''
                $('#spelled').html('')
                $('#top-part').addClass('spelling-mode')

                this.client.requestWord(network.WordRequest.SPELLING)
                this.client.requestWord(network.WordRequest.MIDDLE)
            }
        })
    }

    wordsReceived(words, prefix) {
        if (prefix == -1) {
            $('#spelling').trigger('click')
            return
        }

        this.boundedCursor = 0
        this.prefixSize = prefix
        this.words = words.split('\n')
        console.log('Received: ' + this.words.join(';'))
        this.updateDOM()
    }

    updateDOM() {
        $('#words-list').removeClass("list-2 list-3 list-4 list-several list-many")
        if(this.words.length > 4)
            $('#words-list').addClass("list-several list-many")
        else if(this.words.length > 1)
            $('#words-list').addClass("list-several list-" + this.words.length)


        let html = ''
        let focus = 'body'
        for (let i = 0; i < this.words.length; ++i) {
            const word = this.words[i]
            let wordClass = ""
            let isSpelling = 0
            if (i == this.boundedCursor)
                wordClass += "selected-word "

            if(word == '[new]') {
                html +=
                    '<li class="'+ wordClass +' newUserInput">' +
                    '<input type="text" placeholder="Nouvel utilisateur" ' +
                    (i == this.boundedCursor ? '' : 'disabled') + '>' +
                    '</li>'
                if (i == this.boundedCursor)
                    focus = '.newUserInput input'
                continue
            }

            if(word[0] == '[')
            {
                isSpelling = 1
                wordClass += 'spelling '
            }

            html +=
                '<li class="'+ wordClass +'">' +
                    '<span class="' + this.prefixClass + '">' +
                        stringUtil.sliceGraphemeClusters(word.substr(isSpelling), 0, this.prefixSize) +
                    '</span>' +
                    stringUtil.sliceGraphemeClusters(word.substr(isSpelling), this.prefixSize) +
                '</li>'
        }
        $('#words-list').html(html)
        $('.newUserInput input').off('focus')
        $(focus).focus()

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
    else if (key == 32 || key == 13) // space or enter
        return '#validate'
    else if (key == 97) // a
        return '#spelling'
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
