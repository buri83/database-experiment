import requests
import time

url = "http://web:3000/messages/"

for count in range(5):
    requests.post(url, data={"message": f"Hello, My count is {count}"})
    time.sleep(10)