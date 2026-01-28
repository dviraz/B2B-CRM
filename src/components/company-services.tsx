'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Calendar, DollarSign, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { ClientService, ServiceType, ServiceStatus, BillingCycle } from '@/types/database';

interface CompanyServicesProps {
  companyId: string;
  isAdmin?: boolean;
}

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  subscription: 'Subscription',
  one_time: 'One-Time',
};

const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  cancelled: 'Cancelled',
  completed: 'Completed',
  pending: 'Pending',
};

const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  one_time: 'One-Time',
};

const STATUS_COLORS: Record<ServiceStatus, string> = {
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
  completed: 'bg-blue-100 text-blue-800',
  pending: 'bg-gray-100 text-gray-800',
};

interface ServiceFormData {
  service_name: string;
  service_type: ServiceType;
  status: ServiceStatus;
  price: string;
  billing_cycle: BillingCycle | '';
  start_date: string;
  end_date: string;
  renewal_date: string;
  notes: string;
}

const INITIAL_FORM_DATA: ServiceFormData = {
  service_name: '',
  service_type: 'subscription',
  status: 'active',
  price: '',
  billing_cycle: 'monthly',
  start_date: '',
  end_date: '',
  renewal_date: '',
  notes: '',
};

export function CompanyServices({ companyId, isAdmin = false }: CompanyServicesProps) {
  const [services, setServices] = useState<ClientService[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ClientService | null>(null);
  const [deleteService, setDeleteService] = useState<ClientService | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>(INITIAL_FORM_DATA);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchServices();
  }, [companyId]);

  const fetchServices = async () => {
    try {
      const response = await fetch(`/api/companies/${companyId}/services`);
      if (response.ok) {
        const data = await response.json();
        setServices(data);
      } else {
        toast.error('Failed to load services');
      }
    } catch {
      toast.error('Error fetching services');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (service?: ClientService) => {
    if (service) {
      setEditingService(service);
      setFormData({
        service_name: service.service_name,
        service_type: service.service_type,
        status: service.status,
        price: service.price?.toString() || '',
        billing_cycle: service.billing_cycle || '',
        start_date: service.start_date || '',
        end_date: service.end_date || '',
        renewal_date: service.renewal_date || '',
        notes: service.notes || '',
      });
    } else {
      setEditingService(null);
      setFormData(INITIAL_FORM_DATA);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingService(null);
    setFormData(INITIAL_FORM_DATA);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...formData,
        price: formData.price ? parseFloat(formData.price) : null,
        billing_cycle: formData.billing_cycle || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        renewal_date: formData.renewal_date || null,
        notes: formData.notes || null,
      };

      const url = editingService
        ? `/api/companies/${companyId}/services/${editingService.id}`
        : `/api/companies/${companyId}/services`;

      const response = await fetch(url, {
        method: editingService ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const savedService = await response.json();
        if (editingService) {
          setServices(services.map(s => s.id === savedService.id ? savedService : s));
          toast.success('Service updated successfully');
        } else {
          setServices([savedService, ...services]);
          toast.success('Service created successfully');
        }
        handleCloseDialog();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save service');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteService) return;

    try {
      const response = await fetch(
        `/api/companies/${companyId}/services/${deleteService.id}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setServices(services.filter(s => s.id !== deleteService.id));
        toast.success('Service deleted successfully');
      } else {
        toast.error('Failed to delete service');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setDeleteService(null);
    }
  };

  const calculateMRR = () => {
    return services
      .filter(s => s.status === 'active' && s.service_type === 'subscription' && s.price)
      .reduce((total, s) => {
        const price = s.price || 0;
        switch (s.billing_cycle) {
          case 'monthly': return total + price;
          case 'quarterly': return total + price / 3;
          case 'yearly': return total + price / 12;
          default: return total;
        }
      }, 0);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const mrr = calculateMRR();
  const activeServices = services.filter(s => s.status === 'active').length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Services</CardTitle>
          <CardDescription>
            {activeServices} active service{activeServices !== 1 ? 's' : ''} | MRR: ${mrr.toFixed(2)}
          </CardDescription>
        </div>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Service
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingService ? 'Edit Service' : 'Add New Service'}
                </DialogTitle>
                <DialogDescription>
                  {editingService
                    ? 'Update service details below'
                    : 'Fill in the service details below'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="service_name">Service Name *</Label>
                  <Input
                    id="service_name"
                    value={formData.service_name}
                    onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                    placeholder="e.g., SEO Package, Social Media Management"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="service_type">Service Type *</Label>
                    <Select
                      value={formData.service_type}
                      onValueChange={(value: ServiceType) =>
                        setFormData({ ...formData, service_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(SERVICE_TYPE_LABELS) as ServiceType[]).map((type) => (
                          <SelectItem key={type} value={type}>
                            {SERVICE_TYPE_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: ServiceStatus) =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(SERVICE_STATUS_LABELS) as ServiceStatus[]).map((status) => (
                          <SelectItem key={status} value={status}>
                            {SERVICE_STATUS_LABELS[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="billing_cycle">Billing Cycle</Label>
                    <Select
                      value={formData.billing_cycle}
                      onValueChange={(value: BillingCycle | '') =>
                        setFormData({ ...formData, billing_cycle: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select cycle" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(BILLING_CYCLE_LABELS) as BillingCycle[]).map((cycle) => (
                          <SelectItem key={cycle} value={cycle}>
                            {BILLING_CYCLE_LABELS[cycle]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="renewal_date">Renewal Date</Label>
                    <Input
                      id="renewal_date"
                      type="date"
                      value={formData.renewal_date}
                      onChange={(e) => setFormData({ ...formData, renewal_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Add any additional notes..."
                    rows={3}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : editingService ? 'Update' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>

      <CardContent>
        {services.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No services found
          </div>
        ) : (
          <div className="space-y-4">
            {services.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium truncate">{service.service_name}</h4>
                    <Badge variant="outline" className={STATUS_COLORS[service.status]}>
                      {SERVICE_STATUS_LABELS[service.status]}
                    </Badge>
                    <Badge variant="secondary">
                      {SERVICE_TYPE_LABELS[service.service_type]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {service.price && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {service.price.toFixed(2)}
                        {service.billing_cycle && ` / ${service.billing_cycle}`}
                      </span>
                    )}
                    {service.start_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Started: {new Date(service.start_date).toLocaleDateString()}
                      </span>
                    )}
                    {service.renewal_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Renewal: {new Date(service.renewal_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {service.notes && (
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {service.notes}
                    </p>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenDialog(service)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setDeleteService(service)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!deleteService} onOpenChange={() => setDeleteService(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteService?.service_name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
