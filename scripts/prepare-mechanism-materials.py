"""Extract registered layers from the original 1536 × 1024 ProgressKit mechanism."""
from math import atan2, degrees, hypot
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / 'assets' / 'brand'
SOURCE = ROOT / 'design-previews' / 'original-machines' / 'sources' / 'mechanism.png'


def circle(radius, feather):
    alpha = Image.new('L', (888, 888))
    ImageDraw.Draw(alpha).ellipse((444-radius, 444-radius, 444+radius, 444+radius), fill=255)
    return alpha.filter(ImageFilter.GaussianBlur(feather))


def save_mask(alpha, filename):
    mask = Image.new('RGBA', alpha.size, 'white')
    mask.putalpha(alpha)
    mask.save(TARGET / filename, lossless=True, method=6)


def opening_layers(rotor):
    # The boundaries follow the sweep of the photographed leaves from the
    # bearing to the lens. Each source pixel belongs to exactly one leaf.
    def sector(x, y):
        radius = hypot(x, y)
        t = max(0, min(1, (radius - 278) / 156))
        leading_edge = -31 - 57 * (t ** .72)
        return int(((degrees(atan2(y, x)) - leading_edge) % 360) // 60)

    housing_mask = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1536 1024" '
                    'preserveAspectRatio="none"><path fill="white" fill-rule="evenodd" '
                    'd="M0 0H1536V1024H0z M1198 476a433 433 0 1 0-866 0a433 433 0 1 0 866 0z"/></svg>\n')
    (TARGET / 'iris-bearing-mask.svg').write_text(housing_mask, encoding='utf-8')
    sectors = Image.frombytes('L', rotor.size, bytes(
        sector(x - 444, y - 444) for y in range(888) for x in range(888)))
    annulus = ImageChops.subtract(circle(434, 1), circle(278, .7))
    for index in range(6):
        mask = sectors.point([255 if i == index else 0 for i in range(256)])
        leaf = rotor.convert('RGBA')
        leaf.putalpha(ImageChops.multiply(annulus, mask))
        leaf.save(TARGET / f'iris-leaf-{index+1}.webp', quality=93, method=6)
    # Original reflection and fine surface texture of the black optical glass.
    glass = rotor.crop((166,166,722,722)).resize((424,424), Image.Resampling.LANCZOS)
    glass.save(TARGET / 'iris-glass.webp', quality=90, method=6)


def main():
    image = Image.open(SOURCE).convert('RGB')
    if image.size != (1536, 1024):
        raise ValueError('Expected the original mechanical artwork with its registered coordinates')
    # The fixed bearing is centred at (765, 476). The same crop registers all moving pieces.
    rotor = image.crop((321, 32, 1209, 920))
    opening_layers(rotor)
    annulus = ImageChops.subtract(circle(432, 1.6), circle(304, 1.4))
    moving = rotor.convert('RGBA')
    moving.putalpha(annulus)
    moving.save(TARGET / 'mechanism-rotor.webp', quality=93, method=6)

    red, green, blue = rotor.split()
    emission = ImageChops.subtract(red, ImageChops.lighter(green, blue))
    emission = emission.point(lambda x: min(255, max(0, (x - 17) * 4)))
    ports = ImageChops.multiply(emission, annulus).resize((444,444), Image.Resampling.LANCZOS)
    save_mask(ports, 'mechanism-ports.webp')

    # Specular light follows neutral bright alloy, excluding the moving shutter and dark lens.
    plate = image.resize((768, 512), Image.Resampling.LANCZOS)
    red, green, _ = plate.split()
    greys = ImageOps.grayscale(plate).point(lambda x: min(255, max(0, 2 * (x - 24))))
    red_light = ImageChops.subtract(red, green).point(lambda x: min(255, 4 * x))
    metal = ImageChops.subtract(greys, red_light)
    ImageDraw.Draw(metal).ellipse((167, 22, 598, 454), fill=0)
    save_mask(metal, 'mechanism-specular.webp')

    # A seamless tile of actual machining marks from the left aluminium shoulder.
    grain = ImageOps.grayscale(image.crop((324, 202, 383, 222)))
    tile = Image.new('L', (118,40))
    tile.paste(grain); tile.paste(ImageOps.mirror(grain), (59,0))
    tile.paste(ImageOps.flip(tile.crop((0, 0, 118, 20))), (0,20))
    tile = ImageOps.autocontrast(tile).point(lambda x: round(2 + x * .071))
    save_mask(tile, 'alloy-grain.webp')


if __name__ == '__main__':
    main()
