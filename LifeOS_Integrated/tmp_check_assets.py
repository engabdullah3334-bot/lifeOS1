import urllib.request
import sys

urls = [
    'http://127.0.0.1:5000/',
    'http://127.0.0.1:5000/static/js/main.js',
    'http://127.0.0.1:5000/static/js/modules/ai.js',
    'http://127.0.0.1:5000/static/css/modules/ai.css'
]

for u in urls:
    try:
        with urllib.request.urlopen(u, timeout=5) as r:
            status = r.getcode()
            print(f'URL: {u} -> {status}')
            data = r.read().decode('utf-8', errors='replace')
            lines = data.splitlines()
            print('--- First 10 lines ---')
            for L in lines[:10]:
                print(L)
            print('\n')
    except Exception as e:
        print(f'URL: {u} -> ERROR: {e}\n')
