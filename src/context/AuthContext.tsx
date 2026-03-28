"use client";
import { createContext, useContext } from "react";

// This context is handled by src/lib/auth.tsx
// This file exists only for compatibility
export const AuthContext = createContext<null>(null);
export function useAuthContext() { return useContext(AuthContext); }
