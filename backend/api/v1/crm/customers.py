from models import Customer
from utils import register_crud_blueprint

customers_bp = register_crud_blueprint(
    "customers_bp",
    Customer,
    create_fields=["lead_id", "customer_name", "contact_number", "email", "address", "is_active"],
    search_fields=["customer_name", "contact_number", "email"],
    url_prefix_singular="",
    # editable=True enables the generic PUT /customers/:id route, which
    # is all that's actually needed: crmApi.customers.deactivate() /
    # .reactivate() (see crm.api.js) just PUT { is_active: false/true }
    # to that same route - exactly how crmApi.leads.deactivate() works.
    # No dedicated /customers/:id/deactivate route is needed; a
    # previous attempt to add one was based on a wrong assumption
    # about how the leads deactivate flow actually works.
    # deletable stays False - the generic DELETE route is unused by
    # the frontend and intentionally left blocked.
    editable=True,
    deletable=False,
    admin_only=True,
)