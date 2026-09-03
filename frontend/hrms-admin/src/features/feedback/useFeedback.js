import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { feedbackApi } from "@/api/feedback.api";

export function useFeedbackTickets(params) {
  return useQuery({
    queryKey: ["feedback-tickets", params],
    queryFn: async () => (await feedbackApi.list(params)).data.data,
  });
}

export function useFeedbackTicket(id) {
  return useQuery({
    queryKey: ["feedback-tickets", id],
    queryFn: async () => (await feedbackApi.get(id)).data.data,
    enabled: !!id,
  });
}

export function useCreateFeedbackTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => feedbackApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback-tickets"] });
    },
  });
}

export function useUpdateFeedbackTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => feedbackApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback-tickets"] });
    },
  });
}
