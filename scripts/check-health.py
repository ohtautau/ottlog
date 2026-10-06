import sys
import urllib.request

origin = sys.argv[1].rstrip('/') if len(sys.argv) > 1 else 'https://ohtautau.com'
failed = False
for route in ['/', '/health/ready', '/api/posts', '/feed.xml']:
    try:
        with urllib.request.urlopen(origin + route, timeout=15) as response:
            if response.status != 200: raise RuntimeError(response.status)
            print('OK', route)
    except Exception as error:
        failed = True
        print('FAIL', route, type(error).__name__)
sys.exit(1 if failed else 0)
