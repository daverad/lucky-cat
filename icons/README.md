# Lucky Cat Extension Icons

## Required Icon Sizes

The Chrome extension requires icons in the following sizes:
- `icon16.png` - 16x16 pixels (toolbar icon)
- `icon48.png` - 48x48 pixels (extensions page)
- `icon128.png` - 128x128 pixels (Chrome Web Store)

## Generating Icons

### Option 1: Use the SVG Source

The `icon.svg` file contains the icon design. You can convert it to PNG using:

**Using ImageMagick:**
```bash
convert -background none icon.svg -resize 16x16 icon16.png
convert -background none icon.svg -resize 48x48 icon48.png
convert -background none icon.svg -resize 128x128 icon128.png
```

**Using Inkscape:**
```bash
inkscape icon.svg --export-type=png --export-filename=icon16.png -w 16 -h 16
inkscape icon.svg --export-type=png --export-filename=icon48.png -w 48 -h 48
inkscape icon.svg --export-type=png --export-filename=icon128.png -w 128 -h 128
```

### Option 2: Use an Online Tool

1. Go to https://realfavicongenerator.net or https://cloudconvert.com
2. Upload the `icon.svg` file
3. Download PNG versions at 16x16, 48x48, and 128x128

### Option 3: Use a Design Tool

1. Open `icon.svg` in Figma, Sketch, or Adobe Illustrator
2. Export as PNG at the required sizes

## Icon Design

The icon is a stylized "lucky cat" (maneki-neko) design featuring:
- Purple (#6366F1) background matching RevenueCat's brand color
- White cat face with cute features
- Gold coin on forehead with dollar sign (representing revenue/fortune)
- Pink ear interiors and nose

## Placeholder Icons

If you need to test quickly, create simple colored squares:

```bash
# Create placeholder icons (requires ImageMagick)
convert -size 16x16 xc:#6366F1 icon16.png
convert -size 48x48 xc:#6366F1 icon48.png
convert -size 128x128 xc:#6366F1 icon128.png
```

These will show as solid purple squares until you generate proper icons.
