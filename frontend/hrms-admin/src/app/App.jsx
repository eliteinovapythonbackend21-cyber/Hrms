import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { queryClient } from "./queryClient";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { UIProvider } from "@/context/UIContext";
import AppRouter from "./AppRouter";
import { ToastProvider } from "@/components/feedback/Toast";
import ErrorBoundary from "@/components/feedback/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <UIProvider>
            <ToastProvider>
              <BrowserRouter>
                <AppRouter />
              </BrowserRouter>
            </ToastProvider>
          </UIProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
