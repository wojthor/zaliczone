export type MessageCategory = "employer" | "system";
export type MessageTemplate = "CUSTOM" | "EWIDENCJA" | "CENNIK" | "PAYOUT" | "WELCOME";

export type PriceTier = {
  id: string;
  label: string;
  client_rate_pln: number;
  worker_rate_pln: number;
  sort_order: number;
};

export type InboxMessage = {
  id: string;
  recipientId: string;
  messageId: string;
  title: string;
  body: string;
  category: MessageCategory;
  template: MessageTemplate;
  createdAt: string;
  readAt: string | null;
};

export type AdminStudentRow = {
  id: string;
  name: string;
  class_level: string;
  subjects: string[];
  rate_pln: number;
};

export type CompanySalesMonth = {
  monthKey: string;
  monthLabel: string;
  lessonCount: number;
  totalPln: number;
};
