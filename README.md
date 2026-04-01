# Epson TM-T88V Emulator

*Note: This package is not production-ready*

A software implementation of a certain thermal receipt printer. Consumes raw bytes (ESC/POS) and renders to an HTML canvas.

## Tests

To add a new test:

1. Create a new directory in `test/data`. Give the directory a name that describes the test.
1. Come up with some ESC/POS that demonstrates a specific feature of the receipt printer. Put that in `in.txt` as hexadecimal.
1. This is not strictly necessary for the test to work, but in case of improvements to the text data pipeline, put the original scanned image of the receipt in the directory (e.g. `scan.jpg`.
1. Use [deskew-text](https://github.com/aycyang/deskew-text) to generate `ref.png` from `scan.jpg`. It should have straightened and thresholded (made pure black-and-white) `scan.jpg`.
1. Now when you run `npm test`, it should detect the new directory you created and generate `diff.png`, which you can then visually inspect for differences between the emulator output and the real-life output.
