
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OpportunityCard } from "./OpportunityCard";

interface PipelineStage {
  id: string;
  title: string;
  color: string;
  textColor: string;
}

interface PipelineColumnProps {
  stage: PipelineStage;
  orders: any[];
  onOrderMove: () => void;
}

export function PipelineColumn({ stage, orders, onOrderMove }: PipelineColumnProps) {
  const totalValue = orders.reduce((sum, order) => sum + order.total_amount, 0);

  return (
    <div className="flex flex-col h-full">
      <Card className={`border-2 ${stage.color} mb-4`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className={`text-sm font-semibold ${stage.textColor}`}>
              {stage.title}
            </CardTitle>
            <Badge variant="outline" className={stage.textColor}>
              {orders.length}
            </Badge>
          </div>
          {totalValue > 0 && (
            <p className={`text-xs ${stage.textColor}`}>
              ${totalValue.toFixed(0)}
            </p>
          )}
        </CardHeader>
      </Card>
      
      <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px]">
        {orders.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <p className="text-sm">No orders in this stage</p>
          </div>
        ) : (
          orders.map((order) => (
            <OpportunityCard
              key={order.id}
              order={order}
              currentStage={stage.id}
              onOrderMove={onOrderMove}
            />
          ))
        )}
      </div>
    </div>
  );
}
