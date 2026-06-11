import os
import base64
from PIL import Image

def trim_image(img):
    bbox = img.getbbox()
    if bbox:
        return img.crop(bbox)
    return img

def make_canvas(img, target_w, target_h, pad_percent=0.1):
    # calculate scale to fit target_w, target_h with optional padding
    img_w, img_h = img.size
    max_w = target_w * (1 - pad_percent)
    max_h = target_h * (1 - pad_percent)
    scale = min(max_w / img_w, max_h / img_h)
    new_w = int(img_w * scale)
    new_h = int(img_h * scale)
    resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    # create new canvas
    canvas = Image.new('RGBA', (target_w, target_h), (0, 0, 0, 0))
    # paste centered
    offset_x = (target_w - new_w) // 2
    offset_y = (target_h - new_h) // 2
    canvas.paste(resized, (offset_x, offset_y), resized)
    return canvas

def convert_to_svg(png_path, svg_path):
    with open(png_path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
    svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" width="512" height="512">
  <image width="512" height="512" xlink:href="data:image/png;base64,{encoded_string}"/>
</svg>"""
    with open(svg_path, "w") as f:
        f.write(svg_content)
    print(f"Generated SVG {svg_path}")

def main():
    assets_dir = '/Users/jitkumarsaha/Dynime Inc/dynime.com/src/assets'
    public_dir = '/Users/jitkumarsaha/Dynime Inc/dynime.com/public'
    
    # Source paths
    src_light_icon = '/Users/jitkumarsaha/.gemini/antigravity/brain/1246e4eb-7fd0-4c0b-a60f-57df39f44a32/media__1781175192080.png'
    src_dark_icon = '/Users/jitkumarsaha/.gemini/antigravity/brain/1246e4eb-7fd0-4c0b-a60f-57df39f44a32/media__1781175192102.png'
    src_light_logo = '/Users/jitkumarsaha/.gemini/antigravity/brain/1246e4eb-7fd0-4c0b-a60f-57df39f44a32/media__1781175220631.png'
    src_dark_logo = '/Users/jitkumarsaha/.gemini/antigravity/brain/1246e4eb-7fd0-4c0b-a60f-57df39f44a32/scratch/dynime-logo-dark.png'
    
    # Temp outputs
    temp_light_png = '/Users/jitkumarsaha/.gemini/antigravity/brain/1246e4eb-7fd0-4c0b-a60f-57df39f44a32/scratch/temp_light_icon_512.png'
    temp_dark_png = '/Users/jitkumarsaha/.gemini/antigravity/brain/1246e4eb-7fd0-4c0b-a60f-57df39f44a32/scratch/temp_dark_icon_512.png'
    
    # 1. Process Light Icon
    img_light = Image.open(src_light_icon)
    trimmed_light = trim_image(img_light)
    
    # Save light icon sizes
    make_canvas(trimmed_light, 128, 128, pad_percent=0.0).save(os.path.join(assets_dir, 'dynime-icon.webp'), 'WEBP')
    make_canvas(trimmed_light, 180, 180, pad_percent=0.0).save(os.path.join(public_dir, 'apple-touch-icon.png'), 'PNG')
    
    # Save favicons (we want no padding for standard favicons to maximize visual area)
    fav_512 = make_canvas(trimmed_light, 512, 512, pad_percent=0.0)
    fav_512.save(os.path.join(public_dir, 'favicon.png'), 'PNG')
    fav_512.save(temp_light_png, 'PNG')
    
    make_canvas(trimmed_light, 32, 32, pad_percent=0.0).save(os.path.join(public_dir, 'favicon-32.png'), 'PNG')
    make_canvas(trimmed_light, 16, 16, pad_percent=0.0).save(os.path.join(public_dir, 'favicon-16.png'), 'PNG')
    
    # Convert light icon to SVG
    convert_to_svg(temp_light_png, os.path.join(assets_dir, 'dynime-icon-light.svg'))
    convert_to_svg(temp_light_png, os.path.join(public_dir, 'dynime-icon-light.svg'))
    
    # 2. Process Dark Icon
    img_dark = Image.open(src_dark_icon)
    trimmed_dark = trim_image(img_dark)
    
    # Save dark favicons
    fav_dark_512 = make_canvas(trimmed_dark, 512, 512, pad_percent=0.0)
    fav_dark_512.save(temp_dark_png, 'PNG')
    
    make_canvas(trimmed_dark, 32, 32, pad_percent=0.0).save(os.path.join(public_dir, 'favicon-dark-32.png'), 'PNG')
    make_canvas(trimmed_dark, 16, 16, pad_percent=0.0).save(os.path.join(public_dir, 'favicon-dark-16.png'), 'PNG')
    
    # Convert dark icon to SVG
    convert_to_svg(temp_dark_png, os.path.join(assets_dir, 'dynime-icon-dark.svg'))
    convert_to_svg(temp_dark_png, os.path.join(public_dir, 'dynime-icon-dark.svg'))
    
    # 3. Process Light Logo Text (500x180 canvas, with ~10% padding to match original)
    img_logo_light = Image.open(src_light_logo)
    trimmed_logo_light = trim_image(img_logo_light)
    make_canvas(trimmed_logo_light, 500, 180, pad_percent=0.15).save(os.path.join(assets_dir, 'dynime-logo-light.webp'), 'WEBP')
    
    # 4. Process Dark Logo Text
    img_logo_dark = Image.open(src_dark_logo)
    trimmed_logo_dark = trim_image(img_logo_dark)
    make_canvas(trimmed_logo_dark, 500, 180, pad_percent=0.15).save(os.path.join(assets_dir, 'dynime-logo-dark.webp'), 'WEBP')
    
    print("All assets processed and successfully written to project!")

if __name__ == '__main__':
    main()
