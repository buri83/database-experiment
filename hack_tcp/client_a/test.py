import requests
import time

url = "http://web:3000/messages/"

count = 0

while True:
    requests.post(url, data={"message": f"Hello, My count is {count}"})
    count += 1
    time.sleep(10)