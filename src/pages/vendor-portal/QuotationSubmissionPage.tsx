import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Send, CheckCircle, AlertCircle, FileText, Building2 } from 'lucide-react';
import { format } from 'date-fns';

interface RFQItem {
  id: string;
  item_number: number;
  description_en: string;
  description_ar: string;
  quantity: number;
  unit: string;
  specifications: string | null;
}

interface QuotationLine {
  rfq_item_id: string;
  unit_price: number;
  total_price: number;
  notes: string;
}

const CURRENCIES = ['AED', 'USD', 'EUR', 'GBP', 'SAR', 'QAR', 'BHD', 'KWD', 'OMR'];

export default function QuotationSubmissionPage() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const token = searchParams.get('token');

  const [quotationLines, setQuotationLines] = useState<QuotationLine[]>([]);
  const [currency, setCurrency] = useState('AED');
  const [deliveryDays, setDeliveryDays] = useState('');
  const [validityDays, setValidityDays] = useState('30');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [warrantyTerms, setWarrantyTerms] = useState('');
  const [notes, setNotes] = useState('');
  const [submitterName, setSubmitterName] = useState('');
  const [submitterEmail, setSubmitterEmail] = useState('');

  // Fetch RFQ vendor data by token
  const { data: rfqVendorData, isLoading, error } = useQuery({
    queryKey: ['rfq-vendor-portal', token],
    queryFn: async () => {
      if (!token) throw new Error('No token provided');

      // First get the rfq_vendor by token
      const { data: rfqVendor, error: vendorError } = await supabase
        .from('rfq_vendors')
        .select('*')
        .eq('submission_token', token)
        .single();

      if (vendorError) throw vendorError;
      if (!rfqVendor) throw new Error('Invalid or expired token');

      // Check if token is expired
      if (rfqVendor.token_expires_at && new Date(rfqVendor.token_expires_at) < new Date()) {
        throw new Error('This quotation link has expired');
      }

      // Check if already submitted
      if (rfqVendor.quotation_received) {
        throw new Error('Quotation already submitted');
      }

      // Get vendor details
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id, company_name_en, company_name_ar, email, phone, code')
        .eq('id', rfqVendor.vendor_id)
        .single();

      // Get RFQ details
      const { data: rfq } = await supabase
        .from('rfqs')
        .select('id, code, title_en, title_ar, description, procurement_type, project_id')
        .eq('id', rfqVendor.rfq_id)
        .single();

      // Get project if exists
      let project = null;
      if (rfq?.project_id) {
        const { data: projectData } = await supabase
          .from('projects')
          .select('name_en, name_ar')
          .eq('id', rfq.project_id)
          .single();
        project = projectData;
      }

      // Fetch RFQ items
      const { data: items, error: itemsError } = await supabase
        .from('rfq_items')
        .select('*')
        .eq('rfq_id', rfqVendor.rfq_id)
        .order('item_number');

      if (itemsError) throw itemsError;

      return { 
        rfqVendor, 
        vendor, 
        rfq: rfq ? { ...rfq, project } : null,
        items: items as RFQItem[] 
      };
    },
    enabled: !!token,
  });

  // Initialize quotation lines when items load
  useEffect(() => {
    if (rfqVendorData?.items) {
      setQuotationLines(
        rfqVendorData.items.map((item) => ({
          rfq_item_id: item.id,
          unit_price: 0,
          total_price: 0,
          notes: '',
        }))
      );
    }
  }, [rfqVendorData?.items]);

  // Calculate totals
  const subtotal = quotationLines.reduce((sum, line) => sum + (line.total_price || 0), 0);

  // Update line item
  const updateLine = (index: number, field: keyof QuotationLine, value: string | number) => {
    setQuotationLines((prev) => {
      const updated = [...prev];
      const item = rfqVendorData?.items[index];
      
      if (field === 'unit_price') {
        const unitPrice = Number(value) || 0;
        updated[index] = {
          ...updated[index],
          unit_price: unitPrice,
          total_price: unitPrice * (item?.quantity || 0),
        };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      
      return updated;
    });
  };

  // Submit quotation mutation
  const submitQuotation = useMutation({
    mutationFn: async () => {
      if (!rfqVendorData || !token) throw new Error('Invalid state');

      const { rfqVendor } = rfqVendorData;

      // Validate inputs
      if (!submitterName.trim()) throw new Error('Please enter your name');
      if (!submitterEmail.trim()) throw new Error('Please enter your email');
      if (quotationLines.some((line) => line.unit_price <= 0)) {
        throw new Error('Please enter valid prices for all items');
      }

      // Insert vendor prices
      const pricesToInsert = quotationLines.map((line) => ({
        rfq_vendor_id: rfqVendor.id,
        rfq_item_id: line.rfq_item_id,
        unit_price: line.unit_price,
        total_price: line.total_price,
        notes: line.notes || null,
      }));

      const { error: pricesError } = await supabase
        .from('rfq_vendor_prices')
        .insert(pricesToInsert);

      if (pricesError) throw pricesError;

      // Update rfq_vendor record
      const { error: updateError } = await supabase
        .from('rfq_vendors')
        .update({
          quotation_received: true,
          quotation_date: new Date().toISOString(),
          quotation_amount: subtotal,
          total_amount: subtotal,
          currency: currency,
          delivery_days: deliveryDays ? parseInt(deliveryDays) : null,
          validity_days: validityDays ? parseInt(validityDays) : null,
          payment_terms: paymentTerms || null,
          warranty_terms: warrantyTerms || null,
          notes: notes || null,
          submitted_at: new Date().toISOString(),
          submitted_by_name: submitterName,
          submitted_by_email: submitterEmail,
          vendor_response_date: new Date().toISOString(),
        })
        .eq('submission_token', token);

      if (updateError) throw updateError;

      return { success: true };
    },
    onSuccess: () => {
      toast.success('Quotation submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['rfq-vendor-portal', token] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Invalid Link</CardTitle>
            <CardDescription>
              No quotation token was provided. Please use the link from your email.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    const isAlreadySubmitted = errorMessage.includes('already submitted');
    
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            {isAlreadySubmitted ? (
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            ) : (
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            )}
            <CardTitle>
              {isAlreadySubmitted ? 'Already Submitted' : 'Link Error'}
            </CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!rfqVendorData) return null;

  const { rfqVendor, items, rfq, vendor } = rfqVendorData;

  // If already submitted successfully
  if (submitQuotation.isSuccess) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl">Thank You!</CardTitle>
            <CardDescription className="text-base">
              Your quotation for <strong>{rfq?.code}</strong> has been submitted successfully.
              <br /><br />
              We will review your submission and get back to you soon.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Submit Quotation</CardTitle>
                <CardDescription>RFQ Reference: {rfq?.code}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-sm">RFQ Title</Label>
                <p className="font-medium">{rfq?.title_en}</p>
              </div>
              {rfq?.project && (
                <div>
                  <Label className="text-muted-foreground text-sm">Project</Label>
                  <p className="font-medium">{rfq.project.name_en}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground text-sm">Vendor</Label>
                <p className="font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {vendor?.company_name_en}
                </p>
              </div>
            </div>
            {rfq?.description && (
              <div>
                <Label className="text-muted-foreground text-sm">Description</Label>
                <p className="text-sm">{rfq.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quotation Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Items</CardTitle>
            <CardDescription>Enter your prices for each item</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-20">Qty</TableHead>
                    <TableHead className="w-20">Unit</TableHead>
                    <TableHead className="w-32">Unit Price</TableHead>
                    <TableHead className="w-32">Total</TableHead>
                    <TableHead className="w-40">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.item_number}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.description_en}</p>
                          {item.specifications && (
                            <p className="text-xs text-muted-foreground mt-1">{item.specifications}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={quotationLines[index]?.unit_price || ''}
                          onChange={(e) => updateLine(index, 'unit_price', e.target.value)}
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {(quotationLines[index]?.total_price || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Notes..."
                          value={quotationLines[index]?.notes || ''}
                          onChange={(e) => updateLine(index, 'notes', e.target.value)}
                          className="w-full"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Subtotal */}
            <div className="flex justify-end mt-4 pt-4 border-t">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Subtotal</p>
                <p className="text-2xl font-bold">
                  {currency} {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Terms & Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Terms & Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency *</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryDays">Delivery Days</Label>
                <Input
                  id="deliveryDays"
                  type="number"
                  min="1"
                  placeholder="e.g., 14"
                  value={deliveryDays}
                  onChange={(e) => setDeliveryDays(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validityDays">Quotation Valid For (Days)</Label>
                <Input
                  id="validityDays"
                  type="number"
                  min="1"
                  placeholder="e.g., 30"
                  value={validityDays}
                  onChange={(e) => setValidityDays(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Payment Terms</Label>
                <Input
                  id="paymentTerms"
                  placeholder="e.g., Net 30, 50% advance"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="warrantyTerms">Warranty Terms</Label>
                <Input
                  id="warrantyTerms"
                  placeholder="e.g., 1 year warranty"
                  value={warrantyTerms}
                  onChange={(e) => setWarrantyTerms(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional terms, conditions, or notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submitter Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="submitterName">Your Name *</Label>
                <Input
                  id="submitterName"
                  placeholder="Enter your name"
                  value={submitterName}
                  onChange={(e) => setSubmitterName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="submitterEmail">Your Email *</Label>
                <Input
                  id="submitterEmail"
                  type="email"
                  placeholder="Enter your email"
                  value={submitterEmail}
                  onChange={(e) => setSubmitterEmail(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            size="lg"
            onClick={() => submitQuotation.mutate()}
            disabled={submitQuotation.isPending}
            className="gap-2"
          >
            {submitQuotation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Submit Quotation
          </Button>
        </div>
      </div>
    </div>
  );
}
