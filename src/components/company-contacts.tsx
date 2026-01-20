'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Star, Mail, Phone, User } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import type { Contact } from '@/types/database';

interface CompanyContactsProps {
  companyId: string;
  isAdmin?: boolean;
}

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  role: string;
  is_primary: boolean;
  is_billing_contact: boolean;
  is_active: boolean;
  notes: string;
}

const INITIAL_FORM_DATA: ContactFormData = {
  name: '',
  email: '',
  phone: '',
  role: '',
  is_primary: false,
  is_billing_contact: false,
  is_active: true,
  notes: '',
};

const COMMON_ROLES = [
  'Owner',
  'CEO',
  'Marketing Manager',
  'Office Manager',
  'Operations Manager',
  'Sales Manager',
  'Accountant',
  'Assistant',
  'Other',
];

export function CompanyContacts({ companyId, isAdmin = false }: CompanyContactsProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deleteContact, setDeleteContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState<ContactFormData>(INITIAL_FORM_DATA);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, [companyId]);

  const fetchContacts = async () => {
    try {
      const response = await fetch(`/api/companies/${companyId}/contacts`);
      if (response.ok) {
        const data = await response.json();
        setContacts(data);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (contact?: Contact) => {
    if (contact) {
      setEditingContact(contact);
      setFormData({
        name: contact.name,
        email: contact.email || '',
        phone: contact.phone || '',
        role: contact.role || '',
        is_primary: contact.is_primary,
        is_billing_contact: contact.is_billing_contact,
        is_active: contact.is_active,
        notes: contact.notes || '',
      });
    } else {
      setEditingContact(null);
      setFormData(INITIAL_FORM_DATA);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingContact(null);
    setFormData(INITIAL_FORM_DATA);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...formData,
        email: formData.email || null,
        phone: formData.phone || null,
        role: formData.role || null,
        notes: formData.notes || null,
      };

      const url = editingContact
        ? `/api/companies/${companyId}/contacts/${editingContact.id}`
        : `/api/companies/${companyId}/contacts`;

      const response = await fetch(url, {
        method: editingContact ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const savedContact = await response.json();
        if (editingContact) {
          // If setting as primary, update other contacts
          if (savedContact.is_primary) {
            setContacts(contacts.map(c =>
              c.id === savedContact.id
                ? savedContact
                : { ...c, is_primary: false }
            ));
          } else {
            setContacts(contacts.map(c => c.id === savedContact.id ? savedContact : c));
          }
          toast.success('Contact updated successfully');
        } else {
          // If new contact is primary, update existing contacts
          if (savedContact.is_primary) {
            setContacts([savedContact, ...contacts.map(c => ({ ...c, is_primary: false }))]);
          } else {
            setContacts([savedContact, ...contacts]);
          }
          toast.success('Contact created successfully');
        }
        handleCloseDialog();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save contact');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteContact) return;

    try {
      const response = await fetch(
        `/api/companies/${companyId}/contacts/${deleteContact.id}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setContacts(contacts.filter(c => c.id !== deleteContact.id));
        toast.success('Contact deleted successfully');
      } else {
        toast.error('Failed to delete contact');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setDeleteContact(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
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

  const primaryContact = contacts.find(c => c.is_primary);
  const activeContacts = contacts.filter(c => c.is_active).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Contacts</CardTitle>
          <CardDescription>
            {activeContacts} contact{activeContacts !== 1 ? 's' : ''}
            {primaryContact && ` | Primary: ${primaryContact.name}`}
          </CardDescription>
        </div>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingContact ? 'Edit Contact' : 'Add New Contact'}
                </DialogTitle>
                <DialogDescription>
                  {editingContact
                    ? 'Update contact details below'
                    : 'Fill in the contact details below'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Smith"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@company.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="e.g., Owner, Marketing Manager"
                    list="role-suggestions"
                  />
                  <datalist id="role-suggestions">
                    {COMMON_ROLES.map(role => (
                      <option key={role} value={role} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="is_primary">Primary Contact</Label>
                      <p className="text-sm text-muted-foreground">
                        Main point of contact for this company
                      </p>
                    </div>
                    <Switch
                      id="is_primary"
                      checked={formData.is_primary}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_primary: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="is_billing_contact">Billing Contact</Label>
                      <p className="text-sm text-muted-foreground">
                        Receives invoices and billing information
                      </p>
                    </div>
                    <Switch
                      id="is_billing_contact"
                      checked={formData.is_billing_contact}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_billing_contact: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="is_active">Active</Label>
                      <p className="text-sm text-muted-foreground">
                        Contact is currently active
                      </p>
                    </div>
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_active: checked })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Add any additional notes about this contact..."
                    rows={3}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : editingContact ? 'Update' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>

      <CardContent>
        {contacts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No contacts found
          </div>
        ) : (
          <div className="space-y-4">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className={`flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors ${
                  !contact.is_active ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{contact.name}</h4>
                      {contact.is_primary && (
                        <Badge variant="default" className="bg-amber-100 text-amber-800">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          Primary
                        </Badge>
                      )}
                      {contact.is_billing_contact && (
                        <Badge variant="outline">Billing</Badge>
                      )}
                      {!contact.is_active && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {contact.role && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {contact.role}
                        </span>
                      )}
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="flex items-center gap-1 hover:text-primary"
                        >
                          <Mail className="h-3 w-3" />
                          {contact.email}
                        </a>
                      )}
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone}`}
                          className="flex items-center gap-1 hover:text-primary"
                        >
                          <Phone className="h-3 w-3" />
                          {contact.phone}
                        </a>
                      )}
                    </div>
                    {contact.notes && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {contact.notes}
                      </p>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenDialog(contact)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setDeleteContact(contact)}
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

      <AlertDialog open={!!deleteContact} onOpenChange={() => setDeleteContact(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteContact?.name}"? This action cannot be undone.
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
