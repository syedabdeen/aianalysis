import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  FileText,
  ClipboardList,
  Package,
  Users,
  FolderKanban,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const quickActions = [
  {
    icon: FileText,
    label: "New PR",
    labelAr: "طلب شراء جديد",
    path: "/procurement/pr/new",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: ClipboardList,
    label: "New RFQ",
    labelAr: "طلب عرض أسعار جديد",
    path: "/procurement/rfq/new",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: FolderKanban,
    label: "New Project",
    labelAr: "مشروع جديد",
    path: "/projects/new",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: Users,
    label: "New Vendor",
    labelAr: "مورد جديد",
    path: "/vendors/new",
    color: "from-orange-500 to-amber-500",
  },
  {
    icon: Package,
    label: "New Material",
    labelAr: "مادة جديدة",
    path: "/inventory/new",
    color: "from-red-500 to-rose-500",
  },
];

export const QuickActionWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { language } = useLanguage();

  const handleAction = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 print:hidden">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-16 right-0 flex flex-col gap-2 items-end"
          >
            {quickActions.map((action, index) => (
              <motion.div
                key={action.path}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
              >
                <Button
                  variant="secondary"
                  className={cn(
                    "group flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-300",
                    "bg-card/90 backdrop-blur-sm border border-border/50",
                    "hover:border-primary/50 hover:scale-105"
                  )}
                  onClick={() => handleAction(action.path)}
                >
                  <span className="text-sm font-medium">
                    {language === "ar" ? action.labelAr : action.label}
                  </span>
                  <div
                    className={cn(
                      "p-1.5 rounded-md bg-gradient-to-br",
                      action.color
                    )}
                  >
                    <action.icon className="h-4 w-4 text-white" />
                  </div>
                </Button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          size="lg"
          className={cn(
            "h-14 w-14 rounded-full shadow-lg hover:shadow-xl",
            "bg-gradient-to-br from-primary to-accent",
            "transition-all duration-300",
            isOpen && "rotate-45"
          )}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Plus className="h-6 w-6" />
          )}
        </Button>
      </motion.div>
    </div>
  );
};
