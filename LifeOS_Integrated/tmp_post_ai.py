import json
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

url = 'http://127.0.0.1:5000/api/ai/message'
data = json.dumps({'message':'hello from test'}).encode('utf-8')
req = Request(url, data=data, headers={'Content-Type':'application/json'})
try:
    with urlopen(req, timeout=5) as r:
        resp = r.read().decode('utf-8')
        print('STATUS', r.getcode())
        print(resp)
except HTTPError as e:
    print('HTTP ERROR', e.code, e.read().decode())
except URLError as e:
    print('URL ERROR', e)
except Exception as e:
    print('ERROR', e)
