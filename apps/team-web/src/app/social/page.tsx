"use client";

import { useEffect, useState } from "react";
import { Plus, Calendar, Eye, Send, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { socialApi } from "@/lib/api";
import { toast } from "sonner";

const PLATFORM_ICONS: Record<string, string> = {
  INSTAGRAM: "📸", FACEBOOK: "📘", TWITTER: "🐦", LINKEDIN: "💼", TIKTOK: "🎵", YOUTUBE: "🎬",
};

export default function SocialPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [scheduled, setScheduled] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [postForm, setPostForm] = useState({ accountId: "", content: "", mediaUrl: "", scheduledAt: "" });

  const load = () => {
    setLoading(true);
    Promise.allSettled([
      socialApi.listAccounts(),
      socialApi.listPosts(),
      socialApi.getScheduledPosts(),
      socialApi.getAnalyticsDashboard(),
    ]).then(([accRes, postRes, schedRes, analyticsRes]) => {
      setAccounts(accRes.status === "fulfilled" ? (Array.isArray(accRes.value.data) ? accRes.value.data : accRes.value.data?.data ?? []) : []);
      setPosts(postRes.status === "fulfilled" ? (Array.isArray(postRes.value.data) ? postRes.value.data : postRes.value.data?.data ?? []) : []);
      setScheduled(schedRes.status === "fulfilled" ? (Array.isArray(schedRes.value.data) ? schedRes.value.data : schedRes.value.data?.data ?? []) : []);
      setAnalytics(analyticsRes.status === "fulfilled" ? analyticsRes.value.data : null);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleCreatePost = async () => {
    try {
      await socialApi.createPost({
        ...postForm,
        scheduledAt: postForm.scheduledAt ? new Date(postForm.scheduledAt).toISOString() : undefined,
      });
      toast.success("Post created");
      setShowCreatePost(false);
      setPostForm({ accountId: "", content: "", mediaUrl: "", scheduledAt: "" });
      load();
    } catch { toast.error("Failed to create post"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Social Media</h1>
          <p className="text-muted-foreground">Manage your social media command center</p>
        </div>
        <Dialog open={showCreatePost} onOpenChange={setShowCreatePost}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Create Post</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Post</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <Label>Account</Label>
                <Select value={postForm.accountId} onValueChange={(v) => setPostForm({ ...postForm, accountId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>{PLATFORM_ICONS[a.platform] ?? "📱"} {a.handle ?? a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Content</Label><Textarea rows={4} value={postForm.content} onChange={(e) => setPostForm({ ...postForm, content: e.target.value })} /></div>
              <div><Label>Media URL (optional)</Label><Input value={postForm.mediaUrl} onChange={(e) => setPostForm({ ...postForm, mediaUrl: e.target.value })} /></div>
              <div><Label>Schedule (optional)</Label><Input type="datetime-local" value={postForm.scheduledAt} onChange={(e) => setPostForm({ ...postForm, scheduledAt: e.target.value })} /></div>
              <Button onClick={handleCreatePost}>Create Post</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Analytics summary */}
      {analytics && (
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Total Followers", value: analytics.totalFollowers ?? 0 },
            { label: "Posts This Month", value: analytics.postsThisMonth ?? posts.length },
            { label: "Engagement Rate", value: `${analytics.engagementRate ?? 0}%` },
            { label: "Reach", value: analytics.totalReach ?? 0 },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{stat.label}</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}</p></CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="posts">
        <TabsList>
          <TabsTrigger value="posts">All Posts</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled ({scheduled.length})</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4">
          {posts.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No posts yet. Create your first post!</CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {posts.map((post: any) => (
                <Card key={post.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{PLATFORM_ICONS[post.account?.platform] ?? "📱"}</span>
                        <span className="text-sm font-medium">{post.account?.handle ?? post.account?.name ?? "Unknown"}</span>
                      </div>
                      <Badge variant={post.status === "PUBLISHED" ? "success" : post.status === "SCHEDULED" ? "warning" : "secondary"}>
                        {post.status}
                      </Badge>
                    </div>
                    <p className="text-sm mt-2 line-clamp-3">{post.content}</p>
                    <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                      <div className="flex gap-2">
                        {post.status === "DRAFT" && (
                          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={async () => { await socialApi.approvePost(post.id); load(); }}>
                            Approve
                          </Button>
                        )}
                        {post.status === "APPROVED" && (
                          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={async () => { await socialApi.publishPost(post.id); load(); }}>
                            <Send className="h-3 w-3 mr-1" />Publish
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          {scheduled.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground flex flex-col items-center">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              No scheduled posts
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {scheduled.map((post: any) => (
                <Card key={post.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{post.content?.slice(0, 80)}...</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {PLATFORM_ICONS[post.account?.platform] ?? ""} {post.account?.handle} — {post.scheduledAt ? new Date(post.scheduledAt).toLocaleString() : ""}
                      </p>
                    </div>
                    <Badge variant="warning">Scheduled</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4">
          {accounts.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No social accounts connected</CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {accounts.map((acc: any) => (
                <Card key={acc.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{PLATFORM_ICONS[acc.platform] ?? "📱"}</span>
                        <div>
                          <p className="font-semibold">{acc.handle ?? acc.name}</p>
                          <p className="text-xs text-muted-foreground">{acc.platform}</p>
                        </div>
                      </div>
                      <Badge variant={acc.isConnected !== false ? "success" : "destructive"}>
                        {acc.isConnected !== false ? "Connected" : "Disconnected"}
                      </Badge>
                    </div>
                    {acc.followerCount !== undefined && (
                      <p className="text-sm text-muted-foreground mt-2">{acc.followerCount.toLocaleString()} followers</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
