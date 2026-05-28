"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchApiMessage } from "../lib/api";

export default function ApiMessage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["api-message"],
    queryFn: fetchApiMessage,
  });

  if (isLoading) {
    return <p>Loading message…</p>;
  }

  if (isError) {
    return <p>Unable to load message: {error.message}</p>;
  }

  return <p>API says: {data}</p>;
}
