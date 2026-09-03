from .user import user_bp
from .employee import employee_bp
from .master import master_bp
from .master.organization import organization_bp
from .attendance import attendance_bp
from .network import network_bp
from .auth import auth_bp
from .leave import leave_bp
from .role.role import role_bp
from .dashboard import dashboard_bp
from .employee_lifecycle import lifecycle_blueprints
from .crm import crm_blueprints
from .finance import finance_blueprints
from .feedback import feedback_bp

blueprints = [
    (user_bp, "/users"),
    (employee_bp, "/employees"),
    (master_bp, ""),
    (organization_bp, "/organization"),
    (attendance_bp, "/attendance"),
    (network_bp, "/network"),
    (auth_bp, "/auth"),
    (leave_bp, "/leaves"),
    (role_bp, "/roles"),
    (dashboard_bp, "/dashboard"),
    (feedback_bp, "/feedback"),
    *lifecycle_blueprints,
    *crm_blueprints,
    *finance_blueprints,
]