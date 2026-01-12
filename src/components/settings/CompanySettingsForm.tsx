import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Upload, Building2, FileText, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { CompanyDocumentUpload } from "./CompanyDocumentUpload";
import { PhoneInput } from "@/components/ui/phone-input";
import { regionOptions, currencyOptions } from "@/contexts/CompanyContext";

const formSchema = z.object({
  company_name_en: z.string().min(1, "Company name is required"),
  company_name_ar: z.string().optional(),
  trade_license_number: z.string().min(1, "Trade license number is required"),
  trade_license_expiry: z.date({ required_error: "Expiry date is required" }),
  address_en: z.string().optional(),
  address_ar: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  region: z.string().optional(),
  default_currency: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().optional(),
  vat_number: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CompanySettingsFormProps {
  onComplete?: () => void;
  isModal?: boolean;
}

export function CompanySettingsForm({ onComplete, isModal = false }: CompanySettingsFormProps) {
  const { language } = useLanguage();
  const { role } = useAuth();
  const { companySettings, saveSettings, checkLicenseExpiry, uploadLogo } = useCompanySettings();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const isAdmin = role === "admin";

  const licenseStatus = checkLicenseExpiry();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      company_name_en: "",
      company_name_ar: "",
      trade_license_number: "",
      address_en: "",
      address_ar: "",
      city: "",
      country: "UAE",
      region: "middle_east",
      default_currency: "AED",
      phone: "",
      email: "",
      website: "",
      vat_number: "",
    },
  });

  useEffect(() => {
    if (companySettings) {
      const settings = companySettings as any;
      form.reset({
        company_name_en: companySettings.company_name_en || "",
        company_name_ar: companySettings.company_name_ar || "",
        trade_license_number: companySettings.trade_license_number || "",
        trade_license_expiry: companySettings.trade_license_expiry
          ? new Date(companySettings.trade_license_expiry)
          : undefined,
        address_en: companySettings.address_en || "",
        address_ar: companySettings.address_ar || "",
        city: companySettings.city || "",
        country: companySettings.country || "UAE",
        region: settings.region || "middle_east",
        default_currency: settings.default_currency || "AED",
        phone: companySettings.phone || "",
        email: companySettings.email || "",
        website: companySettings.website || "",
        vat_number: companySettings.vat_number || "",
      });
      if (companySettings.logo_url) {
        setLogoPreview(companySettings.logo_url);
      }
    }
  }, [companySettings, form]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (values: FormValues) => {
    let logoUrl = companySettings?.logo_url;

    if (logoFile) {
      logoUrl = await uploadLogo.mutateAsync(logoFile);
    }

    await saveSettings.mutateAsync({
      ...values,
      company_name_ar: values.company_name_ar || values.company_name_en,
      address_ar: values.address_ar || values.address_en,
      trade_license_expiry: format(values.trade_license_expiry, "yyyy-MM-dd"),
      logo_url: logoUrl,
    });

    onComplete?.();
  };

  const handleExtractedData = (data: Record<string, unknown>) => {
    if (data.company_name) {
      form.setValue("company_name_en", data.company_name as string);
    }
    if (data.trade_license_number) {
      form.setValue("trade_license_number", data.trade_license_number as string);
    }
    if (data.trade_license_expiry) {
      const dateStr = data.trade_license_expiry as string;
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        form.setValue("trade_license_expiry", date);
      }
    }
    if (data.address) {
      form.setValue("address_en", data.address as string);
    }
    if (data.phone) {
      form.setValue("phone", data.phone as string);
    }
    if (data.email) {
      form.setValue("email", data.email as string);
    }
    if (data.vat_number) {
      form.setValue("vat_number", data.vat_number as string);
    }
  };

  return (
    <div className={cn("space-y-6", isModal && "max-h-[70vh] overflow-y-auto px-1")}>
      {licenseStatus?.isExpiringSoon && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Trade License Expiring Soon</AlertTitle>
          <AlertDescription>
            Your trade license expires in {licenseStatus.daysUntilExpiry} days. Please renew it before expiry.
          </AlertDescription>
        </Alert>
      )}

      {licenseStatus?.isExpired && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Trade License Expired</AlertTitle>
          <AlertDescription>
            Your trade license has expired. Please renew it immediately.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {language === "ar" ? "تحميل المستندات" : "Document Upload"}
          </CardTitle>
          <CardDescription>
            {language === "ar" 
              ? "قم بتحميل مستندات الشركة لاستخراج التفاصيل تلقائياً"
              : "Upload company documents to auto-extract details"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CompanyDocumentUpload onExtracted={handleExtractedData} disabled={!isAdmin} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {language === "ar" ? "تفاصيل الشركة" : "Company Details"}
          </CardTitle>
          <CardDescription>
            {language === "ar" 
              ? "أدخل معلومات الشركة الأساسية"
              : "Enter basic company information"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Logo Upload */}
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-24 border-2 border-dashed border-border rounded-lg flex items-center justify-center overflow-hidden bg-muted">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium">
                    {language === "ar" ? "شعار الشركة" : "Company Logo"}
                  </label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    disabled={!isAdmin}
                    className="mt-1"
                  />
                </div>
              </div>

              <Separator />

              {/* Company Names */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="company_name_en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{language === "ar" ? "اسم الشركة (إنجليزي)" : "Company Name (English)"} *</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!isAdmin} placeholder="Enter company name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="company_name_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{language === "ar" ? "اسم الشركة (عربي)" : "Company Name (Arabic)"}</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!isAdmin} dir="rtl" placeholder="أدخل اسم الشركة" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Trade License */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="trade_license_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{language === "ar" ? "رقم الرخصة التجارية" : "Trade License Number"} *</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!isAdmin} placeholder="Enter trade license number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="trade_license_expiry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{language === "ar" ? "تاريخ انتهاء الرخصة" : "License Expiry Date"} *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              disabled={!isAdmin}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "PPP") : "Select date"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="address_en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{language === "ar" ? "العنوان (إنجليزي)" : "Address (English)"}</FormLabel>
                      <FormControl>
                        <Textarea {...field} disabled={!isAdmin} placeholder="Enter address" rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{language === "ar" ? "العنوان (عربي)" : "Address (Arabic)"}</FormLabel>
                      <FormControl>
                        <Textarea {...field} disabled={!isAdmin} dir="rtl" placeholder="أدخل العنوان" rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* City & Country */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{language === "ar" ? "المدينة" : "City"}</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!isAdmin} placeholder="Dubai" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{language === "ar" ? "الدولة" : "Country"}</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!isAdmin} placeholder="UAE" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Region & Currency */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{language === "ar" ? "المنطقة" : "Region"}</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Reset currency when region changes
                          const regionCurrencies = currencyOptions[value];
                          if (regionCurrencies && regionCurrencies.length > 0) {
                            form.setValue("default_currency", regionCurrencies[0].code);
                          }
                        }} 
                        value={field.value}
                        disabled={!isAdmin}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={language === "ar" ? "اختر المنطقة" : "Select region"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {regionOptions.map((region) => (
                            <SelectItem key={region.value} value={region.value}>
                              {language === "ar" ? region.labelAr : region.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="default_currency"
                  render={({ field }) => {
                    const selectedRegion = form.watch("region") || "middle_east";
                    const currencies = currencyOptions[selectedRegion] || [];
                    return (
                      <FormItem>
                        <FormLabel>{language === "ar" ? "العملة الافتراضية" : "Default Currency"}</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          disabled={!isAdmin}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={language === "ar" ? "اختر العملة" : "Select currency"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {currencies.map((currency) => (
                              <SelectItem key={currency.code} value={currency.code}>
                                {currency.symbol} - {currency.name} ({currency.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>

              {/* Contact Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{language === "ar" ? "رقم الهاتف" : "Phone"}</FormLabel>
                      <FormControl>
                        <PhoneInput 
                          value={field.value} 
                          onChange={field.onChange} 
                          disabled={!isAdmin} 
                          placeholder={language === "ar" ? "رقم الهاتف" : "Phone number"} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{language === "ar" ? "البريد الإلكتروني" : "Email"}</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!isAdmin} type="email" placeholder="info@company.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Website & VAT */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{language === "ar" ? "الموقع الإلكتروني" : "Website"}</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!isAdmin} placeholder="www.company.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vat_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{language === "ar" ? "رقم ضريبة القيمة المضافة" : "VAT Number"}</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!isAdmin} placeholder="Enter VAT number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {isAdmin && (
                <div className="flex justify-end gap-2">
                  <Button type="submit" disabled={saveSettings.isPending}>
                    {saveSettings.isPending 
                      ? (language === "ar" ? "جاري الحفظ..." : "Saving...") 
                      : (language === "ar" ? "حفظ الإعدادات" : "Save Settings")}
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
