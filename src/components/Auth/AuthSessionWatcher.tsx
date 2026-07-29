"use client";

import { useEffect } from "react";
import { initAuthSessionWatcher } from "@/lib/auth";

const AuthSessionWatcher = () => {
  useEffect(() => {
    initAuthSessionWatcher();
  }, []);

  return null;
};

export default AuthSessionWatcher;
