import { useState, useCallback } from "react";

// Capture geolocation for check-in/check-out.
// Returns { latitude, longitude, loading, error, getLocation }.
export function useGeolocation() {
  const [coords, setCoords] = useState({ latitude: null, longitude: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLoading(false);
      },
      (err) => {
        setError(err.message || "Unable to retrieve location.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return { coords, loading, error, getLocation };
}
