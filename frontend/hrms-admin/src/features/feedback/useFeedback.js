import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { feedbackApi } from "@/api/feedback.api";

/* =========================================================
   QUERY KEYS
========================================================= */

const SUPPORT_TICKETS_KEY = ["support-tickets"];
const LEGACY_FEEDBACK_KEY = ["feedback-tickets"];
const SUPPORT_TICKET_OPTIONS_KEY = ["support-ticket-options"];

/* =========================================================
   LIST SUPPORT TICKETS
========================================================= */

export function useFeedbackTickets(params = {}) {
  return useQuery({
    queryKey: [...SUPPORT_TICKETS_KEY, params],

    queryFn: async () => {
      const response = await feedbackApi.list(params);

      return response.data.data;
    },

    keepPreviousData: true,
  });
}

/* =========================================================
   GET SINGLE SUPPORT TICKET
========================================================= */

export function useFeedbackTicket(id) {
  return useQuery({
    queryKey: [...SUPPORT_TICKETS_KEY, id],

    queryFn: async () => {
      const response = await feedbackApi.get(id);

      return response.data.data;
    },

    enabled: !!id,
  });
}

/* =========================================================
   GET SUPPORT TICKET OPTIONS
=========================================================

Backend response:

{
  categories: [
    "Feature Bug",
    "Internal Bug",
    "Other Bugs/Issues"
  ],

  reasons: [
    "Login / Password Issue",
    ...
    "Other / Miscellaneous"
  ],

  statuses: [
    "Open",
    "In Progress",
    "Resolved"
  ]
}

========================================================= */

export function useFeedbackCategories() {
  return useQuery({
    queryKey: SUPPORT_TICKET_OPTIONS_KEY,

    queryFn: async () => {
      const response = await feedbackApi.categories();

      return response.data.data;
    },

    staleTime: Infinity,
    gcTime: Infinity,
  });
}

/* =========================================================
   CREATE SUPPORT TICKET
========================================================= */

export function useCreateFeedbackTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      /*
       * Payload can contain:
       *
       * employee
       * employee_id
       * name
       * category
       * reason
       * purpose
       * description
       * screenshot
       *
       * feedbackApi.create() is responsible for sending
       * multipart/form-data when screenshot is present.
       */
      return feedbackApi.create(payload);
    },

    onSuccess: () => {
      /*
       * Refresh current Support Ticket page.
       */
      queryClient.invalidateQueries({
        queryKey: SUPPORT_TICKETS_KEY,
      });

      /*
       * Keep old Feedback query consumers synchronized.
       */
      queryClient.invalidateQueries({
        queryKey: LEGACY_FEEDBACK_KEY,
      });
    },
  });
}

/* =========================================================
   UPDATE SUPPORT TICKET
========================================================= */

export function useUpdateFeedbackTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }) => {
      return feedbackApi.update(id, payload);
    },

    onSuccess: (_response, variables) => {
      /*
       * Refresh support-ticket lists.
       */
      queryClient.invalidateQueries({
        queryKey: SUPPORT_TICKETS_KEY,
      });

      /*
       * Refresh legacy feedback consumers.
       */
      queryClient.invalidateQueries({
        queryKey: LEGACY_FEEDBACK_KEY,
      });

      /*
       * Refresh the exact ticket if it is open in a detail view.
       */
      if (variables?.id) {
        queryClient.invalidateQueries({
          queryKey: [
            ...SUPPORT_TICKETS_KEY,
            variables.id,
          ],
        });

        queryClient.invalidateQueries({
          queryKey: [
            ...LEGACY_FEEDBACK_KEY,
            variables.id,
          ],
        });
      }
    },
  });
}

/* =========================================================
   OPTIONAL: CREATE TICKET WITH EXPLICIT FORM DATA
=========================================================

Use this only if you want the hook itself to build FormData
instead of handling it inside feedbackApi.create().

Current FeedBackPage can continue using:

createTicket.mutateAsync({
  category,
  reason,
  purpose,
  description,
  screenshot,
});

========================================================= */

export function useCreateSupportTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employee,
      employee_id,
      name,
      category,
      reason,
      purpose,
      description,
      screenshot,
    }) => {
      const formData = new FormData();

      if (employee !== undefined && employee !== null) {
        formData.append("employee", employee);
      }

      if (employee_id !== undefined && employee_id !== null) {
        formData.append("employee_id", String(employee_id));
      }

      if (name !== undefined && name !== null) {
        formData.append("name", name);
      }

      if (category) {
        formData.append("category", category);
      }

      if (reason) {
        formData.append("reason", reason);
      }

      if (purpose) {
        formData.append("purpose", purpose);
      }

      if (description) {
        formData.append("description", description);
      }

      if (screenshot instanceof File) {
        formData.append("screenshot", screenshot);
      }

      return feedbackApi.create(formData);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: SUPPORT_TICKETS_KEY,
      });

      queryClient.invalidateQueries({
        queryKey: LEGACY_FEEDBACK_KEY,
      });
    },
  });
}