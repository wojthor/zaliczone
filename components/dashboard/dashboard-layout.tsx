"use client";

import { FinanceProfilePanel } from "@/components/dashboard/finance-profile-panel";
import { LessonCompletionProvider } from "@/components/dashboard/lesson-completion-context";
import { MonthlyCalendar } from "@/components/dashboard/monthly-calendar";
import { NotificationsPanel } from "@/components/dashboard/notifications-panel";
import { StudentsPanel } from "@/components/students-panel";
import { WeeklySchedule } from "@/components/dashboard/weekly-schedule";

export function DashboardLayout() {
  return (
    <LessonCompletionProvider>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 lg:min-h-0 lg:overflow-hidden">
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-1.5 lg:min-h-0 lg:grid-cols-4 lg:grid-rows-2 lg:overflow-hidden">
          <div className="flex min-h-[min(320px,50svh)] min-w-0 flex-col overflow-hidden max-lg:h-auto lg:col-span-3 lg:row-start-1 lg:h-full lg:min-h-0">
            <WeeklySchedule />
          </div>
          <div className="flex min-h-[min(260px,40svh)] min-w-0 flex-col overflow-hidden max-lg:h-auto lg:col-span-1 lg:row-start-1 lg:h-full lg:min-h-0">
            <MonthlyCalendar />
          </div>
          <div className="min-h-[min(200px,32svh)] min-w-0 overflow-hidden max-lg:min-h-48 lg:col-span-2 lg:row-start-2 lg:min-h-0">
            <StudentsPanel />
          </div>
          <div className="min-h-[min(180px,30svh)] min-w-0 overflow-hidden max-lg:min-h-44 lg:col-span-1 lg:row-start-2 lg:min-h-0">
            <NotificationsPanel />
          </div>
          <div className="min-h-[min(220px,36svh)] min-w-0 overflow-hidden max-lg:min-h-52 lg:col-span-1 lg:row-start-2 lg:min-h-0">
            <FinanceProfilePanel />
          </div>
        </div>
      </div>
    </LessonCompletionProvider>
  );
}
