from django.core.management.base import BaseCommand
from registrations.models import BNIMember, Registration

class Command(BaseCommand):
    help = 'Import BNI members from predefined list'

    def handle(self, *args, **options):
        # BNI Chettinad Members
        chettinad_members = [
            {'name': 'ABDUL HAKKIM', 'company': 'QUALIY DOORS & PLYWOODS', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'ANANDHA KRISHNAN', 'company': 'GM INTERLOCK BRICKS', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'ANGEL BALA', 'company': 'RASI AUTO CONSULTING & FINANCE', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'ARAVIND KUMAR B', 'company': 'CHETTINAD NAGAI MAALIGAI', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'ARSATH AYUB', 'company': 'SMART AGENCIES', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'AYYAPPAN ARUNAGIRI', 'company': 'SURIYA JEWELLERY MART', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'EDWIN GODSON', 'company': 'DEVI DIGITAL', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'GANESH KRISHNAN', 'company': 'NARUVIZHI AMBAL MODERN RICE MILL PVT LTD', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'GAUTHAM SHENBAK', 'company': 'M.S.P. PALANISAMY NADAR', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'GOKUL RAV', 'company': 'BPL EVENTS', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'KANNAPPAN VAIRAVAN', 'company': 'ECOWIN BUILDING SOLUTIONS', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'KARTHICK SELVAKUMAR', 'company': 'KURUNJI ELECTRONICS', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'KUMARAN KATHAMUTHU', 'company': 'FUN O FOCUS ENTERPRISES', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'KUMARAPPAN K', 'company': 'UDHAYAM SUPER MARKET', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'LAKSHMI SUBBRAMANIAN', 'company': 'MIRAI DESIGNS', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'MANICKAM K', 'company': 'SRI LAKSHMI WATCH & GIFT SHOP', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'Dr. MANIKANDAN', 'company': "DR. MANI'S MULTISPECIALITY DENTAL CENTER", 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'MANIKANDAN MUTTHIAH', 'company': 'RA AQUA PRODUCT', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'MARUDHUPANDIAN SELVARAJ', 'company': 'CHROMEX', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'MAX K', 'company': 'VP TRADERS', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'MEENAKSHI KUMAR MAGALANATHAN', 'company': 'SUN PRINTERS', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'MOHAMMED FAZIL S', 'company': 'GREEN HARVEST AGRO', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'MUTHU PRAKASH', 'company': 'CCTV', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'MUTHUKUMAR RAMASAMY', 'company': 'U-LAND PROMOTERS', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'MUTHURAMAN LAKSHMANAN', 'company': 'SHRILAKSHMAN ENTERPRISES', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'NITHIYA BALASUBRAMANIAN', 'company': 'MENAKA DIGITAL STUDIO', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'POOBATHI N', 'company': 'SRI KARPAGA VINAYAGAA GRANITES', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'PRATHEEP MANICKAM', 'company': 'CORNER BAKERY & SWEETS', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'RAJA MOHAMMED', 'company': "AL KING'S GLASS WORKS", 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'RAJEEVGANDHI K', 'company': 'HDFC LIFE INSURANCE', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'RAMAIYA PILLAI NLLASAMY', 'company': 'THIRU CHIT FUNDS PVT LTD', 'sponsor_type': 'TITLE_SPONSORS'},
            {'name': 'RAMKUMAR VENKATACHALAM', 'company': 'ESKAY BATTERIES', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'SANDHYA ARUN KUMAR', 'company': 'ANDY MAKEOVER & BRIDAL JEWELRY', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'SELVA KUMAR S', 'company': 'GENESIS WATECH', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'SELVAMANI GANESAN', 'company': '7 STAR CAR CARE', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'SENTHIL KUMAR PANDIAN', 'company': 'OS BUILDING SOLUTIONS', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'SHANTHI MUTHU', 'company': 'SRI KRITHIGA TYRES', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'SHEIK ABDULLA', 'company': 'KARAIKUDI NEWS CHANNEL', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'SURIYA PRABHA', 'company': 'SHADOW ASSOCIATES', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'TAMILARASAN V', 'company': 'GRAND INTERIOR & WALLPAPERS', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'Dr. THIYAGARAJAN BALAKRISHNAN', 'company': 'SUPER SUMO TECH SOLUTION', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'VARUN VIDHYAGAR', 'company': 'MARUTHI JOB CONSULTANCY', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'VELAYUTHAM RAMASAMY', 'company': 'PRIYAA CELLCOM', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'VIJAI SAKKARAVARTHY', 'company': 'CHETTINADU PILLARS', 'sponsor_type': 'BNI_MEMBERS'},
        ]

        # BNI Thalaivas Members
        thalaivas_members = [
            {'name': 'ARUNACHALAM K', 'company': 'ADITTHYA HOSPITAL', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'ASHOK KUMAR B', 'company': 'INFODAZZ', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'SARAVANAN KN', 'company': 'SLP COLOR PRINTS', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'MUTHUKUMAR M', 'company': 'SONA PIPE TRADERS', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'MUTHU PALANI S', 'company': 'SSADS', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'SHAJAHAN N', 'company': 'SR ALUMINUM', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'YOGESH RAJ N', 'company': 'RAJA RAJAN ART WORKS', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'KALAISELVAN P', 'company': 'ARCHITECT2901@GMAIL.COM', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'KARTHIK CHINNAIAH R', 'company': 'NN WINDOWS', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'TAMIL CHELIYAN R', 'company': 'GEE VEE ELECTRICALS', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'HARI PRASATH S', 'company': 'HYDRO WORLD', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'DEVA D', 'company': 'DM ENTERPRISE', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'DHATCHINA MOORTHY K', 'company': 'LAKSHMI MARBLES', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'VISHNU SUBBU S', 'company': 'ACHARI & SONS', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'BALAMURUGAN C', 'company': 'BS ENTERPRISES', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'RAMAIAH V', 'company': 'WBC SOFTWARE LAB', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'SARAVANAN S', 'company': 'OM TRADITIONAL HOSPITAL', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'VIGNESH KUMAR C T A', 'company': 'CT VIN ALAGU THANGA MALIGAI', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'ALAGU LAKSHMI K', 'company': 'FUN O FOCUS ENTERPRISES', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'NAGARAJAN K', 'company': 'KUPPUSAMY CONSTRUCTIONS', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'NITHYA N', 'company': 'THIRU CHIT FUNDS PVT LTD', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'SURESHKUMAR P', 'company': 'DEVAYANAI TRADERS', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'ALPHONSE DEEPAK RAJ S', 'company': 'JD EVENTS', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'BALAMURUGAN S', 'company': 'SBM BATTERY AGENCIES', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'KANNAN S', 'company': 'RAJA SELVAM HI TECH RICE MILL', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'RAJA V', 'company': 'RAJA PAPER STORE', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'JAYA PRIYA S', 'company': 'STUDIO 7 ELEVEN FAMILY SALOON & BRIDAL SALOON', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'CHINNIAH K.R', 'company': 'J TYRES AND ALIGNMENT', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'THIRUNAVUKKARASU N', 'company': 'HALLO MOBILE', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'MAREESWARAN R', 'company': 'G5 PROPERTIES PRIVATE LIMITED', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'VISALAKSHI LAKSHMANAN', 'company': 'MOONSTAR CCTV', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'SEKAR K', 'company': 'ARS INTERIORS', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'KANNAN G', 'company': 'MR. GK CAR ACCESSORIES', 'sponsor_type': 'BNI_MEMBERS'},
            {'name': 'MOHAMED NAZAR S', 'company': 'REGIM DENTAL CARE', 'sponsor_type': 'BNI_MEMBERS'},
        ]

        created_count = 0
        updated_count = 0
        
        # Process Chettinad members
        for member_data in chettinad_members:
            ticket_limit = Registration.get_sponsor_ticket_limit(member_data['sponsor_type'])
            
            member, created = BNIMember.objects.update_or_create(
                name=member_data['name'],
                chapter='BNI_CHETTINAD',
                defaults={
                    'company': member_data['company'],
                    'sponsor_type': member_data['sponsor_type'],
                    'ticket_limit': ticket_limit,
                    'is_active': True
                }
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        # Process Thalaivas members
        for member_data in thalaivas_members:
            ticket_limit = Registration.get_sponsor_ticket_limit(member_data['sponsor_type'])
            
            member, created = BNIMember.objects.update_or_create(
                name=member_data['name'],
                chapter='BNI_THALAIVAS',
                defaults={
                    'company': member_data['company'],
                    'sponsor_type': member_data['sponsor_type'],
                    'ticket_limit': ticket_limit,
                    'is_active': True
                }
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(self.style.SUCCESS(f'Successfully imported members:'))
        self.stdout.write(self.style.SUCCESS(f'  - Created: {created_count}'))
        self.stdout.write(self.style.SUCCESS(f'  - Updated: {updated_count}'))
        self.stdout.write(self.style.SUCCESS(f'  - Total: {created_count + updated_count}'))
