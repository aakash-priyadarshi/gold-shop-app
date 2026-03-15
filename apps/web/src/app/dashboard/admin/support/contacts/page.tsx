'use client';

import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { AdminGuard } from '@/components/auth/RouteGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash, Globe, Phone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supportApi } from '@/lib/api';

interface SupportContact {
  id: string;
  country: string;
  countryFlag: string;
  type: string;
  value: string;
  isActive: boolean;
}

export default function ContactsManagementPage() {
  const [contacts, setContacts] = useState<SupportContact[]>([]);
  const [loading, setLoading] = useState(true);

  // New config state
  const [country, setCountry] = useState('');
  const [countryFlag, setCountryFlag] = useState('');
  const [type, setType] = useState('PHONE');
  const [value, setValue] = useState('');

  useEffect(() => {
    loadContacts();
  }, []);

  async function loadContacts() {
    setLoading(true);
    try {
      const res = await supportApi.getContacts();
      setContacts(res.data);
    } catch (e) {
      console.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!country || !countryFlag || !value) return;
    try {
      await supportApi.createContact({ country, countryFlag, type, value, isActive: true });
      setCountry('');
      setCountryFlag('');
      setValue('');
      loadContacts();
    } catch (e) {
      console.error('Error creating contact');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    try {
      await supportApi.deleteContact(id);
      loadContacts();
    } catch (e) {
      console.error('Error deleting contact');
    }
  }

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Global Contacts Directory</h1>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/dashboard/admin/support'}>
              &larr; Back to Support
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Add New Contact Number</CardTitle>
              <CardDescription>This number will immediately go live on the public support page.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3 flex-wrap">
                 <div>
                    <p className="text-sm font-medium mb-1">Country Name</p>
                    <Input placeholder="e.g. India" value={country} onChange={(e) => setCountry(e.target.value)} />
                 </div>
                 <div>
                    <p className="text-sm font-medium mb-1">Flag Emoji</p>
                    <Input placeholder="e.g. 🇮🇳" className="w-24" value={countryFlag} onChange={(e) => setCountryFlag(e.target.value)} />
                 </div>
                 <div>
                    <p className="text-sm font-medium mb-1">Type</p>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      value={type} 
                      onChange={(e) => setType(e.target.value)}>
                       <option value="PHONE">Phone</option>
                       <option value="WHATSAPP">WhatsApp</option>
                       <option value="EMAIL">Email</option>
                    </select>
                 </div>
                 <div className="flex-1 min-w-[200px]">
                    <p className="text-sm font-medium mb-1">Value / Number</p>
                    <Input placeholder="e.g. +91 1800 123 4567" value={value} onChange={(e) => setValue(e.target.value)} />
                 </div>
                 <Button onClick={handleCreate} disabled={!country || !value}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Entry
                 </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
             <CardHeader>
                <CardTitle>Active Contacts Map</CardTitle>
                <CardDescription>Manage region-specific helplines shown to users.</CardDescription>
             </CardHeader>
             <CardContent>
                {loading ? (
                  <p>Loading...</p>
                ) : contacts.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No contacts have been added. The fallback defaults will be used.</p>
                ) : (
                  <div className="divide-y border rounded-lg overflow-hidden">
                     {contacts.map((c) => (
                       <div key={c.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition">
                          <div className="flex items-center gap-3">
                             <div className="h-10 w-10 bg-secondary rounded-full flex items-center justify-center text-lg">
                                {c.countryFlag}
                             </div>
                             <div>
                                <p className="font-semibold">{c.country}</p>
                                <div className="flex items-center text-sm text-muted-foreground gap-1">
                                   <Phone className="h-3 w-3" />
                                   <span>{c.type}</span> &bull; <span>{c.value}</span>
                                </div>
                             </div>
                          </div>
                          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(c.id)}>
                             <Trash className="h-4 w-4" />
                          </Button>
                       </div>
                     ))}
                  </div>
                )}
             </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
