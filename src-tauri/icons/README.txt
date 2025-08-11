Place platform icons here:
- icon.png (1024x1024 PNG used for Mac/Linux and as base)
- icon.ico (Windows ICO, multi-size 16/32/48/256)

You can generate icon.ico from icon.png with ImageMagick:
  magick convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico

Or use Tauri icon tool:
  cargo install tauri-cli
  tauri icon icon.png
This will create all platform icons including .ico in this folder.
