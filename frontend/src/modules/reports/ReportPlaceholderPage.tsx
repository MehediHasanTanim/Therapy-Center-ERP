import { Card } from "../../components/ui/Card";

interface ReportPlaceholderPageProps {
  title: string;
  description: string;
}

export function ReportPlaceholderPage({ title, description }: ReportPlaceholderPageProps) {
  return (
    <Card>
      <h2 className="page-title">{title}</h2>
      <p className="section-subtitle">{description}</p>
      <p>These reports will be available in the next iteration.</p>
    </Card>
  );
}

