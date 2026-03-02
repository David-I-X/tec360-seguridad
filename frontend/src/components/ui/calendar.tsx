"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: CalendarProps) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn("p-4", className)}
            classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-3",
                caption: "flex justify-center pt-1 pb-2 relative items-center border-b border-border/40",
                caption_label: "text-sm font-semibold tracking-wide",
                nav: "flex items-center gap-1",
                nav_button: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary transition-colors rounded-lg"
                ),
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse",
                head_row: "flex mt-3",
                head_cell:
                    "text-muted-foreground/70 rounded-md w-9 font-medium text-[0.75rem] uppercase tracking-wider",
                row: "flex w-full mt-1",
                cell: cn(
                    "h-9 w-9 text-center text-sm p-0 relative",
                    "focus-within:relative focus-within:z-20",
                    "[&:has([aria-selected].day-range-end)]:rounded-r-lg",
                    "[&:has([aria-selected].day-outside)]:bg-accent/30",
                    "[&:has([aria-selected])]:bg-accent/50",
                    "first:[&:has([aria-selected])]:rounded-l-lg",
                    "last:[&:has([aria-selected])]:rounded-r-lg"
                ),
                day: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-9 w-9 p-0 font-normal rounded-lg transition-all duration-150",
                    "hover:bg-primary/15 hover:text-primary aria-selected:opacity-100"
                ),
                day_range_end: "day-range-end",
                day_selected:
                    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground shadow-md shadow-primary/30 scale-105",
                day_today: "bg-accent/60 text-accent-foreground font-bold ring-1 ring-primary/40",
                day_outside:
                    "day-outside text-muted-foreground/30 opacity-40 aria-selected:bg-accent/20 aria-selected:text-muted-foreground aria-selected:opacity-20",
                day_disabled: "text-muted-foreground/25 opacity-30 cursor-not-allowed line-through",
                day_range_middle:
                    "aria-selected:bg-accent aria-selected:text-accent-foreground",
                day_hidden: "invisible",
                ...classNames,
            }}
            components={{
                Chevron: ({ orientation, ...props }) => {
                    if (orientation === "left") {
                        return <ChevronLeft className="h-4 w-4" />
                    }
                    return <ChevronRight className="h-4 w-4" />
                },
            }}
            {...props}
        />
    )
}
Calendar.displayName = "Calendar"

export { Calendar }
