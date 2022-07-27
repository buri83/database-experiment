from flask import Flask
import signal

def handler(signum, frame):
    print(f"signal {signum} received!")
    exit(0)
    
signal.signal(signal.SIGTERM, handler)

app = Flask(__name__)

@app.route("/")
def hello_world():
    return "Hello, World!"

app.run(host="0.0.0.0")
