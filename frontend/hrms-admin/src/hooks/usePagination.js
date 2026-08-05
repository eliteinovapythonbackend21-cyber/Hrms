import { useState, useCallback } from "react";

// Shared pagination + sort state for list pages.
// Returns pagination/sort params and helpers to feed into query params.
export function usePagination(initialPage = 1, initialPerPage = 10) {
  const [page, setPage] = useState(initialPage);
  const [perPage, setPerPage] = useState(initialPerPage);
  const [sortBy, setSortBy] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const params = {
    page,
    per_page: perPage,
    ...(sortBy ? { sort_by: sortBy, sort_dir: sortDir } : {}),
  };

  const reset = useCallback(() => {
    setPage(1);
  }, []);

  const handlePageChange = useCallback((nextPage) => {
    setPage(nextPage);
  }, []);

  const handlePerPageChange = useCallback((nextPerPage) => {
    setPerPage(nextPerPage);
    setPage(1);
  }, []);

  // Clicking a column header cycles asc -> desc -> off (unsorted).
  const toggleSort = useCallback(
    (field) => {
      if (sortBy !== field) {
        setSortBy(field);
        setSortDir("asc");
      } else if (sortDir === "asc") {
        setSortDir("desc");
      } else {
        setSortBy(null);
        setSortDir("asc");
      }
      setPage(1);
    },
    [sortBy, sortDir]
  );

  return {
    page,
    perPage,
    sortBy,
    sortDir,
    params,
    setPage,
    setPerPage,
    reset,
    handlePageChange,
    handlePerPageChange,
    toggleSort,
  };
}
