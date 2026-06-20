export type ReportActionState = {
  ok: boolean;
  error: string | null;
};

export const initialReportActionState: ReportActionState = {
  ok: false,
  error: null,
};
