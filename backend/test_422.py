import requests
r = requests.post("http://localhost:8000/services", json={
    "service_type": "gps_installation",
    "title": "Test service titulo largo",
    "description": "Test description",
    "service_address": "Calle 50 #45-30, El Poblado",
    "service_city": "Medellin",
    "service_lat": 6.2442,
    "service_lon": -75.5636
}, headers={"Authorization": "Bearer fake"})
print("STATUS:", r.status_code)
print("BODY:", r.text)
