"use client";

import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";
import Auth from "../components/Auth";
import dynamic from "next/dynamic";

const Map = dynamic(() => import("../components/Map"), { ssr: false });

export default function Home() {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    return <Auth />;
  }

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", margin: 0, padding: 0 }}>
      <Map />
    </div>
  );
}
