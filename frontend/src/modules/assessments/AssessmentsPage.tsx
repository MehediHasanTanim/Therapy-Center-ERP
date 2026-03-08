import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { scheduleService } from "../../services/scheduleService";
import { formatDateTime } from "../../utils/format";

export function AssessmentsPage() {
  const { data: sessions } = useQuery({ queryKey: ["sessions"], queryFn: scheduleService.list });
  const assessments = (sessions ?? []).filter((s) => s.type === "assessment");

  return (
    <Card>
      <h2 className="page-title">Assessment Scheduling</h2>
      {assessments.length === 0 ? <p>No assessments yet. Create one from Scheduling.</p> : null}
      <table className="table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Start</th>
            <th>End</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {assessments.map((item) => (
            <tr key={item.id}>
              <td>{item.title}</td>
              <td>{formatDateTime(item.startsAt)}</td>
              <td>{formatDateTime(item.endsAt)}</td>
              <td>
                <span className="chip">{item.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
