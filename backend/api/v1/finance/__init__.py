from .accounts import accounts_bp
from .vendors import vendors_bp
from .expenses import expenses_bp
from .income import income_bp

finance_blueprints = [
    (accounts_bp, "/accounts"),
    (vendors_bp, "/vendors"),
    (expenses_bp, "/expenses"),
    (income_bp, "/income"),
]
