from .leads import leads_bp
from .customers import customers_bp
from .follow_ups import follow_ups_bp
from .meetings import meetings_bp
from .quotations import quotations_bp
from .invoices import invoices_bp
from .payments import payments_bp
from .support_tickets import support_tickets_bp

crm_blueprints = [
    (leads_bp, "/leads"),
    (customers_bp, "/customers"),
    (follow_ups_bp, "/follow-ups"),
    (meetings_bp, "/meetings"),
    (quotations_bp, "/quotations"),
    (invoices_bp, "/invoices"),
    (payments_bp, "/payments"),
    (support_tickets_bp, "/support-tickets"),
]
