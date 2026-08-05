import os
from flask import Flask

if os.name == "nt":
    os.add_dll_directory(r"C:\Program Files\PostgreSQL\18\bin")

import cloudinary
from flask_cors import CORS

from config import Config
from extensions import db, migrate, jwt
from api.v1 import blueprints


app = Flask(__name__)

app.config.from_object(Config)

cloudinary.config(cloudinary_url=app.config["CLOUDINARY_URL"])

# Default dev origins, plus anything set via CORS_ORIGINS (comma-separated) in production
DEFAULT_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]
CORS(app, resources={r"/api/*": {"origins": DEFAULT_ORIGINS + app.config["CORS_ORIGINS"]}}, supports_credentials=True)

db.init_app(app)
migrate.init_app(app, db)
jwt.init_app(app)

for bp, prefix in blueprints:
    app.register_blueprint(bp, url_prefix=f"/api/v1{prefix}")


@app.route("/")
def home():
    return {
        "message": "HRMS API Running"
    }


if __name__ == "__main__":
    app.run(debug=True)