import { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase";

export function useSavedRoutes(user: any) {
  const [savedRoutes, setSavedRoutes] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const fetchRoutes = useCallback(async () => {
    if (!user) {
      setSavedRoutes([]);
      return;
    }
    const { data, error } = await supabase
      .from("saved_routes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) console.error("Error fetching routes:", error);
    else if (data) setSavedRoutes(data);
  }, [user]);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  const saveRoute = async (routeName: string, startData: any, endData: any) => {
    if (!user) throw new Error("User must be logged in");
    setIsSaving(true);
    try {
      const { error } = await supabase.from("saved_routes").insert([{
        user_id: user.id,
        route_name: routeName,
        start_point: JSON.stringify(startData),
        end_point: JSON.stringify(endData),
      }]);
      if (error) throw error;
      await fetchRoutes();
    } finally {
      setIsSaving(false);
    }
  };

  const deleteRoute = async (routeId: number) => {
    if (!confirm("Are you sure you want to delete this saved route?")) return;
    try {
      const { error } = await supabase.from("saved_routes").delete().eq("id", routeId);
      if (error) throw error;
      await fetchRoutes();
    } catch (error) {
      console.error("Error deleting route:", error);
      alert("Failed to delete route.");
    }
  };

  return { savedRoutes, isSaving, saveRoute, deleteRoute };
}