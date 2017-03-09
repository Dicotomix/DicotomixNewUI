const electron = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

const path = require('path')
const url = require('url')

let mainWindow

function createWindow() {
    mainWindow = new BrowserWindow({ width: 800, height: 600 })

    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }))

    mainWindow.on('closed', function () {
        mainWindow = null
    })
}

app.on('ready', createWindow)

app.on('window-all-closed', function () {
    app.quit()
})
