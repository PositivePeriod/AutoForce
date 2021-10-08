// 0 ~ 8
var r = ["641220", "6e1423", "85182a", "a11d33", "a71e34", "bd1f36", "c71f37", "da1e37", "e01e37"];
var g = ["081c15", "1b4332", "2d6a4f", "40916c", "52b788", "74c69d", "95d5b2", "b7e4c7", "d8f3dc"];
var b = ["012a4a", "013a63", "014f86", "2a6f97", "2c7da0", "468faf", "61a5c2", "89c2d9", "a9d6e5"];
var n = 'dad7cd';

// https://leonardocolor.io/?colorKeys=%23ff2600&base=ffffff&ratios=2%2C3.19%2C4.60%2C6.53%2C10&mode=HSL
// https://leonardocolor.io/?colorKeys=%230062ff&base=ffffff&ratios=2%2C3.17%2C4.59%2C6.52%2C10&mode=HSL
var newR = ["ff9d8c", "ff5436", "e52200", "b81b00", "851400"];
var newB = ["8db9ff", "488eff", "0f6bff", "0053d7", "003b9b"];

const Color = new Map([
    ['noNeed-A', newR[0]],
    ['need-A', newR[1]],
    ['choice-A', newR[2]],
    ['focus-A', newR[3]],

    ['noNeed-B', newB[0]],
    ['need-B', newB[1]],
    ['choice-B', newB[2]],
    ['focus-B', newB[3]],

    ['noNeed-null', n],
    ['need-null', n],
    ['choice-null', n],
    ['focus-null', n],
]);

export function setColor(element, colorName) {
    element.className = colorName;
    element.style.background = '#' + Color.get(colorName);
    // element.style.background = '#000000';
}
