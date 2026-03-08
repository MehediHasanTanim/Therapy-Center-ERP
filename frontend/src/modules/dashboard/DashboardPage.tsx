import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { dashboardService } from "../../services/dashboardService";
import { formatCurrency } from "../../utils/format";
import { useAuth } from "../auth/AuthContext";

export function DashboardPage() {
  const { user } = useAuth();
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: dashboardService.getStats });

  return (
    <div>
      <h2 className="page-title">{user?.role.toUpperCase()} Dashboard</h2>
      <div className="grid grid-2">
        <Card>
          <h3>Patients</h3>
          <p>{data?.totalPatients ?? 0}</p>
        </Card>
        <Card>
          <h3>Therapists</h3>
          <p>{data?.totalTherapists ?? 0}</p>
        </Card>
        <Card>
          <h3>Upcoming Sessions</h3>
          <p>{data?.upcomingSessions ?? 0}</p>
        </Card>
        <Card>
          <h3>Revenue</h3>
          <p>{formatCurrency(data?.totalRevenue ?? 0)}</p>
        </Card>
      </div>
    </div>
  );
}
