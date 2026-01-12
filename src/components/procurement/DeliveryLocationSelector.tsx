import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProjects } from '@/hooks/useProjects';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DELIVERY_LOCATION_TYPES } from '@/lib/procurementConstants';

interface DeliveryLocationSelectorProps {
  locationType: string;
  onLocationTypeChange: (type: string) => void;
  projectId: string;
  onProjectIdChange: (id: string) => void;
  deliveryAddress: string;
  onDeliveryAddressChange: (address: string) => void;
  contactPerson: string;
  onContactPersonChange: (name: string) => void;
  contactPhone: string;
  onContactPhoneChange: (phone: string) => void;
}

export const DeliveryLocationSelector: React.FC<DeliveryLocationSelectorProps> = ({
  locationType,
  onLocationTypeChange,
  projectId,
  onProjectIdChange,
  deliveryAddress,
  onDeliveryAddressChange,
  contactPerson,
  onContactPersonChange,
  contactPhone,
  onContactPhoneChange,
}) => {
  const { language } = useLanguage();
  const { data: projects } = useProjects({ status: 'active' });

  const activeProjects = projects?.filter(p => p.status === 'active' || p.status === 'draft') || [];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>{language === 'ar' ? 'نوع موقع التسليم' : 'Delivery Location Type'}</Label>
          <Select value={locationType} onValueChange={onLocationTypeChange}>
            <SelectTrigger>
              <SelectValue placeholder={language === 'ar' ? 'اختر نوع الموقع' : 'Select location type'} />
            </SelectTrigger>
            <SelectContent>
              {DELIVERY_LOCATION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {language === 'ar' ? type.label_ar : type.label_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {locationType === 'project_site' && (
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'موقع المشروع' : 'Project Site'}</Label>
            <Select value={projectId} onValueChange={onProjectIdChange}>
              <SelectTrigger>
                <SelectValue placeholder={language === 'ar' ? 'اختر المشروع' : 'Select project'} />
              </SelectTrigger>
              <SelectContent>
                {activeProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.code} - {language === 'ar' ? project.name_ar : project.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {locationType === 'warehouse' && (
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'المستودع' : 'Warehouse'}</Label>
            <Select value={deliveryAddress} onValueChange={onDeliveryAddressChange}>
              <SelectTrigger>
                <SelectValue placeholder={language === 'ar' ? 'اختر المستودع' : 'Select warehouse'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="main_warehouse">
                  {language === 'ar' ? 'المستودع الرئيسي' : 'Main Warehouse'}
                </SelectItem>
                <SelectItem value="secondary_warehouse">
                  {language === 'ar' ? 'المستودع الفرعي' : 'Secondary Warehouse'}
                </SelectItem>
                <SelectItem value="raw_materials">
                  {language === 'ar' ? 'مستودع المواد الخام' : 'Raw Materials Store'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {(locationType === 'custom' || locationType === 'head_office') && (
        <div className="space-y-2">
          <Label>{language === 'ar' ? 'عنوان التسليم' : 'Delivery Address'}</Label>
          <Textarea
            value={deliveryAddress}
            onChange={(e) => onDeliveryAddressChange(e.target.value)}
            placeholder={language === 'ar' ? 'أدخل عنوان التسليم الكامل...' : 'Enter full delivery address...'}
            rows={2}
          />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>{language === 'ar' ? 'اسم جهة الاتصال' : 'Contact Person Name'}</Label>
          <Input
            value={contactPerson}
            onChange={(e) => onContactPersonChange(e.target.value)}
            placeholder={language === 'ar' ? 'اسم المستلم' : 'Receiver name'}
          />
        </div>
        <div className="space-y-2">
          <Label>{language === 'ar' ? 'رقم الهاتف' : 'Contact Phone'}</Label>
          <Input
            value={contactPhone}
            onChange={(e) => onContactPhoneChange(e.target.value)}
            placeholder={language === 'ar' ? 'رقم الهاتف' : 'Phone number'}
          />
        </div>
      </div>
    </div>
  );
};
