'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertCircle,
  Key,
  Plus,
  Trash2,
  Copy,
  CheckCircle,
  Clock,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import api from '@/lib/api';

interface ApiToken {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: string[];
  expiresAt: string;
  lastUsedAt: string | null;
  createdAt: string;
  isExpired: boolean;
  daysUntilExpiry: number;
  tokenViewableUntil?: string; // New field
}

interface TokenStats {
  total: number;
  active: number;
  expiringSoon: number;
  recentlyUsed: number;
}

interface Scope {
  scope: string;
  description: string;
}

const DURATION_OPTIONS = [
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '180d', label: '6 months' },
  { value: '365d', label: '1 year' },
];

export function ApiTokenManager() {
  const { user } = useAuth();
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [stats, setStats] = useState<TokenStats | null>(null);
  const [expiringTokens, setExpiringTokens] = useState<ApiToken[]>([]);
  const [availableScopes, setAvailableScopes] = useState<Scope[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  
  // Form state
  const [tokenName, setTokenName] = useState('');
  const [tokenDuration, setTokenDuration] = useState('90d');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['health:read', 'market-rates:refresh']);
  
  // View token state
  const [viewingTokenId, setViewingTokenId] = useState<string | null>(null);
  const [viewedToken, setViewedToken] = useState<string | null>(null);
  const [loadingTokenView, setLoadingTokenView] = useState(false);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tokensRes, statsRes, expiringRes, scopesRes] = await Promise.all([
        api.get('/api/auth/api-tokens'),
        api.get('/api/auth/api-tokens/stats'),
        api.get('/api/auth/api-tokens/expiring'),
        api.get('/api/auth/api-tokens/scopes'),
      ]);
      
      setTokens(tokensRes.data);
      setStats(statsRes.data);
      setExpiringTokens(expiringRes.data);
      setAvailableScopes(scopesRes.data.scopes);
    } catch (error) {
      console.error('Failed to load token data:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load tokens',
        description: 'Could not fetch API token data',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateToken = async () => {
    if (!tokenName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Name required',
        description: 'Please enter a name for the token',
      });
      return;
    }

    setIsCreating(true);
    try {
      const response = await api.post('/api/auth/api-tokens', {
        name: tokenName,
        duration: tokenDuration,
        scopes: selectedScopes,
      });
      
      setNewToken(response.data.token);
      toast({
        title: 'Token created!',
        description: 'Copy the token now - it will only be shown once.',
      });
      
      // Reset form
      setTokenName('');
      setSelectedScopes(['health:read', 'market-rates:refresh']);
      
      // Reload data
      loadData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to create token',
        description: error.response?.data?.message || 'An error occurred',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeToken = async (tokenId: string, tokenName: string) => {
    if (!confirm(`Are you sure you want to revoke "${tokenName}"? This cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/api/auth/api-tokens/${tokenId}`);
      toast({
        title: 'Token revoked',
        description: `"${tokenName}" has been revoked`,
      });
      loadData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to revoke token',
        description: error.response?.data?.message || 'An error occurred',
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Token copied to clipboard',
    });
  };

  const handleViewToken = async (tokenId: string) => {
    setLoadingTokenView(true);
    setViewingTokenId(tokenId);
    try {
      const response = await api.get(`/api/auth/api-tokens/${tokenId}/value`);
      if (response.data.available) {
        setViewedToken(response.data.token);
      } else {
        toast({
          variant: 'destructive',
          title: 'Token Not Available',
          description: response.data.message || 'The viewing window has expired.',
        });
        setViewingTokenId(null);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to retrieve token',
        description: error.response?.data?.message || 'Could not retrieve token value',
      });
      setViewingTokenId(null);
    } finally {
      setLoadingTokenView(false);
    }
  };

  const closeViewToken = () => {
    setViewingTokenId(null);
    setViewedToken(null);
  };

  const isTokenViewable = (token: ApiToken) => {
    if (!token.tokenViewableUntil) return false;
    return new Date(token.tokenViewableUntil) > new Date();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">API Token Management</h2>
          <p className="text-muted-foreground">
            Create and manage long-lived API tokens for CI/CD and integrations
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Token
        </Button>
      </div>

      {/* Expiring Tokens Warning */}
      {expiringTokens.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Tokens Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expiringTokens.map((token) => (
                <div key={token.id} className="flex items-center justify-between p-2 bg-white rounded-lg">
                  <div>
                    <span className="font-medium">{token.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      ({token.tokenPrefix}...)
                    </span>
                  </div>
                  <Badge variant="outline" className="text-amber-700 border-amber-300">
                    {token.daysUntilExpiry} days left
                  </Badge>
                </div>
              ))}
            </div>
            <p className="text-sm text-amber-700 mt-3">
              ⚠️ Remember to update your GitHub secrets when creating new tokens!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Tokens</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Key className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Expiring Soon</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.expiringSoon}</p>
                </div>
                <Clock className="h-8 w-8 text-amber-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Used (24h)</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.recentlyUsed}</p>
                </div>
                <RefreshCw className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Token Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New API Token</CardTitle>
            <CardDescription>
              Generate a long-lived token for GitHub Actions or other integrations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {newToken ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800 mb-2">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Token Created Successfully!</span>
                  </div>
                  <p className="text-sm text-green-700 mb-3">
                    Copy this token now. You won't be able to see it again.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-white rounded border text-sm font-mono break-all">
                      {newToken}
                    </code>
                    <Button size="sm" onClick={() => copyToClipboard(newToken)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Add to GitHub Secrets
                    </h4>
                    <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
                      <li>
                        Go to{' '}
                        <a 
                          href="https://github.com/aakash-priyadarshi/gold-shop-app/settings/secrets/actions"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-blue-900"
                        >
                          GitHub Repository Secrets
                        </a>
                      </li>
                      <li>Click "New repository secret"</li>
                      <li>Name: <code className="bg-blue-100 px-1 rounded">ADMIN_API_TOKEN</code></li>
                      <li>Paste the token above as the value</li>
                      <li>Click "Add secret"</li>
                    </ol>
                  </CardContent>
                </Card>

                <Button onClick={() => { setNewToken(null); setShowCreateForm(false); }}>
                  Done
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tokenName">Token Name</Label>
                    <Input
                      id="tokenName"
                      placeholder="e.g., GitHub Actions CI/CD"
                      value={tokenName}
                      onChange={(e) => setTokenName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration</Label>
                    <Select value={tokenDuration} onValueChange={setTokenDuration}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Permissions</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {availableScopes.map((scope) => (
                      <label
                        key={scope.scope}
                        className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedScopes.includes(scope.scope)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedScopes([...selectedScopes, scope.scope]);
                            } else {
                              setSelectedScopes(selectedScopes.filter((s) => s !== scope.scope));
                            }
                          }}
                          className="rounded"
                        />
                        <div>
                          <p className="font-medium text-sm">{scope.scope}</p>
                          <p className="text-xs text-muted-foreground">{scope.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleCreateToken} disabled={isCreating}>
                    {isCreating ? 'Creating...' : 'Create Token'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tokens Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Tokens</CardTitle>
          <CardDescription>
            Manage your API tokens. Revoke any token that is no longer needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : tokens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No API tokens created yet</p>
              <p className="text-sm">Create your first token to enable CI/CD integrations</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((token) => (
                  <TableRow key={token.id}>
                    <TableCell className="font-medium">{token.name}</TableCell>
                    <TableCell>
                      {viewingTokenId === token.id && viewedToken ? (
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-green-100 px-2 py-1 rounded break-all max-w-[200px]">
                            {viewedToken}
                          </code>
                          <Button size="sm" variant="ghost" onClick={() => copyToClipboard(viewedToken)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={closeViewToken}>
                            <EyeOff className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {token.tokenPrefix}...
                          </code>
                          {isTokenViewable(token) && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleViewToken(token.id)}
                              disabled={loadingTokenView}
                              title="View full token (available for 24h after creation)"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {token.scopes.slice(0, 2).map((scope) => (
                          <Badge key={scope} variant="outline" className="text-xs">
                            {scope}
                          </Badge>
                        ))}
                        {token.scopes.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{token.scopes.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(token.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {formatDate(token.expiresAt)}
                        {token.daysUntilExpiry <= 7 && (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">
                            {token.daysUntilExpiry}d
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {token.lastUsedAt ? formatDate(token.lastUsedAt) : 'Never'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRevokeToken(token.id, token.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
