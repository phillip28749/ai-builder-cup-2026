import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "./api";
export default function UsageIndicator() {
  const [count, setCount] = useState<number>();
  useEffect(() => {
    let active = true;
    const refresh = () => {
      api<{ totals: { tokens: number } }>("/owner/usage")
        .then((data) => {
          if (active) setCount(data.totals.tokens);
        })
        .catch(() => {});
    };
    refresh();
    const timer = setInterval(refresh, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  return (
    <Link
      className="usage-indicator"
      to="/usage"
      title="This month's recorded tokens. Open usage for allowances, estimates, and provider balance details."
    >
      AI usage
      {count !== undefined && <strong>{count.toLocaleString()} tokens</strong>}
    </Link>
  );
}
