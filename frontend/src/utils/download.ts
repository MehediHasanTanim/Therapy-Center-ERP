import { apiClient } from "../services/apiClient";

const downloadReport = async (
  endpoint: string,
  params: Record<string, string | number | undefined>,
  filename: string,
  format: "csv" | "pdf"
) => {
  const { data } = await apiClient.get(endpoint, {
    params: { ...params, export: format },
    responseType: "blob"
  });
  const blob = new Blob([data], { type: format === "csv" ? "text/csv;charset=utf-8;" : "application/pdf" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

export const downloadCsv = (endpoint: string, params: Record<string, string | number | undefined>, filename: string) =>
  downloadReport(endpoint, params, filename, "csv");

export const downloadPdf = (endpoint: string, params: Record<string, string | number | undefined>, filename: string) =>
  downloadReport(endpoint, params, filename, "pdf");
