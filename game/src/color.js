var floor = '383838';
var gray = "888888";
var newR = ["6A040F", "9D0208", "DC2F02", "E85D04"];
var newB = ["03045E", "023E8A", "0077B6", "00B4D8"];
var Color = new Map([
    ['noNeed-A', gray],
    ['light-A', newR[0]],
    ['need-A', newR[1]],
    ['choice-A', newR[2]],
    ['focus-A', newR[3]],

    ['noNeed-B', gray],
    ['light-B', newB[0]],
    ['need-B', newB[1]],
    ['choice-B', newB[2]],
    ['focus-B', newB[3]],
]);

export function setColor(element, colorName) {
    element.className = colorName;
    element.style.background = '#' + (Color.has(colorName) ? Color.get(colorName) : floor);
}
