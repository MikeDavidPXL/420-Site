import React, { createContext, useContext, useEffect, useState } from "react";

export interface Application {
  id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  reviewer_note?: string;
}

export interface User {
  discord_id: string;
  username: string;
  avatar: string | null;
  in_guild: boolean;
  is_staff: boolean;
  is_member: boolean;
  application: Application | null;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refresh: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await fetch("/.netlify/functions/me");
      const data = await res.json();
      setUser(data.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};
