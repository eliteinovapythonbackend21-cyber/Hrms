from .leads import leads_bp
from .customers import customers_bp
from .follow_ups import follow_ups_bp
from .meetings import meetings_bp
from .quotations import quotations_bp
from .invoices import invoices_bp
from .payments import payments_bp
from .support_tickets import support_tickets_bp
from .lead_uploads import lead_uploads_bp
from .department_headcounts import department_headcounts_bp
from .employee_incentives import employee_incentives_bp
from .incentive_slabs import incentive_slabs_bp
from .employee_targets import employee_targets_bp
from .lead_weekly_snapshots import lead_weekly_snapshots_bp
from .incentives import incentives_bp
from .membership_plans import membership_plans_bp

crm_blueprints = [
    (leads_bp, "/leads"),
    (customers_bp, "/customers"),
    (follow_ups_bp, "/follow-ups"),
    (meetings_bp, "/meetings"),
    (quotations_bp, "/quotations"),
    (invoices_bp, "/invoices"),
    (payments_bp, "/payments"),
    (support_tickets_bp, "/support-tickets"),
    (lead_uploads_bp, "/lead-uploads"),
    (department_headcounts_bp,"/department-headcounts"),
    (employee_incentives_bp ,"/employee-incentives"),
    (incentive_slabs_bp , "/incentive-slabs"),
    (employee_targets_bp , "/employee-targets"),
    (lead_weekly_snapshots_bp , "/lead-weekly-snapshots"),
    (incentives_bp , "/incentives"),
    (membership_plans_bp , "/membership-plans"),
]
