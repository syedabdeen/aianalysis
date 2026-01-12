import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Vendor } from '@/types/vendor';
import { VendorStatusBadge } from './VendorStatusBadge';
import { VendorTypeBadge } from './VendorTypeBadge';
import { VendorRatingDisplay } from './VendorRatingDisplay';
import { VendorRiskScore } from './VendorRiskScore';
import { useLanguage } from '@/contexts/LanguageContext';
import { Building2, Mail, Phone, MapPin, Eye, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';

interface VendorCardProps {
  vendor: Vendor;
}

export function VendorCard({ vendor }: VendorCardProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const companyName = isRTL ? vendor.company_name_ar : vendor.company_name_en;
  const address = isRTL ? vendor.address_ar : vendor.address_en;

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-muted-foreground">{vendor.code}</span>
              <VendorStatusBadge status={vendor.status} size="sm" />
            </div>
            <h3 className="font-semibold text-lg truncate" title={companyName}>
              {companyName}
            </h3>
            {vendor.category && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {isRTL ? vendor.category.name_ar : vendor.category.name_en}
              </p>
            )}
          </div>
          <VendorTypeBadge type={vendor.vendor_type} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contact Info */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4 flex-shrink-0" />
            <a href={`mailto:${vendor.email}`} className="truncate hover:text-primary">
              {vendor.email}
            </a>
          </div>
          {vendor.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 flex-shrink-0" />
              <a href={`tel:${vendor.phone}`} className="hover:text-primary">
                {vendor.phone}
              </a>
            </div>
          )}
          {(address || vendor.city) && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                {[address, vendor.city, vendor.country].filter(Boolean).join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Scores */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <VendorRatingDisplay rating={vendor.rating_score} size="sm" />
          <VendorRiskScore score={vendor.risk_score} size="sm" />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link to={`/vendors/${vendor.id}`}>
              <Eye className="h-4 w-4 me-1" />
              {isRTL ? 'عرض' : 'View'}
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link to={`/vendors/${vendor.id}/edit`}>
              <Edit className="h-4 w-4 me-1" />
              {isRTL ? 'تعديل' : 'Edit'}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
