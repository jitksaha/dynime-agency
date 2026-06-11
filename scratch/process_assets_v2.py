import os
import base64
from PIL import Image

def trim_image(img):
    bbox = img.getbbox()
    if bbox:
        return img.crop(bbox)
    return img

def make_canvas(img, target_w, target_h, pad_percent=0.0):
    img_w, img_h = img.size
    max_w = target_w * (1 - pad_percent)
    max_h = target_h * (1 - pad_percent)
    scale = min(max_w / img_w, max_h / img_h)
    new_w = int(img_w * scale)
    new_h = int(img_h * scale)
    resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    canvas = Image.new('RGBA', (target_w, target_h), (0, 0, 0, 0))
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
    
    src_dark_icon = '/Users/jitkumarsaha/.gemini/antigravity/brain/1246e4eb-7fd0-4c0b-a60f-57df39f44a32/scratch/new_dark_icon.png'
    temp_dark_png = '/Users/jitkumarsaha/.gemini/antigravity/brain/1246e4eb-7fd0-4c0b-a60f-57df39f44a32/scratch/temp_dark_icon_512_v2.png'
    
    img_dark = Image.open(src_dark_icon)
    trimmed_dark = trim_image(img_dark)
    
    fav_dark_512 = make_canvas(trimmed_dark, 512, 512, pad_percent=0.0)
    fav_dark_512.save(temp_dark_png, 'PNG')
    
    make_canvas(trimmed_dark, 32, 32, pad_percent=0.0).save(os.path.join(public_dir, 'favicon-dark-32.png'), 'PNG')
    make_canvas(trimmed_dark, 16, 16, pad_percent=0.0).save(os.path.join(public_dir, 'favicon-dark-16.png'), 'PNG')
    
    convert_to_svg(temp_dark_png, os.path.join(assets_dir, 'dynime-icon-dark.svg'))
    convert_to_svg(temp_dark_png, os.path.join(public_dir, 'dynime-icon-dark.svg'))
    
    print("Dark mode icon assets updated successfully!")

if __name__ == '__main__':
    main()
