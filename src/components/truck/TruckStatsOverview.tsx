
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Truck, 
  CheckCircle, 
  MapPin, 
  Wrench, 
  AlertTriangle,
  TrendingUp 
} from "lucide-react";

interface TruckStats {
  total: number;
  available: number;
  assigned: number;
  maintenance: number;
  outOfService: number;
  utilizationRate: number;
}

interface TruckStatsOverviewProps {
  stats: TruckStats;
}

export function TruckStatsOverview({ stats }: TruckStatsOverviewProps) {
  const statCards = [
    {
      title: "Total Fleet",
      value: stats.total,
      icon: Truck,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Available",
      value: stats.available,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Assigned",
      value: stats.assigned,
      icon: MapPin,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Maintenance",
      value: stats.maintenance,
      icon: Wrench,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      title: "Out of Service",
      value: stats.outOfService,
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "Utilization",
      value: `${stats.utilizationRate}%`,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className={`p-2 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
