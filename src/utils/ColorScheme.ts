
const {
    red, green, blue, yellow, white,
    bgRed, bgGreen, bgBlue, bgYellow, bgWhite,
    redBright, greenBright, blueBright, yellowBright, whiteBright
} = require('console-log-colors')

export const theme = {
    info: blue,
    success: green,
    warning: yellow,
    error: red,
    debug: white,
    infoBright: blueBright,
    successBright: greenBright,
    warningBright: yellowBright,
    errorBright: redBright,
    debugBright: whiteBright,
    bgInfo: bgBlue,
    bgSuccess: bgGreen,
    bgWarning: bgYellow,
    bgError: bgRed,
    bgDebug: bgWhite,
};