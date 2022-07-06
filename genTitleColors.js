 
var exec = require('child_process').exec;
const RED_COLORCODE_OFFSET = -1;
const GREEN_COLORCODE_OFFSET = -2;
const BLUE_COLORCODE_OFFSET = -3;

exec(`xprop`, (error, stdout, stderr) => {
    let startString = "Icon (64 x 64):";
    let endString = "Icon (128 x 128):";
    let colors = [];
    icon = stdout.substring(stdout.indexOf(startString) + startString.length, stdout.indexOf(endString));
    for(let i = 0; i < icon.length; i++) {
        let startIndicator = "[38;2;";
        let endIndicator = "m";
        let startIndex = icon.indexOf(startIndicator, i);
        let endIndex = icon.indexOf(endIndicator, startIndex);
        let value = icon.substring(startIndex, endIndex);
        i += value.length;

        let colorCode = value.split(";");

        let red = Number(colorCode[colorCode.length + RED_COLORCODE_OFFSET]);
        let green = Number(colorCode[colorCode.length + GREEN_COLORCODE_OFFSET]);
        let blue = Number(colorCode[colorCode.length + BLUE_COLORCODE_OFFSET]);
        let hsv = rgb2hsv(red, green, blue);
        let rgb = [red, green, blue];
        if(red != 0 && green != 0 && blue != 0) {
            colors.push(hsv.concat(rgb));
        }
    }
    colors.sort(compareHueFromHSV);
    printHueDistribution(1, colors);
});

function printHueDistribution(granularity, colors) {
    const hueMax = 360;
    let distribution = [];
    let radius = granularity / 2;
    let i = 0;
    let colorIndex = 0;
    let highestCount = 0;
    for(let i = radius; i <= hueMax; i += granularity) {
        let count = 0;

        while(colorIndex < colors.length &&
            colors[colorIndex][0] >= i - radius && 
            colors[colorIndex][0] <= i + radius) {
            count++;
            colorIndex++;
        }
        if(count > highestCount) {
            highestCount = count;
        }
        distribution.push(count);
    }
    const loadingBar = "#".repeat(100);
    for(let i = 0; i <= distribution.length; i++) {
        let rgb = hsv2rgb(i, 1, 1);
        console.log(`\x1b[38;2;${Math.round(rgb[0])};${Math.round(rgb[1])};${Math.round(rgb[2])}m`, loadingBar.substring(0, loadingBar.length * (distribution[i] / highestCount)));
    }
}

function compareHueFromHSV(hsv1, hsv2) {
    return (hsv1[0] - hsv2[0]);
}

function rgb2hsv(r,g,b) {
    let v=Math.max(r,g,b), c=v-Math.min(r,g,b);
    let h= c && ((v==r) ? (g-b)/c : ((v==g) ? 2+(b-r)/c : 4+(r-g)/c)); 
    return [60*(h<0?h+6:h), v&&c/v, v];
}
function hsv2rgb(h,s,v) {                              
  let f= (n,k=(n+h/60)%6) => v - v*s*Math.max( Math.min(k,4-k,1), 0);     
  return [f(5)*255,f(3)*255,f(1)*255];       
}   