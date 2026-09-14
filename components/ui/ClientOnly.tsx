"use client";

import { useEffect, useState } from "react";

type Props = {
  children: React.ReactNode;
};

function ClientOnly({ children }: Props) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.appHydrated = "true";
    setHasMounted(true);

    return () => {
      delete document.documentElement.dataset.appHydrated;
    };
  }, []);

  if (!hasMounted) {
    return null;
  }

  return <>{children}</>;
}

export default ClientOnly;
