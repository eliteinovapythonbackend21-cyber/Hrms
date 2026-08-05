"""WSGI entry point for the HRMS backend API.

This module exposes the Flask application as a WSGI callable so it can be
served by production WSGI servers such as Gunicorn, Waitress, or uWSGI.

Usage examples:
    # Gunicorn (Linux/macOS)
    gunicorn --bind 0.0.0.0:5000 wsgi:application

    # Waitress (Windows production)
    waitress-serve --host 0.0.0.0 --port 5000 wsgi:application

    # Gunicorn with multiple workers
    gunicorn --workers 3 --bind 0.0.0.0:5000 wsgi:application
"""

import os

if os.name == "nt":
    os.add_dll_directory(r"C:\Program Files\PostgreSQL\18\bin")

from app import app as application

if __name__ == "__main__":
    application.run(debug=False)

