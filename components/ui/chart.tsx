"use client"

import * as React from "react"
import {
  Area,
  AreaChart as RechartsAreaChart,
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  ComposedChart as RechartsComposedChart,
  Legend as RechartsLegend,
  Line as RechartsLine,
  LineChart as RechartsLineChart,
  Pie,
  PieChart as RechartsPieChart,
  RadialBar,
  RadialBarChart as RechartsRadialBarChart,
  Rectangle,
  ResponsiveContainer,
  Scatter,
  ScatterChart as RechartsScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { cn } from "@/lib/utils"

const ChartContainer = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("h-[350px] w-full", className)} {...props} />,
)
ChartContainer.displayName = "ChartContainer"

const Chart = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("h-full w-full", className)} {...props} />
))
Chart.displayName = "Chart"

const ChartTooltipContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("rounded-lg border bg-background p-2 shadow-md", className)} {...props} />
  ),
)
ChartTooltipContent.displayName = "ChartTooltipContent"

const ChartTooltip = React.forwardRef<React.ElementRef<typeof Tooltip>, React.ComponentPropsWithoutRef<typeof Tooltip>>(
  ({ content, ...props }, ref) => <Tooltip content={content} {...props} />,
)
ChartTooltip.displayName = "ChartTooltip"

export {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Chart,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  Rectangle,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
}

function AreaChart(props: React.ComponentProps<typeof RechartsAreaChart>) {
  return <RechartsAreaChart {...props} />
}

function BarChart(props: React.ComponentProps<typeof RechartsBarChart>) {
  return <RechartsBarChart {...props} />
}

function ComposedChart(props: React.ComponentProps<typeof RechartsComposedChart>) {
  return <RechartsComposedChart {...props} />
}

function LineChart(props: React.ComponentProps<typeof RechartsLineChart>) {
  return <RechartsLineChart {...props} />
}

function PieChart(props: React.ComponentProps<typeof RechartsPieChart>) {
  return <RechartsPieChart {...props} />
}

function RadialBarChart(props: React.ComponentProps<typeof RechartsRadialBarChart>) {
  return <RechartsRadialBarChart {...props} />
}

function ScatterChart(props: React.ComponentProps<typeof RechartsScatterChart>) {
  return <RechartsScatterChart {...props} />
}

function Legend(props: React.ComponentProps<typeof RechartsLegend>) {
  return <RechartsLegend {...props} />
}

function Line(props: React.ComponentProps<typeof RechartsLine>) {
  return <RechartsLine {...props} />
}
