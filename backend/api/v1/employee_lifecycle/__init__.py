from .documents import documents_bp
from .permissions import employee_permissions_bp
from .overtime import overtime_bp
from .payroll import payroll_bp
from .performance import performance_bp
from .training import training_bp
from .promotions import promotions_bp
from .transfers import transfers_bp
from .resignations import resignations_bp
from .exit_management import exit_management_bp

lifecycle_blueprints = [
    (documents_bp, "/employee-documents"),
    (employee_permissions_bp, "/employee-permissions"),
    (overtime_bp, "/overtime"),
    (payroll_bp, "/payroll"),
    (performance_bp, "/performance"),
    (training_bp, "/training"),
    (promotions_bp, "/promotions"),
    (transfers_bp, "/transfers"),
    (resignations_bp, "/resignations"),
    (exit_management_bp, "/exit-management"),
]
