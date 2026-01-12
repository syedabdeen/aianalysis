import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { InventoryItem, InventoryCategory, StockMovement, InventoryItemFormData, StockAdjustmentFormData } from '@/types/inventory';

export function useInventoryItems(filters?: {
  search?: string;
  category_id?: string;
  stock_status?: 'all' | 'low' | 'out' | 'overstock';
  is_active?: boolean;
}) {
  return useQuery({
    queryKey: ['inventory-items', filters],
    queryFn: async () => {
      let query = supabase
        .from('inventory_items')
        .select(`
          *,
          category:inventory_categories(id, code, name_en, name_ar)
        `)
        .order('created_at', { ascending: false });

      if (filters?.search) {
        query = query.or(`name_en.ilike.%${filters.search}%,name_ar.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);
      }

      if (filters?.category_id) {
        query = query.eq('category_id', filters.category_id);
      }

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      const { data, error } = await query;
      if (error) throw error;

      let items = data as InventoryItem[];

      // Apply stock status filter
      if (filters?.stock_status === 'low') {
        items = items.filter(i => i.current_stock > 0 && i.current_stock <= i.min_stock_level);
      } else if (filters?.stock_status === 'out') {
        items = items.filter(i => i.current_stock <= 0);
      } else if (filters?.stock_status === 'overstock') {
        items = items.filter(i => i.max_stock_level && i.current_stock > i.max_stock_level);
      }

      return items;
    },
  });
}

export function useInventoryItem(id: string | undefined) {
  return useQuery({
    queryKey: ['inventory-item', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          *,
          category:inventory_categories(id, code, name_en, name_ar)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as InventoryItem | null;
    },
    enabled: !!id,
  });
}

export function useInventoryCategories() {
  return useQuery({
    queryKey: ['inventory-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_categories')
        .select('*')
        .eq('is_active', true)
        .order('name_en');

      if (error) throw error;
      return data as InventoryCategory[];
    },
  });
}

export function useCreateMaterial() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (formData: InventoryItemFormData & { category_name?: string }) => {
      // Get category name for code generation
      let categoryName = formData.category_name;
      
      if (!categoryName && formData.category_id) {
        const { data: categoryData } = await supabase
          .from('inventory_categories')
          .select('name_en')
          .eq('id', formData.category_id)
          .single();
        categoryName = categoryData?.name_en;
      }

      // Get new material code using format: MAT + CAT(3) + 6-digit global sequence
      const { data: codeData, error: codeError } = await supabase
        .rpc('get_new_material_code', { _category_name: categoryName || null });

      if (codeError) throw codeError;

      const { data: userData } = await supabase.auth.getUser();

      // Remove category_name from data before insert
      const { category_name: _, ...insertData } = formData as any;

      const { data, error } = await supabase
        .from('inventory_items')
        .insert({
          code: codeData,
          ...insertData,
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      toast({
        title: 'Material Created',
        description: 'Material has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateMaterial() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InventoryItemFormData> }) => {
      const { error } = await supabase
        .from('inventory_items')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-item'] });
      toast({
        title: 'Material Updated',
        description: 'Material has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useStockMovements(itemId?: string) {
  return useQuery({
    queryKey: ['stock-movements', itemId],
    queryFn: async () => {
      let query = supabase
        .from('stock_movements')
        .select(`
          *,
          inventory_item:inventory_items(id, code, name_en, name_ar)
        `)
        .order('created_at', { ascending: false });

      if (itemId) {
        query = query.eq('inventory_item_id', itemId);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return (data || []) as unknown as StockMovement[];
    },
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (formData: StockAdjustmentFormData) => {
      // Get current stock
      const { data: item, error: itemError } = await supabase
        .from('inventory_items')
        .select('current_stock')
        .eq('id', formData.inventory_item_id)
        .single();

      if (itemError) throw itemError;

      let newBalance: number;
      let quantity: number;

      if (formData.adjustment_type === 'add') {
        quantity = formData.quantity;
        newBalance = item.current_stock + formData.quantity;
      } else if (formData.adjustment_type === 'subtract') {
        quantity = -formData.quantity;
        newBalance = item.current_stock - formData.quantity;
      } else {
        quantity = formData.quantity - item.current_stock;
        newBalance = formData.quantity;
      }

      const { data: userData } = await supabase.auth.getUser();

      // Create stock movement
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          inventory_item_id: formData.inventory_item_id,
          movement_type: 'adjustment',
          quantity,
          balance_after: newBalance,
          reference_type: 'Manual',
          notes: `${formData.reason}: ${formData.notes || ''}`,
          project_id: formData.project_id || null,
          cost_center_id: formData.cost_center_id || null,
          warehouse_location: formData.warehouse_location || null,
          performed_by: userData.user?.id,
        });

      if (movementError) throw movementError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-item'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      toast({
        title: 'Stock Adjusted',
        description: 'Stock has been adjusted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { code: string; name_en: string; name_ar: string; description?: string }) => {
      const { error } = await supabase
        .from('inventory_categories')
        .insert(data);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-categories'] });
      toast({
        title: 'Category Created',
        description: 'Category has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useInventoryStats() {
  return useQuery({
    queryKey: ['inventory-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, current_stock, min_stock_level, max_stock_level, unit_price, is_active');

      if (error) throw error;

      const items = data || [];
      const activeItems = items.filter(i => i.is_active);
      const lowStock = activeItems.filter(i => i.current_stock > 0 && i.current_stock <= i.min_stock_level);
      const outOfStock = activeItems.filter(i => i.current_stock <= 0);
      const totalValue = activeItems.reduce((sum, i) => sum + (i.current_stock * i.unit_price), 0);

      return {
        totalItems: activeItems.length,
        lowStockCount: lowStock.length,
        outOfStockCount: outOfStock.length,
        totalValue,
      };
    },
  });
}
