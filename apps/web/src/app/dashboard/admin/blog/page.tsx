"use client";

import { AdminGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
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
import { blogApi } from "@/lib/api";
import {
  AlertCircle,
  ArrowUpRight,
  Bold,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Globe,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Minus,
  MousePointerClick,
  Palette,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Star,
  Tag,
  Target,
  Trash2,
  Type,
  Underline,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";

/* ────────────────────────────────────────────────────────────── */
/*  Types                                                         */
/* ────────────────────────────────────────────────────────────── */

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string[];
  canonicalUrl: string | null;
  category: string;
  tags: string[];
  author: string;
  authorRole: string | null;
  readTime: string | null;
  isPublished: boolean;
  featured: boolean;
  publishedAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

const empty: Omit<BlogPost, "id" | "createdAt" | "updatedAt"> & {
  isNew?: boolean;
} = {
  slug: "",
  title: "",
  excerpt: "",
  content: "",
  coverImage: "",
  metaTitle: "",
  metaDescription: "",
  metaKeywords: [],
  canonicalUrl: "",
  category: "General",
  tags: [],
  author: "Orivraa Team",
  authorRole: "",
  readTime: "",
  isPublished: false,
  featured: false,
  publishedAt: null,
  sortOrder: 0,
};

const CATEGORIES = [
  "Software Guide",
  "Software Comparison",
  "Business Guide",
  "Tax & Compliance",
  "Industry News",
  "Product Updates",
  "General",
];

/* ────────────────────────────────────────────────────────────── */
/*  SEO Analysis helper                                           */
/* ────────────────────────────────────────────────────────────── */

function analyseSeo(post: {
  title: string;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string[];
  slug: string;
  content: string;
  excerpt: string | null;
}) {
  const issues: { type: "error" | "warning" | "success"; msg: string }[] = [];
  const title = post.metaTitle || post.title;
  const desc = post.metaDescription || "";
  const contentText = post.content.replace(/<[^>]+>/g, "");

  // Title length (50-60 chars ideal)
  if (!title) {
    issues.push({ type: "error", msg: "Title is empty" });
  } else if (title.length < 30) {
    issues.push({
      type: "warning",
      msg: `Title is too short (${title.length} chars) — aim for 50-60`,
    });
  } else if (title.length > 70) {
    issues.push({
      type: "warning",
      msg: `Title is too long (${title.length} chars) — stay under 60 for best display`,
    });
  } else {
    issues.push({
      type: "success",
      msg: `Title length is good (${title.length} chars)`,
    });
  }

  // Meta description (120-160 chars ideal)
  if (!desc) {
    issues.push({ type: "error", msg: "Meta description is empty" });
  } else if (desc.length < 100) {
    issues.push({
      type: "warning",
      msg: `Meta description is short (${desc.length} chars) — aim for 120-160`,
    });
  } else if (desc.length > 170) {
    issues.push({
      type: "warning",
      msg: `Meta description is long (${desc.length} chars) — may be truncated`,
    });
  } else {
    issues.push({
      type: "success",
      msg: `Meta description length is good (${desc.length} chars)`,
    });
  }

  // Slug
  if (!post.slug) {
    issues.push({ type: "error", msg: "URL slug is empty" });
  } else if (/[A-Z\s]/.test(post.slug)) {
    issues.push({
      type: "warning",
      msg: "Slug should be lowercase with hyphens only",
    });
  } else {
    issues.push({ type: "success", msg: "URL slug looks good" });
  }

  // Keywords in title
  if (post.metaKeywords.length === 0) {
    issues.push({ type: "warning", msg: "No focus keywords set" });
  } else {
    const titleLower = title.toLowerCase();
    const inTitle = post.metaKeywords.filter((k) =>
      titleLower.includes(k.toLowerCase()),
    );
    if (inTitle.length === 0) {
      issues.push({
        type: "warning",
        msg: "None of your focus keywords appear in the title",
      });
    } else {
      issues.push({
        type: "success",
        msg: `${inTitle.length} keyword(s) found in title`,
      });
    }
  }

  // Content length
  const wordCount = contentText.trim().split(/\s+/).length;
  if (wordCount < 100) {
    issues.push({
      type: "error",
      msg: `Content is very short (${wordCount} words) — aim for 800+ for SEO`,
    });
  } else if (wordCount < 500) {
    issues.push({
      type: "warning",
      msg: `Content is short (${wordCount} words) — longer content ranks better`,
    });
  } else {
    issues.push({
      type: "success",
      msg: `Content length is good (${wordCount} words)`,
    });
  }

  // Headings
  const hasH2 = /<h2/i.test(post.content);
  if (!hasH2) {
    issues.push({
      type: "warning",
      msg: "No H2 headings found — add subheadings for readability",
    });
  } else {
    issues.push({ type: "success", msg: "H2 headings present" });
  }

  // Images
  const imgCount = (post.content.match(/<img/gi) || []).length;
  if (imgCount === 0) {
    issues.push({
      type: "warning",
      msg: "No images in content — visuals improve engagement",
    });
  } else {
    issues.push({
      type: "success",
      msg: `${imgCount} image(s) found in content`,
    });
  }

  // Internal links
  const internalLinks = (post.content.match(/href=["']\/[^"']*/gi) || []).length;
  if (internalLinks === 0) {
    issues.push({
      type: "warning",
      msg: "No internal links — link to other pages for SEO",
    });
  } else {
    issues.push({
      type: "success",
      msg: `${internalLinks} internal link(s) found`,
    });
  }

  // Excerpt
  if (!post.excerpt) {
    issues.push({
      type: "warning",
      msg: "Excerpt is empty — used for blog listing cards",
    });
  } else {
    issues.push({ type: "success", msg: "Excerpt is set" });
  }

  const score = Math.round(
    (issues.filter((i) => i.type === "success").length / issues.length) * 100,
  );

  return { issues, score, wordCount };
}

/* ────────────────────────────────────────────────────────────── */
/*  Keyword Density Analyser                                      */
/* ────────────────────────────────────────────────────────────── */

function analyseKeywordDensity(
  content: string,
  keywords: string[],
): { keyword: string; count: number; density: string }[] {
  const text = content.replace(/<[^>]+>/g, "").toLowerCase();
  const totalWords = text.trim().split(/\s+/).length;
  if (totalWords === 0 || keywords.length === 0) return [];

  return keywords.map((kw) => {
    const kwLower = kw.toLowerCase();
    const regex = new RegExp(kwLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const matches = text.match(regex);
    const count = matches ? matches.length : 0;
    const density = totalWords > 0 ? ((count / totalWords) * 100).toFixed(2) : "0.00";
    return { keyword: kw, count, density };
  });
}

/* ────────────────────────────────────────────────────────────── */
/*  Reading Time Calculator                                       */
/* ────────────────────────────────────────────────────────────── */

function calcReadTime(html: string): string {
  const text = html.replace(/<[^>]+>/g, "");
  const words = text.trim().split(/\s+/).length;
  const mins = Math.max(1, Math.ceil(words / 200));
  return `${mins} min read`;
}

/* ────────────────────────────────────────────────────────────── */
/*  Slug Generator                                                */
/* ────────────────────────────────────────────────────────────── */

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/* ────────────────────────────────────────────────────────────── */
/*  MAIN COMPONENT                                                */
/* ────────────────────────────────────────────────────────────── */

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<
    Partial<BlogPost> & { isNew?: boolean }
  >({});
  const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showSeoPanel, setShowSeoPanel] = useState(true);
  const [textColor, setTextColor] = useState("#C9A227");
  const [tagsInput, setTagsInput] = useState("");
  const [keywordsInput, setKeywordsInput] = useState("");
  const [editorTab, setEditorTab] = useState<"write" | "seo" | "settings">(
    "write",
  );
  const contentRef = useRef<HTMLTextAreaElement>(null);

  /* ── Fetch ─────────────────────────────────────────────── */
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await blogApi.adminList();
      setPosts(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch blog posts",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  /* ── Editor toolbar helpers ──────────────────────────── */
  const wrapSelection = (before: string, after: string = "") => {
    const ta = contentRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = editingPost.content || "";
    const selected = text.substring(start, end);
    const newContent =
      text.substring(0, start) +
      before +
      (selected || "text") +
      (after || before) +
      text.substring(end);
    setEditingPost({ ...editingPost, content: newContent });
    setTimeout(() => {
      ta.focus();
      const newStart = start + before.length;
      ta.setSelectionRange(
        newStart,
        newStart + (selected.length || 4),
      );
    }, 0);
  };

  const insertSnippet = (snippet: string) => {
    const ta = contentRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const text = editingPost.content || "";
    const newContent =
      text.substring(0, pos) + snippet + text.substring(pos);
    setEditingPost({ ...editingPost, content: newContent });
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(
        pos + snippet.length,
        pos + snippet.length,
      );
    }, 0);
  };

  /* ── CRUD ──────────────────────────────────────────────── */
  const handleCreate = () => {
    setEditingPost({ ...empty, isNew: true });
    setTagsInput("");
    setKeywordsInput("");
    setEditorTab("write");
    setShowPreview(false);
    setEditDialogOpen(true);
  };

  const handleEdit = (post: BlogPost) => {
    setEditingPost({ ...post });
    setTagsInput(post.tags.join(", "));
    setKeywordsInput(post.metaKeywords.join(", "));
    setEditorTab("write");
    setShowPreview(false);
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingPost.title || !editingPost.slug) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Title and slug are required",
      });
      return;
    }

    setSaving(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const metaKeywords = keywordsInput
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);

      const payload = {
        slug: editingPost.slug,
        title: editingPost.title,
        content: editingPost.content || "",
        excerpt: editingPost.excerpt || undefined,
        coverImage: editingPost.coverImage || undefined,
        metaTitle: editingPost.metaTitle || undefined,
        metaDescription: editingPost.metaDescription || undefined,
        metaKeywords,
        canonicalUrl: editingPost.canonicalUrl || undefined,
        category: editingPost.category || "General",
        tags,
        author: editingPost.author || "Orivraa Team",
        authorRole: editingPost.authorRole || undefined,
        readTime: editingPost.readTime || calcReadTime(editingPost.content || ""),
        isPublished: editingPost.isPublished ?? false,
        featured: editingPost.featured ?? false,
        publishedAt: editingPost.publishedAt || undefined,
      };

      if ((editingPost as any).isNew) {
        await blogApi.create(payload);
        toast({
          title: "Created",
          description: `Blog post "${payload.title}" created`,
        });
      } else {
        await blogApi.update(editingPost.id!, payload);
        toast({
          title: "Updated",
          description: `Blog post "${payload.title}" updated`,
        });
      }

      setEditDialogOpen(false);
      fetchPosts();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description:
          err?.response?.data?.message || "Could not save blog post",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!postToDelete) return;
    setDeleting(postToDelete.id);
    try {
      await blogApi.delete(postToDelete.id);
      toast({ title: "Deleted", description: "Blog post deleted" });
      setDeleteDialogOpen(false);
      fetchPosts();
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete blog post",
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await blogApi.seed();
      toast({
        title: "Seeded",
        description: `Created ${res.data.seeded} default post(s)`,
      });
      fetchPosts();
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to seed defaults",
      });
    } finally {
      setSeeding(false);
    }
  };

  /* ── SEO analysis (memoised) ───────────────────────────── */
  const seoAnalysis = useMemo(() => {
    if (!editDialogOpen) return null;
    return analyseSeo({
      title: editingPost.title || "",
      metaTitle: editingPost.metaTitle || null,
      metaDescription: editingPost.metaDescription || null,
      metaKeywords: keywordsInput
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
      slug: editingPost.slug || "",
      content: editingPost.content || "",
      excerpt: editingPost.excerpt || null,
    });
  }, [
    editDialogOpen,
    editingPost.title,
    editingPost.metaTitle,
    editingPost.metaDescription,
    editingPost.slug,
    editingPost.content,
    editingPost.excerpt,
    keywordsInput,
  ]);

  const keywordDensity = useMemo(() => {
    const kws = keywordsInput
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    return analyseKeywordDensity(editingPost.content || "", kws);
  }, [editingPost.content, keywordsInput]);

  /* ── Render ────────────────────────────────────────────── */
  return (
    <AdminGuard>
      <DashboardLayout>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Blog Manager</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage SEO-optimised blog posts for orivraa.com/blog
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeed}
            disabled={seeding}
          >
            {seeding ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Seed Defaults
          </Button>
          <Button size="sm" onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Post
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{posts.length}</p>
              <p className="text-xs text-muted-foreground">Total Posts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
            <Globe className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-2xl font-bold">
                {posts.filter((p) => p.isPublished).length}
              </p>
              <p className="text-xs text-muted-foreground">Published</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
            <Edit className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-2xl font-bold">
                {posts.filter((p) => !p.isPublished).length}
              </p>
              <p className="text-xs text-muted-foreground">Drafts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
            <Star className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold">
                {posts.filter((p) => p.featured).length}
              </p>
              <p className="text-xs text-muted-foreground">Featured</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Posts List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold text-lg mb-1">No blog posts yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first post or seed the defaults to get started.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={handleSeed}>
                Seed Defaults
              </Button>
              <Button size="sm" onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" /> New Post
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <Card
              key={post.id}
              className="hover:border-amber-300 transition cursor-pointer"
              onClick={() => handleEdit(post)}
            >
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{post.title}</h3>
                    {post.featured && (
                      <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {post.category}
                    </span>
                    <span>/blog/{post.slug}</span>
                    {post.readTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {post.readTime}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge
                    variant={post.isPublished ? "default" : "secondary"}
                    className={
                      post.isPublished
                        ? "bg-green-100 text-green-700 border-green-200"
                        : ""
                    }
                  >
                    {post.isPublished ? "Published" : "Draft"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPostToDelete(post);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  {post.isPublished && (
                    <a
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Edit / Create Dialog ──────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-[95vw] w-[1200px] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {(editingPost as any)?.isNew
                ? "New Blog Post"
                : "Edit Blog Post"}
            </DialogTitle>
            <DialogDescription>
              Write content, optimise SEO, and publish. All changes save to
              the database.
            </DialogDescription>
          </DialogHeader>

          {/* Editor Tab Bar */}
          <div className="flex gap-1 border-b pb-0">
            {(
              [
                { id: "write" as const, label: "Write", icon: Type },
                { id: "seo" as const, label: "SEO Tools", icon: Search },
                {
                  id: "settings" as const,
                  label: "Post Settings",
                  icon: FileText,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setEditorTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  editorTab === tab.id
                    ? "border-amber-500 text-amber-700"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {tab.id === "seo" && seoAnalysis && (
                  <Badge
                    variant="outline"
                    className={`ml-1 text-[10px] px-1.5 ${
                      seoAnalysis.score >= 70
                        ? "text-green-600 border-green-300"
                        : seoAnalysis.score >= 40
                          ? "text-amber-600 border-amber-300"
                          : "text-red-600 border-red-300"
                    }`}
                  >
                    {seoAnalysis.score}%
                  </Badge>
                )}
              </button>
            ))}
          </div>

          <div className="space-y-4 mt-2">
            {/* ── WRITE TAB ───────────────────────────────── */}
            {editorTab === "write" && (
              <>
                {/* Title + Slug row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Title *</Label>
                    <Input
                      value={editingPost.title || ""}
                      onChange={(e) =>
                        setEditingPost({
                          ...editingPost,
                          title: e.target.value,
                        })
                      }
                      placeholder="Best Jewellery Shop Software 2025"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label>URL Slug *</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() =>
                          setEditingPost({
                            ...editingPost,
                            slug: generateSlug(editingPost.title || ""),
                          })
                        }
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        Auto-generate
                      </Button>
                    </div>
                    <Input
                      value={editingPost.slug || ""}
                      onChange={(e) =>
                        setEditingPost({
                          ...editingPost,
                          slug: e.target.value,
                        })
                      }
                      placeholder="best-jewellery-shop-software-2025"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      orivraa.com/blog/{editingPost.slug || "your-slug"}
                    </p>
                  </div>
                </div>

                {/* Excerpt */}
                <div className="space-y-1.5">
                  <Label>Excerpt / Summary</Label>
                  <Textarea
                    value={editingPost.excerpt || ""}
                    onChange={(e) =>
                      setEditingPost({
                        ...editingPost,
                        excerpt: e.target.value,
                      })
                    }
                    placeholder="Short summary shown on blog listing cards (2-3 sentences)"
                    rows={2}
                  />
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-muted/50 p-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Bold"
                    onClick={() => wrapSelection("<strong>", "</strong>")}
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Italic"
                    onClick={() => wrapSelection("<em>", "</em>")}
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Underline"
                    onClick={() => wrapSelection("<u>", "</u>")}
                  >
                    <Underline className="h-4 w-4" />
                  </Button>
                  <div className="w-px h-5 bg-border mx-1" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    title="Heading 2"
                    onClick={() => insertSnippet("\n<h2>Heading</h2>\n")}
                  >
                    <Heading2 className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    title="Heading 3"
                    onClick={() => insertSnippet("\n<h3>Subheading</h3>\n")}
                  >
                    <Heading3 className="h-4 w-4" />
                  </Button>
                  <div className="w-px h-5 bg-border mx-1" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Bullet List"
                    onClick={() =>
                      insertSnippet(
                        "\n<ul>\n<li>Item 1</li>\n<li>Item 2</li>\n<li>Item 3</li>\n</ul>\n",
                      )
                    }
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Numbered List"
                    onClick={() =>
                      insertSnippet(
                        "\n<ol>\n<li>Step 1</li>\n<li>Step 2</li>\n<li>Step 3</li>\n</ol>\n",
                      )
                    }
                  >
                    <ListOrdered className="h-4 w-4" />
                  </Button>
                  <div className="w-px h-5 bg-border mx-1" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Link"
                    onClick={() => {
                      const url = prompt("Link URL:", "https://");
                      if (url) wrapSelection(`<a href="${url}">`, "</a>");
                    }}
                  >
                    <Link2 className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Image"
                    onClick={() => {
                      const src = prompt("Image URL:");
                      const alt = prompt("Alt text:");
                      if (src)
                        insertSnippet(
                          `\n<img src="${src}" alt="${alt || ""}" loading="lazy" />\n`,
                        );
                    }}
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Table"
                    onClick={() =>
                      insertSnippet(
                        '\n<table>\n<thead>\n<tr><th>Column 1</th><th>Column 2</th><th>Column 3</th></tr>\n</thead>\n<tbody>\n<tr><td>Data</td><td>Data</td><td>Data</td></tr>\n</tbody>\n</table>\n',
                      )
                    }
                  >
                    <span className="text-xs font-mono">⊞</span>
                  </Button>
                  <div className="w-px h-5 bg-border mx-1" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="CTA Button"
                    onClick={() =>
                      insertSnippet(
                        '\n<p><a href="/auth/register" style="display:inline-block;background:#C9A227;color:white;padding:12px 32px;border-radius:8px;font-weight:bold;text-decoration:none;">Start Free →</a></p>\n',
                      )
                    }
                  >
                    <MousePointerClick className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Horizontal Rule"
                    onClick={() => insertSnippet("\n<hr />\n")}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="w-px h-5 bg-border mx-1" />
                  <div className="flex items-center gap-1">
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-6 h-6 cursor-pointer border-0 p-0"
                      title="Text Color"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Apply Color"
                      onClick={() =>
                        wrapSelection(
                          `<span style="color:${textColor}">`,
                          "</span>",
                        )
                      }
                    >
                      <Palette className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Word Count */}
                  <span className="text-xs text-muted-foreground mr-2">
                    {
                      (editingPost.content || "")
                        .replace(/<[^>]+>/g, "")
                        .trim()
                        .split(/\s+/)
                        .filter(Boolean).length
                    }{" "}
                    words
                  </span>

                  {/* Read Time Auto-calc */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      setEditingPost({
                        ...editingPost,
                        readTime: calcReadTime(editingPost.content || ""),
                      })
                    }
                    title="Calculate read time"
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    Calc
                  </Button>

                  {/* Preview toggle */}
                  <Button
                    type="button"
                    variant={showPreview ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    {showPreview ? (
                      <EyeOff className="h-3 w-3 mr-1" />
                    ) : (
                      <Eye className="h-3 w-3 mr-1" />
                    )}
                    Preview
                  </Button>
                </div>

                {/* Content Editor / Preview */}
                <div
                  className={`grid gap-4 ${showPreview ? "grid-cols-2" : "grid-cols-1"}`}
                >
                  <Textarea
                    ref={contentRef}
                    value={editingPost.content || ""}
                    onChange={(e) =>
                      setEditingPost({
                        ...editingPost,
                        content: e.target.value,
                      })
                    }
                    placeholder="<p>Start writing your blog post content here...</p>"
                    className="font-mono text-sm min-h-[400px]"
                  />
                  {showPreview && (
                    <div
                      className="border rounded-lg p-4 overflow-y-auto max-h-[400px] prose prose-sm prose-stone max-w-none
                        prose-headings:font-bold prose-a:text-amber-600
                        prose-th:bg-stone-100 prose-th:px-3 prose-th:py-1.5 prose-th:text-left
                        prose-td:border-t prose-td:px-3 prose-td:py-1.5"
                      dangerouslySetInnerHTML={{
                        __html: editingPost.content || "<p>Preview will appear here</p>",
                      }}
                    />
                  )}
                </div>
              </>
            )}

            {/* ── SEO TOOLS TAB ───────────────────────────── */}
            {editorTab === "seo" && (
              <div className="space-y-6">
                {/* SEO Fields */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <Label>
                      Meta Title{" "}
                      <span className="text-muted-foreground text-xs">
                        (overrides post title in search results)
                      </span>
                    </Label>
                    <Input
                      value={editingPost.metaTitle || ""}
                      onChange={(e) =>
                        setEditingPost({
                          ...editingPost,
                          metaTitle: e.target.value,
                        })
                      }
                      placeholder="e.g. Best Jewellery Shop Software 2025 | Free | Orivraa"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      {(editingPost.metaTitle || editingPost.title || "")
                        .length}{" "}
                      / 60 characters
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Meta Description</Label>
                    <Textarea
                      value={editingPost.metaDescription || ""}
                      onChange={(e) =>
                        setEditingPost({
                          ...editingPost,
                          metaDescription: e.target.value,
                        })
                      }
                      placeholder="Compelling description for search results (120-160 chars)"
                      rows={3}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      {(editingPost.metaDescription || "").length} / 160
                      characters
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Focus Keywords (comma-separated)</Label>
                    <Input
                      value={keywordsInput}
                      onChange={(e) => setKeywordsInput(e.target.value)}
                      placeholder="jewellery shop software, gold shop software, jewellery ERP"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Canonical URL (optional)</Label>
                    <Input
                      value={editingPost.canonicalUrl || ""}
                      onChange={(e) =>
                        setEditingPost({
                          ...editingPost,
                          canonicalUrl: e.target.value,
                        })
                      }
                      placeholder="https://www.orivraa.com/blog/your-post"
                    />
                  </div>
                </div>

                {/* Google Search Preview */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Google Search Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg border p-4 bg-white dark:bg-stone-950">
                      <p className="text-xs text-green-700 dark:text-green-400 mb-1 truncate">
                        https://www.orivraa.com/blog/
                        {editingPost.slug || "your-slug"}
                      </p>
                      <p className="text-[17px] text-blue-700 dark:text-blue-400 font-medium leading-snug line-clamp-2 mb-1">
                        {editingPost.metaTitle ||
                          editingPost.title ||
                          "Your Blog Post Title"}
                      </p>
                      <p className="text-sm text-stone-600 dark:text-stone-400 line-clamp-2">
                        {editingPost.metaDescription ||
                          editingPost.excerpt ||
                          "Meta description will appear here in Google search results..."}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* SEO Score */}
                {seoAnalysis && (
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          SEO Analysis
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className={`${
                            seoAnalysis.score >= 70
                              ? "text-green-600 border-green-300 bg-green-50"
                              : seoAnalysis.score >= 40
                                ? "text-amber-600 border-amber-300 bg-amber-50"
                                : "text-red-600 border-red-300 bg-red-50"
                          }`}
                        >
                          Score: {seoAnalysis.score}% ·{" "}
                          {seoAnalysis.wordCount} words
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1.5">
                        {seoAnalysis.issues.map((issue, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-sm"
                          >
                            {issue.type === "success" && (
                              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                            )}
                            {issue.type === "warning" && (
                              <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                            )}
                            {issue.type === "error" && (
                              <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                            )}
                            <span className="text-muted-foreground">
                              {issue.msg}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Keyword Density */}
                {keywordDensity.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        Keyword Density
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {keywordDensity.map((kd) => (
                          <div
                            key={kd.keyword}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="font-medium">{kd.keyword}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-muted-foreground">
                                {kd.count} occurrences
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  parseFloat(kd.density) >= 0.5 &&
                                  parseFloat(kd.density) <= 2.5
                                    ? "text-green-600 border-green-300"
                                    : parseFloat(kd.density) > 2.5
                                      ? "text-red-600 border-red-300"
                                      : "text-amber-600 border-amber-300"
                                }`}
                              >
                                {kd.density}%
                              </Badge>
                            </div>
                          </div>
                        ))}
                        <p className="text-[11px] text-muted-foreground mt-2">
                          Aim for 0.5%-2.5% keyword density. Below 0.5% is
                          under-optimised, above 2.5% may be flagged as keyword
                          stuffing.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* ── POST SETTINGS TAB ──────────────────────── */}
            {editorTab === "settings" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={editingPost.category || "General"}
                      onChange={(e) =>
                        setEditingPost({
                          ...editingPost,
                          category: e.target.value,
                        })
                      }
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tags (comma-separated)</Label>
                    <Input
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="jewellery software, gold shop, inventory"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>Author</Label>
                    <Input
                      value={editingPost.author || ""}
                      onChange={(e) =>
                        setEditingPost({
                          ...editingPost,
                          author: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Author Role</Label>
                    <Input
                      value={editingPost.authorRole || ""}
                      onChange={(e) =>
                        setEditingPost({
                          ...editingPost,
                          authorRole: e.target.value,
                        })
                      }
                      placeholder="Product & Market Research"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Read Time</Label>
                    <div className="flex gap-2">
                      <Input
                        value={editingPost.readTime || ""}
                        onChange={(e) =>
                          setEditingPost({
                            ...editingPost,
                            readTime: e.target.value,
                          })
                        }
                        placeholder="8 min read"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 flex-shrink-0"
                        onClick={() =>
                          setEditingPost({
                            ...editingPost,
                            readTime: calcReadTime(
                              editingPost.content || "",
                            ),
                          })
                        }
                        title="Auto-calculate"
                      >
                        <Clock className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Cover Image URL</Label>
                  <Input
                    value={editingPost.coverImage || ""}
                    onChange={(e) =>
                      setEditingPost({
                        ...editingPost,
                        coverImage: e.target.value,
                      })
                    }
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Publish Date</Label>
                    <Input
                      type="datetime-local"
                      value={
                        editingPost.publishedAt
                          ? new Date(editingPost.publishedAt)
                              .toISOString()
                              .slice(0, 16)
                          : ""
                      }
                      onChange={(e) =>
                        setEditingPost({
                          ...editingPost,
                          publishedAt: e.target.value
                            ? new Date(e.target.value).toISOString()
                            : null,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Sort Order</Label>
                    <Input
                      type="number"
                      value={editingPost.sortOrder ?? 0}
                      onChange={(e) =>
                        setEditingPost({
                          ...editingPost,
                          sortOrder: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={editingPost.isPublished ?? false}
                      onCheckedChange={(val) =>
                        setEditingPost({
                          ...editingPost,
                          isPublished: val,
                          publishedAt:
                            val && !editingPost.publishedAt
                              ? new Date().toISOString()
                              : editingPost.publishedAt,
                        })
                      }
                    />
                    <Label>Published</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={editingPost.featured ?? false}
                      onCheckedChange={(val) =>
                        setEditingPost({
                          ...editingPost,
                          featured: val,
                        })
                      }
                    />
                    <Label>Featured</Label>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {(editingPost as any)?.isNew ? "Create Post" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Blog Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{postToDelete?.title}
              &rdquo;? This cannot be undone.
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
