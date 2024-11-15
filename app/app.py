from flask import Flask, render_template
from flask_assets import Environment, Bundle
from config import Config

app = Flask(__name__)
app.config.from_object(Config)
assets = Environment(app)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/success')
def success():
    return render_template('success.html')

if __name__ == '__main__':
    app.run(debug=True) 