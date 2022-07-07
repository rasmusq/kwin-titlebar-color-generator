# kwin-titlebar-color-generator
Uses scrot and xprop to generate a color-scheme from a screenshot and apply it as a titlebar color-scheme in the form of a KWin window rule

## Dependencies

Must use KWin window manager ('kwin_x11')

Arch Linux:
```
sudo pacman -S scrot xprop nodejs npm
```

## Installation

Run:
```
npm install
```

## Usage

Run:
```
sudo node genTitleColorsScrot.js
```
Write sudo password to give permission to save screenshot
Select window to apply titlebar color window rule
Drag area to take screenshot from

The center pixel from this area will be the color of the titlebar

## Future work

1: Remove need to type password
2: Make a list of all colors in screenshot for the user to choose from
3: Clean up code (it is a mess)