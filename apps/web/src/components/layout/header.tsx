'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Menu,
  X,
  User,
  Store,
  ShoppingBag,
  Bell,
  LogOut,
  Settings,
  FileText,
  Sun,
  Moon,
  Globe,
  Coins,
  MapPin,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  usePreferencesStore,
  CURRENCIES,
  LANGUAGES,
  COUNTRIES,
  type CurrencyCode,
  type CountryCode,
  type Language,
  type ThemeMode,
} from '@/store/preferences';

export function Header() {
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Get preferences from store
  const language = usePreferencesStore((state) => state.language);
  const currency = usePreferencesStore((state) => state.currency);
  const country = usePreferencesStore((state) => state.country);
  const theme = usePreferencesStore((state) => state.theme);
  const setLanguage = usePreferencesStore((state) => state.setLanguage);
  const setCurrency = usePreferencesStore((state) => state.setCurrency);
  const setCountry = usePreferencesStore((state) => state.setCountry);
  const setTheme = usePreferencesStore((state) => state.setTheme);
  const setAuthenticated = usePreferencesStore((state) => state.setAuthenticated);

  // Sync auth state with preferences store
  useEffect(() => {
    setMounted(true);
    setAuthenticated(!!session);
  }, [session, setAuthenticated]);

  const navigation = [
    { name: 'Shop', href: '/shop' },
    { name: 'Custom Order', href: '/rfq/create' },
    { name: 'Shops', href: '/shops' },
    { name: 'About', href: '/about' },
  ];

  // Toggle theme between light/dark
  const toggleTheme = () => {
    if (theme === 'dark') {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  };

  // Determine current icon based on theme
  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-gold-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">G</span>
          </div>
          <span className="text-xl font-bold hidden sm:inline-block">
            Gold<span className="text-gold-500">Shop</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Preferences Controls - Language, Currency, Theme */}
        <div className="hidden md:flex items-center space-x-2">
          {mounted && (
            <>
              {/* Language Selector */}
              <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
                <SelectTrigger className="w-[100px] h-8 text-xs">
                  <Globe className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LANGUAGES).map(([code, info]) => (
                    <SelectItem key={code} value={code} className="text-xs">
                      {info.nativeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Currency Selector - Price Display Only */}
              <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyCode)}>
                <SelectTrigger 
                  className="w-[90px] h-8 text-xs" 
                  title="Currency affects price display only, not tax rates"
                >
                  <Coins className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1.5 text-xs text-muted-foreground border-b mb-1">
                    Price Display Currency
                  </div>
                  {Object.entries(CURRENCIES).map(([code, info]) => (
                    <SelectItem key={code} value={code} className="text-xs">
                      <span className="mr-1">{info.symbol}</span>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Country Selector - Tax Jurisdiction */}
              <Select value={country} onValueChange={(v) => setCountry(v as CountryCode)}>
                <SelectTrigger 
                  className="w-[90px] h-8 text-xs" 
                  title="Country determines tax rates (VAT/GST)"
                >
                  <MapPin className="h-3 w-3 mr-1" />
                  <SelectValue>
                    {COUNTRIES[country]?.flag} {country}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1.5 text-xs text-muted-foreground border-b mb-1">
                    Tax Jurisdiction
                  </div>
                  {Object.entries(COUNTRIES).map(([code, info]) => (
                    <SelectItem key={code} value={code} className="text-xs">
                      <span className="mr-1">{info.flag}</span>
                      {info.name}
                      <span className="ml-1 text-muted-foreground">({info.taxDisplay})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={toggleTheme}
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
            </>
          )}
        </div>

        {/* Desktop Auth/User Menu */}
        <div className="hidden md:flex items-center space-x-4">
          {status === 'loading' ? (
            <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
          ) : session ? (
            <>
              <Link href="/notifications">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    3
                  </span>
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <div className="w-8 h-8 bg-gold-100 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-gold-600" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {session.user?.name}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {session.user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">
                      <User className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/orders">
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      My Orders
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/rfq">
                      <FileText className="mr-2 h-4 w-4" />
                      My Requests
                    </Link>
                  </DropdownMenuItem>
                  {session.user?.role === 'SHOPKEEPER' && (
                    <DropdownMenuItem asChild>
                      <Link href="/shop/manage">
                        <Store className="mr-2 h-4 w-4" />
                        My Shop
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost">Log in</Button>
              </Link>
              <Link href="/auth/register">
                <Button>Sign up</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <div className="container mx-auto px-4 py-4 space-y-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="block text-sm font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}

            {/* Mobile Preferences Controls */}
            {mounted && (
              <div className="pt-4 border-t space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Preferences
                </p>
                <div className="flex items-center justify-between gap-2">
                  {/* Language */}
                  <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
                    <SelectTrigger className="w-full h-9 text-sm">
                      <Globe className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(LANGUAGES).map(([code, info]) => (
                        <SelectItem key={code} value={code}>
                          {info.nativeName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  {/* Currency - Price Display */}
                  <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyCode)}>
                    <SelectTrigger className="flex-1 h-9 text-sm" title="Price Display">
                      <Coins className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 py-1.5 text-xs text-muted-foreground border-b mb-1">
                        Price Display Currency
                      </div>
                      {Object.entries(CURRENCIES).map(([code, info]) => (
                        <SelectItem key={code} value={code}>
                          <span className="mr-2">{info.symbol}</span>
                          {code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* Theme Toggle */}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={toggleTheme}
                  >
                    {isDark ? (
                      <Sun className="h-4 w-4" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  {/* Country - Tax Jurisdiction */}
                  <Select value={country} onValueChange={(v) => setCountry(v as CountryCode)}>
                    <SelectTrigger className="flex-1 h-9 text-sm" title="Tax Jurisdiction">
                      <MapPin className="h-4 w-4 mr-2" />
                      <SelectValue>
                        {COUNTRIES[country]?.flag} {COUNTRIES[country]?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 py-1.5 text-xs text-muted-foreground border-b mb-1">
                        Tax Jurisdiction
                      </div>
                      {Object.entries(COUNTRIES).map(([code, info]) => (
                        <SelectItem key={code} value={code}>
                          <span className="mr-2">{info.flag}</span>
                          {info.name}
                          <span className="ml-1 text-muted-foreground text-xs">({info.taxDisplay})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="pt-4 border-t space-y-2">
              {session ? (
                <>
                  <Link href="/dashboard">
                    <Button variant="outline" className="w-full justify-start">
                      <User className="mr-2 h-4 w-4" />
                      Dashboard
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => signOut()}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/auth/login" className="block">
                    <Button variant="outline" className="w-full">
                      Log in
                    </Button>
                  </Link>
                  <Link href="/auth/register" className="block">
                    <Button className="w-full">Sign up</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
