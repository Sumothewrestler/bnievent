from PIL import Image, ImageDraw, ImageFont
import qrcode
import io
import os
from django.conf import settings
from .id_card_config import TEMPLATE_CONFIG, FONTS, CARD_WIDTH, CARD_HEIGHT


def generate_id_card(registration):
    """
    Generate ID card: 6cm x 6cm at 300 DPI = 708x708 px
    Plain white background, data only:
      - Large QR code centered at top
      - Ticket No, Name, Mobile centered below
    """
    img = Image.new('RGB', (CARD_WIDTH, CARD_HEIGHT), color='white')
    draw = ImageDraw.Draw(img)

    # Load fonts
    try:
        label_font_lg = ImageFont.truetype(FONTS['label'], 28)
        value_font_xl = ImageFont.truetype(FONTS['value'], 48)
        value_font_lg = ImageFont.truetype(FONTS['value'], 40)
    except Exception:
        label_font_lg = ImageFont.load_default()
        value_font_xl = ImageFont.load_default()
        value_font_lg = ImageFont.load_default()

    # --- QR Code (centered, top) ---
    qr = qrcode.QRCode(version=1, box_size=10, border=2)
    qr_url = f"https://bnichettinad.cloud/qr/{registration.ticket_no}"
    qr.add_data(qr_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white").convert('RGB')

    qr_size = TEMPLATE_CONFIG['qr_code']['size']
    qr_img  = qr_img.resize((qr_size, qr_size), Image.LANCZOS)
    qr_x    = TEMPLATE_CONFIG['qr_code']['x']
    qr_y    = TEMPLATE_CONFIG['qr_code']['y']
    img.paste(qr_img, (qr_x, qr_y))

    # Helper: draw a centered label + value pair
    def draw_centered(label, value, label_y, value_y, label_font, value_font, label_color, value_color):
        # Label
        lb = draw.textbbox((0, 0), label, font=label_font)
        lw = lb[2] - lb[0]
        draw.text(((CARD_WIDTH - lw) // 2, label_y), label, fill=label_color, font=label_font)
        # Value
        vb = draw.textbbox((0, 0), value, font=value_font)
        vw = vb[2] - vb[0]
        # If value too wide, shrink font
        if vw > CARD_WIDTH - 40:
            try:
                small_font = ImageFont.truetype(FONTS['value'], 32)
            except Exception:
                small_font = value_font
            vb = draw.textbbox((0, 0), value, font=small_font)
            vw = vb[2] - vb[0]
            draw.text(((CARD_WIDTH - vw) // 2, value_y), value, fill=value_color, font=small_font)
        else:
            draw.text(((CARD_WIDTH - vw) // 2, value_y), value, fill=value_color, font=value_font)

    cfg = TEMPLATE_CONFIG

    # --- Ticket No ---
    draw_centered(
        "Ticket No", registration.ticket_no,
        cfg['ticket_no']['label']['y'], cfg['ticket_no']['value']['y'],
        label_font_lg, value_font_xl,
        cfg['ticket_no']['label']['color'], cfg['ticket_no']['value']['color'],
    )

    # --- Name ---
    name_text = registration.name[:28] if len(registration.name) > 28 else registration.name
    draw_centered(
        "Name", name_text,
        cfg['name']['label']['y'], cfg['name']['value']['y'],
        label_font_lg, value_font_lg,
        cfg['name']['label']['color'], cfg['name']['value']['color'],
    )

    # --- Mobile ---
    draw_centered(
        "Mobile", registration.mobile_number or '',
        cfg['mobile']['label']['y'], cfg['mobile']['value']['y'],
        label_font_lg, value_font_lg,
        cfg['mobile']['label']['color'], cfg['mobile']['value']['color'],
    )

    # Save at 300 DPI
    buffer = io.BytesIO()
    img.save(buffer, format='PNG', dpi=(300, 300))
    buffer.seek(0)
    return buffer


def save_id_card(registration):
    """
    Generate and save ID card to media folder.
    Returns: relative path to the saved image
    """
    buffer = generate_id_card(registration)

    id_cards_dir = os.path.join(settings.MEDIA_ROOT, 'id_cards')
    os.makedirs(id_cards_dir, exist_ok=True)

    filename = f"id_card_{registration.ticket_no}.png"
    filepath = os.path.join(id_cards_dir, filename)

    with open(filepath, 'wb') as f:
        f.write(buffer.read())

    return f"media/id_cards/{filename}"
