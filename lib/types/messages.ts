export type PriceTier = {
  id: string;
  label: string;
  client_rate_pln: number;
  worker_rate_pln: number;
  sort_order: number;
};

export type AdminStudentRow = {
  id: string;
  name: string;
  class_level: string;
  subjects: string[];
  rate_pln: number;
  blocked?: boolean;
};

export type CompanySalesMonth = {
  monthKey: string;
  monthLabel: string;
  lessonCount: number;
  totalPln: number;
};
