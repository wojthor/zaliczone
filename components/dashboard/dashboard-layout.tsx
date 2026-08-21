"use client";

import {
  FinanceProfilePanel,
  type LessonSummaryStats,
} from "@/components/dashboard/finance-profile-panel";
import { MonthlyCalendar } from "@/components/dashboard/monthly-calendar";
import { GuideShortcutPanel } from "@/components/dashboard/guide-shortcut-panel";
import { StudentsPanel } from "@/components/students-panel";
import { WeeklySchedule } from "@/components/dashboard/weekly-schedule";
import { BonusProgressBar } from "@/components/bonus-progress-bar";
import { AlertsBanner } from "@/components/alerts/alerts-banner";
import type { Lesson } from "@/components/dashboard/lesson-data";
import type { AppAlert, StudentUi } from "@/lib/types/database";

type DashboardLayoutProps = {
  lessons: Lesson[];
  students: StudentUi[];
  totalPayout: number;
  lessonStats: LessonSummaryStats;
  verifiedHoursThisMonth: number;
  alerts?: AppAlert[];
};

export function DashboardLayout({
  lessons,
  students,
  totalPayout,
  lessonStats,
  verifiedHoursThisMonth,
  alerts = [],
}: DashboardLayoutProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 lg:min-h-0 lg:overflow-hidden">
      {alerts.length > 0 ? <AlertsBanner alerts={alerts} role="TUTOR" /> : null}
      <BonusProgressBar hoursDone={verifiedHoursThisMonth} compact showCelebration />
      <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 lg:min-h-0 lg:grid-cols-4 lg:grid-rows-2 lg:overflow-hidden">
        <div className="flex min-h-[min(320px,50svh)] min-w-0 flex-col max-lg:h-auto lg:col-span-3 lg:row-start-1 lg:h-full lg:min-h-0">
          <WeeklySchedule lessons={lessons} />
        </div>
        <div className="flex min-h-[min(260px,40svh)] min-w-0 flex-col max-lg:h-auto lg:col-span-1 lg:row-start-1 lg:h-full lg:min-h-0">
          <MonthlyCalendar lessons={lessons} />
        </div>
        <div className="min-h-[min(200px,32svh)] min-w-0 max-lg:min-h-48 lg:col-span-2 lg:row-start-2 lg:min-h-0">
          <StudentsPanel students={students} />
        </div>
        <div className="min-h-[min(220px,36svh)] min-w-0 max-lg:min-h-56 lg:col-span-1 lg:row-start-2 lg:min-h-0">
          <FinanceProfilePanel totalPayout={totalPayout} lessonStats={lessonStats} />
        </div>
        <div className="min-h-[min(180px,30svh)] min-w-0 max-lg:min-h-44 lg:col-span-1 lg:row-start-2 lg:min-h-0">
          <GuideShortcutPanel />
        </div>
      </div>
    </div>
  );
}
