"""
ID Card Configuration
6cm x 6cm at 300 DPI = 708 x 708 pixels

Layout (no background template - data only):
  TOP:    QR code centered (large)
  BOTTOM: Ticket No, Name, Mobile stacked centered
"""

CARD_WIDTH  = 708
CARD_HEIGHT = 708

# QR code - centered at top
QR_SIZE = 380
QR_X    = (CARD_WIDTH - QR_SIZE) // 2   # 164
QR_Y    = 30

# Text block starts below QR
TEXT_START_Y = QR_Y + QR_SIZE + 25       # 435

TEMPLATE_CONFIG = {
    'qr_code': {
        'x':    QR_X,
        'y':    QR_Y,
        'size': QR_SIZE,
    },
    'ticket_no': {
        'label': {'x': 0, 'y': TEXT_START_Y,      'size': 28, 'color': '#ff6600'},
        'value': {'x': 0, 'y': TEXT_START_Y + 38, 'size': 48, 'color': '#000000'},
    },
    'name': {
        'label': {'x': 0, 'y': TEXT_START_Y + 100, 'size': 28, 'color': '#ff6600'},
        'value': {'x': 0, 'y': TEXT_START_Y + 138, 'size': 40, 'color': '#000000'},
    },
    'mobile': {
        'label': {'x': 0, 'y': TEXT_START_Y + 192, 'size': 28, 'color': '#ff6600'},
        'value': {'x': 0, 'y': TEXT_START_Y + 230, 'size': 40, 'color': '#000000'},
    },
}

# Font paths
FONTS = {
    'title':   '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    'heading': '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    'label':   '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    'value':   '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
}
