const fs = require('fs');
const path = require('path');
const os = require('os');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const getPixels = require('get-pixels');
const { count } = require('console');

let printDebug = (message, ...optionalParams) => {console.log(message, ...optionalParams);};
let print = (message, ...optionalParams) => {console.log(message, ...optionalParams);};

async function main() {
    print("Choose the window on which the titlebar color should be applied");
    let windowClass = await getWindowAttribute("WM_CLASS");
    let imageSavePath = await generateImagePath(windowClass.join("_").replace(/ /g, ""));
    print("Take a screenshot of the area to derrive the titlebar color from");
    print("The screenshot will be temporarily saved in this directory: ", imageSavePath);
    let screenshotResult = await takeScreenshot(imageSavePath);
    createColorSchemeFromImage(imageSavePath, windowClass[windowClass.length-1]);
}

async function getWindowAttribute(attributeName) {
    const { error, stdout, stderr } = await exec(`xprop`);
    let windowAttribute = getValueFromWindowAttributes(attributeName, stdout).replace(/"/g, ``).split(`, `);
    print(`Window Attribute (${attributeName}): `, windowAttribute);
    return windowAttribute;
}

async function takeScreenshot(path) {
    const { error, stdout, stderr } = await exec(`scrot -s -F ${path}`);
    return stdout;
}
function createColorSchemeFromImage(path, name) {
    getPixels(path, (err, pixels) => {
        if(err) {
            printDebug("Bad image path: ", err);
            return;
        }

        let width = pixels.shape[0];
        let height = pixels.shape[1];
        if(width < 2 || height < 2) {
            print("Selection too small to determine color. Terminating...");
        } else {
            const x = Math.round(width/4)*2;
            const y = Math.round(height/4)*2;
            const r = pixels.get(x, y, 0);
            const g = pixels.get(x, y, 1);
            const b = pixels.get(x, y, 2);
            color = [r, g, b];
            printDebug("Derrived Color: ", color);
            createColorScheme(color, name);
        }
        fs.unlink(path, (err) => {
            if(err) {
                print("There was an error deleting the screenshot: ", err);
            } else {
                print("Screenshot has been deleted!");
            }
        });
    });
}

async function locateColorSchemeFolder() {
    const { error, stdout, stderr } = await exec(`locate color-schemes`);
    const dirArray = stdout.split("\n");
    print("Located color scheme folder: " , dirArray[0]);
    return dirArray[0];
}
async function createColorScheme(color, name) {
    locateColorSchemeFolder().then((dir) => {
        const path = dir + "/" + name + ".colors";
        print("Path of colorscheme: ", path);
        textColor = [255, 255, 255];
        if(color.reduce((a, b) => {a+b}, 0)/3 > 255/2) {
            textColor[0] = 0;
            textColor[1] = 0;
            textColor[2] = 0;
        }
        const data = `[General]` + `\n` +
                        `Name=${name}` + `\n` +
                        `ColorScheme=${name}` + `\n` +
                        `` + `\n` +
                        `[WM]` + `\n` +
                        `activeBackground=${color[0]},${color[1]},${color[2]}` + `\n` +
                        `inactiveBackground=${color[0]},${color[1]},${color[2]}` + `\n` +
                        `activeForeground=${textColor[0]},${textColor[1]},${textColor[2]}` + `\n`;
        fs.writeFileSync(path, data);
        print("Theme has been created!");

        applyWindowRule(name);
    });
}
async function locateWindowRuleFile() {
    const { error, stdout, stderr } = await exec(`locate kwinrulesrc`);
    const dirArray = stdout.split("\n");
    print("Located window rule folder: " , dirArray[0]);
    return dirArray[0];
}
async function applyWindowRule(name) {
    locateWindowRuleFile().then((path) => {
        let data = fs.readFileSync(path, {encoding:'utf8'});

        if(data.indexOf(name) === -1) {
            print("Creating a new window rule for the window type.");
        } else {
            print("NOTE: There was already a window rule for this window type, only the color-scheme was created. Manually check window rules, if the new color-scheme does not show up.");
            reloadKWin();
            return;
        }

        let generalStartString = "[General]";
        let generalStartIndex = data.indexOf(generalStartString);
        if(generalStartIndex < 0) {
            let appendGeneralData = "\n\n[General]\n" + 
                                        "count=0\n" + 
                                        "rules=\n\n";
            data += appendGeneralData;
            printDebug("Fixed missing [General] entry");
        }
        let countStartString = "count=";
        let countStartIndex = data.indexOf(countStartString, generalStartIndex);
        let countEndIndex = data.indexOf("\n", countStartIndex);
        let countValue = Number(data.substring(countStartIndex+countStartString.length, countEndIndex));
        printDebug("Count Value: ", countValue);
        let countString = data.substring(countStartIndex, countEndIndex);
        printDebug("Count String: ", countString);
        let newCountValue = countValue+1;
        printDebug("New Count Value: ", newCountValue);
        let newCountString = countStartString + newCountValue;
        printDebug("New Count String: ", newCountString);
        data = data.replace(countString, newCountString);

        let id = countValue+1;
        let appendData = `\n` + `[${id}]` + `\n` +
        `Description=Titlebar color for ${name}` + `\n` +
        `decocolor=${name}` + `\n` +
        `decocolorrule=2` + `\n` +
        `wmclass=${name}` + `\n` +
        `wmclassmatch=1` + `\n`;
        data += appendData;

        let rulesStartString = "rules=";
        let rulesStartIndex = data.indexOf(rulesStartString, generalStartIndex);
        let rulesEndIndex = data.indexOf("\n", rulesStartIndex);
        let rulesValues = data.substring(rulesStartIndex+rulesStartString.length, rulesEndIndex).split(",");
        printDebug("Rules Values: ", rulesValues);
        let rulesString = data.substring(rulesStartIndex, rulesEndIndex);
        printDebug("Rules String: ", rulesString);
        let newRulesValues = [...rulesValues, id].filter((rule) => {return rule !== ''});
        printDebug("New Rules Values: ", newRulesValues);
        let newRulesString = rulesStartString + newRulesValues.join(",");
        printDebug("New Rules String: ", newRulesString);
        //let newRulesString = rules + (ruleValues[0] === "" ? "" : ",") + id;
        data = data.replace(rulesString, newRulesString);

        fs.writeFileSync(path, data);
        print("Window Rule has been applied!");
        reloadKWin();
    });
}

async function reloadKWin() {
    print(`Reload KWin with the command "kwin_x11 --replace", "kwin --replace" or "kwin_wayland --replace"`);
    print(`I don't know how to automate this as super user...`);
    /*try {
        await exec(`DISPLAY=:0 kwin_x11 --replace`);
    } catch(e) {
        printDebug("There was an error reloading KWin: ", e);
    }*/
}

async function generateImagePath(namePrefix) {
    const dir = "/tmp/titlebarColorScreenshots/";
    if(!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    const imageId = namePrefix + "_" + generateRandomInteger();
    const path = dir.concat(imageId) + ".png";
    return path;
}

function getValueFromWindowAttributes(valueName, windowAttributes) {
    let startString = valueName;
    let endString = "\n";
    let nameEndIndex = windowAttributes.indexOf(startString) + startString.length;
    let startIndex = windowAttributes.indexOf(" = ", nameEndIndex) + 3;
    let endIndex = windowAttributes.indexOf(endString, startIndex);
    return windowAttributes.substring(startIndex, endIndex);
}

function generateRandomInteger() {
    return Math.floor(Math.random() * 10**15);
}

main();