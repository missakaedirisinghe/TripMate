import os
import requests
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("OPENWEATHERMAP_API_KEY")

query = "mirissa, Sri Lanka"
url = "https://api.openweathermap.org/data/2.5/forecast"
params = {
    "q": query,
    "appid": api_key,
    "units": "metric",
    "cnt": 40,
}
resp = requests.get(url, params=params)
print(resp.status_code)
print(resp.text[:500])
