import { Navigate, useSearchParams } from "react-router-dom";

const InvestApply = () => {
  const [params] = useSearchParams();
  const plan = params.get("plan");
  const next = `/investor${plan ? `?plan=${encodeURIComponent(plan)}` : ""}`;
  return <Navigate to={`/investor/login?next=${encodeURIComponent(next)}`} replace />;
};

export default InvestApply;
