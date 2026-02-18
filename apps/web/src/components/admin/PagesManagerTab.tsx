"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { pagesApi } from "@/lib/api";
import {
  Edit,
  Eye,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { useEffect, useState } from "react";

interface StaticPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  metaDescription: string | null;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

const emptyPage: Omit<StaticPage, "id" | "createdAt" | "updatedAt"> = {
  slug: "",
  title: "",
  content: "",
  metaDescription: "",
  isPublished: false,
  sortOrder: 0,
};

export function PagesManagerTab() {
  const [pages, setPages] = useState<StaticPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<
    Partial<StaticPage> & { isNew?: boolean }
  >({});
  const [pageToDelete, setPageToDelete] = useState<StaticPage | null>(null);

  const fetchPages = async () => {
    setLoading(true);
    try {
      const res = await pagesApi.list();
      setPages(res.data || []);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to load",
        description: "Could not load pages.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await pagesApi.seed();
      toast({
        title: "Seeded",
        description: "Default pages have been created/updated.",
      });
      fetchPages();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Seed Failed",
        description: "Could not seed default pages.",
      });
    } finally {
      setSeeding(false);
    }
  };

  const handleCreate = () => {
    setEditingPage({ ...emptyPage, isNew: true });
    setEditDialogOpen(true);
  };

  const handleEdit = (page: StaticPage) => {
    setEditingPage({ ...page, isNew: false });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingPage.title || !editingPage.slug || !editingPage.content) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Title, slug, and content are required.",
      });
      return;
    }

    setSaving(true);
    try {
      if (editingPage.isNew) {
        await pagesApi.create({
          slug: editingPage.slug!,
          title: editingPage.title!,
          content: editingPage.content!,
          metaDescription: editingPage.metaDescription || undefined,
          isPublished: editingPage.isPublished || false,
        });
        toast({ title: "Created", description: "Page created successfully." });
      } else {
        await pagesApi.update(editingPage.id!, {
          slug: editingPage.slug,
          title: editingPage.title,
          content: editingPage.content,
          metaDescription: editingPage.metaDescription,
          isPublished: editingPage.isPublished,
          sortOrder: editingPage.sortOrder,
        });
        toast({ title: "Updated", description: "Page updated successfully." });
      }
      setEditDialogOpen(false);
      fetchPages();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description:
          error?.response?.data?.message || "Could not save page.",
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (page: StaticPage) => {
    setPageToDelete(page);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!pageToDelete) return;
    setDeleting(pageToDelete.id);
    try {
      await pagesApi.delete(pageToDelete.id);
      toast({ title: "Deleted", description: "Page deleted successfully." });
      setDeleteDialogOpen(false);
      fetchPages();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: "Could not delete page.",
      });
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                CMS Pages
              </CardTitle>
              <CardDescription>
                Manage static pages like Privacy Policy, Terms, Refund Policy,
                Partner, Seller Guide, Pricing, and Support.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSeed}
                disabled={seeding}
              >
                {seeding ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Seed Defaults
              </Button>
              <Button size="sm" onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                New Page
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {pages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No pages found.</p>
              <p className="text-sm mt-1">
                Click &quot;Seed Defaults&quot; to create default pages, or
                &quot;New Page&quot; to create one manually.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {pages.map((page) => (
                <div
                  key={page.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{page.title}</span>
                      <Badge
                        variant="outline"
                        className="text-xs font-mono"
                      >
                        /{page.slug}
                      </Badge>
                      {page.isPublished ? (
                        <Badge
                          variant="default"
                          className="text-xs bg-green-600"
                        >
                          Published
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Draft
                        </Badge>
                      )}
                    </div>
                    {page.metaDescription && (
                      <p className="text-sm text-muted-foreground mt-1 truncate max-w-lg">
                        {page.metaDescription}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Updated{" "}
                      {new Date(page.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                    >
                      <a
                        href={`/${page.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(page)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => confirmDelete(page)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit / Create Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPage.isNew ? "Create New Page" : `Edit: ${editingPage.title}`}
            </DialogTitle>
            <DialogDescription>
              {editingPage.isNew
                ? "Create a new static page. Use HTML for content formatting."
                : "Edit page content. Use HTML for formatting."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={editingPage.title || ""}
                  onChange={(e) =>
                    setEditingPage({ ...editingPage, title: e.target.value })
                  }
                  placeholder="Privacy Policy"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug *</Label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">/</span>
                  <Input
                    value={editingPage.slug || ""}
                    onChange={(e) =>
                      setEditingPage({
                        ...editingPage,
                        slug: e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, "-")
                          .replace(/-+/g, "-"),
                      })
                    }
                    placeholder="privacy"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Meta Description</Label>
              <Input
                value={editingPage.metaDescription || ""}
                onChange={(e) =>
                  setEditingPage({
                    ...editingPage,
                    metaDescription: e.target.value,
                  })
                }
                placeholder="Brief description for search engines..."
              />
            </div>

            <div className="space-y-2">
              <Label>Content (HTML) *</Label>
              <Textarea
                value={editingPage.content || ""}
                onChange={(e) =>
                  setEditingPage({ ...editingPage, content: e.target.value })
                }
                placeholder="<h1>Page Title</h1><p>Content here...</p>"
                rows={16}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Use HTML tags: &lt;h1&gt;, &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;,
                &lt;ol&gt;, &lt;li&gt;, &lt;strong&gt;, &lt;em&gt;,
                &lt;a href=&quot;...&quot;&gt;, &lt;img src=&quot;...&quot;&gt;
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={editingPage.isPublished || false}
                  onCheckedChange={(v) =>
                    setEditingPage({ ...editingPage, isPublished: v })
                  }
                />
                <Label>Published</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={editingPage.sortOrder || 0}
                  onChange={(e) =>
                    setEditingPage({
                      ...editingPage,
                      sortOrder: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-20"
                />
              </div>
            </div>

            {/* Live Preview */}
            {editingPage.content && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </Label>
                <div className="border rounded-lg p-6 bg-white dark:bg-gray-900 max-h-64 overflow-y-auto">
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: editingPage.content,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {editingPage.isNew ? "Create Page" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Page</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{pageToDelete?.title}&quot;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!!deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
