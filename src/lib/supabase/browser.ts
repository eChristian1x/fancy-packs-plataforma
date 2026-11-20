"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";

/** Cliente del navegador: solo para subir archivos a Storage con la sesión del usuario. */
export const supabaseBrowser = () => createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
