import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileText,
  ClipboardList,
  ShoppingCart,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";

interface ProcurementItem {
  id: string;
  code: string;
  title: string;
  status: string;
  total_amount?: number;
  currency?: string;
  created_at: string;
  type: "pr" | "po" | "rfq" | "rfi";
}

interface KanbanBoardProps {
  items: ProcurementItem[];
  isLoading?: boolean;
}

const statusColumns = [
  {
    id: "draft",
    label: "Draft",
    labelAr: "مسودة",
    icon: FileText,
    color: "bg-muted text-muted-foreground",
    borderColor: "border-muted-foreground/30",
  },
  {
    id: "pending",
    label: "Pending",
    labelAr: "معلق",
    icon: Clock,
    color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    borderColor: "border-yellow-500/30",
  },
  {
    id: "submitted",
    label: "Submitted",
    labelAr: "مقدم",
    icon: ClipboardList,
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    borderColor: "border-blue-500/30",
  },
  {
    id: "approved",
    label: "Approved",
    labelAr: "موافق عليه",
    icon: CheckCircle2,
    color: "bg-green-500/10 text-green-600 dark:text-green-400",
    borderColor: "border-green-500/30",
  },
  {
    id: "issued",
    label: "Issued",
    labelAr: "صادر",
    icon: ShoppingCart,
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    borderColor: "border-purple-500/30",
  },
  {
    id: "completed",
    label: "Completed",
    labelAr: "مكتمل",
    icon: CheckCircle2,
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    borderColor: "border-emerald-500/30",
  },
  {
    id: "rejected",
    label: "Rejected",
    labelAr: "مرفوض",
    icon: XCircle,
    color: "bg-red-500/10 text-red-600 dark:text-red-400",
    borderColor: "border-red-500/30",
  },
];

const typeColors = {
  pr: "bg-blue-500",
  po: "bg-purple-500",
  rfq: "bg-orange-500",
  rfi: "bg-teal-500",
};

const typeLabels = {
  pr: "PR",
  po: "PO",
  rfq: "RFQ",
  rfi: "RFI",
};

export const KanbanBoard = ({ items, isLoading }: KanbanBoardProps) => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const itemsByStatus = useMemo(() => {
    const grouped: Record<string, ProcurementItem[]> = {};
    statusColumns.forEach((col) => {
      grouped[col.id] = items.filter((item) => item.status === col.id);
    });
    return grouped;
  }, [items]);

  const handleItemClick = (item: ProcurementItem) => {
    const paths: Record<string, string> = {
      pr: `/procurement/pr/${item.id}`,
      po: `/procurement/po/${item.id}`,
      rfq: `/procurement/rfq/${item.id}`,
      rfi: `/procurement/rfi/${item.id}`,
    };
    navigate(paths[item.type]);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {statusColumns.map((col) => (
          <div
            key={col.id}
            className="bg-card rounded-xl border p-4 animate-pulse"
          >
            <div className="h-5 w-20 bg-muted rounded mb-4" />
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 bg-muted rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {statusColumns.map((column) => {
        const columnItems = itemsByStatus[column.id] || [];
        const Icon = column.icon;

        return (
          <Card
            key={column.id}
            className={cn(
              "min-h-[400px] border-t-4 transition-all duration-300",
              column.borderColor
            )}
          >
            <CardHeader className="py-3 px-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <div className={cn("p-1.5 rounded-md", column.color)}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span>{language === "ar" ? column.labelAr : column.label}</span>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {columnItems.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-[320px] pr-2">
                <div className="space-y-2">
                  {columnItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleItemClick(item)}
                      className={cn(
                        "p-3 rounded-lg bg-background border cursor-pointer group",
                        "hover:border-primary/50 hover:shadow-md transition-all duration-200",
                        "hover:translate-y-[-2px]"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          className={cn(
                            "text-[10px] px-1.5 py-0 text-white",
                            typeColors[item.type]
                          )}
                        >
                          {typeLabels[item.type]}
                        </Badge>
                        <span className="text-xs font-mono text-muted-foreground">
                          {item.code}
                        </span>
                      </div>
                      <p className="text-xs font-medium line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                        {item.title}
                      </p>
                      {item.total_amount && (
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(
                            item.total_amount,
                            item.currency || "AED"
                          )}
                        </p>
                      )}
                      <div className="flex items-center justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </motion.div>
                  ))}
                  {columnItems.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                      <AlertCircle className="h-6 w-6 mb-2 opacity-50" />
                      <p className="text-xs">No items</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
