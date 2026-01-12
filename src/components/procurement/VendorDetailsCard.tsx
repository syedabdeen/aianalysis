import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, User, Phone, Mail, MapPin } from 'lucide-react';
import type { Vendor } from '@/types/vendor';

interface VendorDetailsCardProps {
  vendor: Vendor;
}

export const VendorDetailsCard: React.FC<VendorDetailsCardProps> = ({ vendor }) => {
  const { language } = useLanguage();
  
  const primaryContact = vendor.contacts?.find(c => c.is_primary) || vendor.contacts?.[0];

  return (
    <Card className="bg-muted/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          {language === 'ar' ? 'تفاصيل المورد' : 'Supplier Details'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-start gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div>
            <div className="font-medium">
              {language === 'ar' ? vendor.company_name_ar : vendor.company_name_en}
            </div>
            <div className="text-xs text-muted-foreground">{vendor.code}</div>
          </div>
        </div>

        {primaryContact && (
          <>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <span className="font-medium">{primaryContact.name}</span>
                {primaryContact.designation && (
                  <span className="text-muted-foreground"> - {primaryContact.designation}</span>
                )}
              </div>
            </div>

            {primaryContact.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{primaryContact.phone}</span>
              </div>
            )}

            {primaryContact.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-primary">{primaryContact.email}</span>
              </div>
            )}
          </>
        )}

        {!primaryContact && vendor.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{vendor.phone}</span>
          </div>
        )}

        {vendor.email && (
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-primary">{vendor.email}</span>
          </div>
        )}

        {(vendor.address_en || vendor.address_ar) && (
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <span className="text-muted-foreground">
              {language === 'ar' ? vendor.address_ar : vendor.address_en}
              {vendor.city && `, ${vendor.city}`}
              {vendor.country && `, ${vendor.country}`}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
