import urllib.request
import json
try:
    with urllib.request.urlopen('http://localhost:8000/api/destinations?search=mirissa') as response:
        print(response.read().decode())
except Exception as e:
    print(e)
