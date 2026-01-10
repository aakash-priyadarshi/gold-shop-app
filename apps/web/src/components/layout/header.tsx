'use client';

import Link from 'next/link';
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { BRAND } from '@/config/brand';
import {
  Bars3Icon,
  UserIcon,
  BuildingStorefrontIcon,
  ShoppingBagIcon,
  BellIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  SunIcon,
  MoonIcon,
  GlobeAltIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  MagnifyingGlassIcon,
  HomeIcon,
  SparklesIcon,
  BuildingOffice2Icon,
  InformationCircleIcon,
  Squares2X2Icon,
  CubeIcon,
  ClipboardDocumentListIcon,
  ShieldCheckIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useAuth, getDashboardRoute, type UserRole } from '@/hooks/useAuth';
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

// Role-specific quick action icons configuration
const getRoleQuickActions = (role: UserRole | undefined) => {
  switch (role) {
    case 'ADMIN':
      return [
        { href: '/dashboard/admin', icon: ShieldCheckIcon, label: 'Admin Dashboard', tooltip: 'Admin Dashboard' },
        { href: '/dashboard/admin/orders', icon: ClipboardDocumentListIcon, label: 'Ongoing Orders', tooltip: 'All Platform Orders' },
      ];
    case 'SHOPKEEPER':
      return [
        { href: '/dashboard/shop', icon: Squares2X2Icon, label: 'Dashboard', tooltip: 'Shop Dashboard' },
        { href: '/dashboard/shop/orders', icon: CubeIcon, label: 'Order Requests', tooltip: 'Incoming Orders & RFQs' },
      ];
    case 'CUSTOMER':
    default:
      return [
        { href: '/dashboard/customer', icon: Squares2X2Icon, label: 'Dashboard', tooltip: 'My Dashboard' },
        { href: '/dashboard/customer/orders', icon: TruckIcon, label: 'Track Orders', tooltip: 'Track My Orders' },
      ];
  }
};

export function Header() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Get preferences from store
  const language = usePreferencesStore((state) => state.language);
  const currency = usePreferencesStore((state) => state.currency);
  const country = usePreferencesStore((state) => state.country);
  const setLanguage = usePreferencesStore((state) => state.setLanguage);
  const setCurrency = usePreferencesStore((state) => state.setCurrency);
  const setCountry = usePreferencesStore((state) => state.setCountry);
  const setAuthenticated = usePreferencesStore((state) => state.setAuthenticated);

  // Use next-themes for theme management (more reliable)
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Sync auth state with preferences store
  useEffect(() => {
    setMounted(true);
    setAuthenticated(isAuthenticated);
  }, [isAuthenticated, setAuthenticated]);

  const navigation = [
    { name: 'Shop', href: '/shop', icon: ShoppingBagIcon },
    { name: 'Custom Order', href: '/rfq/create', icon: SparklesIcon },
    { name: 'Sellers', href: '/shops', icon: BuildingOffice2Icon },
    { name: 'About', href: '/about', icon: InformationCircleIcon },
  ];

  // Toggle theme between light/dark using next-themes
  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  // Determine current icon based on resolved theme
  const isDark = resolvedTheme === 'dark';

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-gray-100 safe-area-top">
      <nav className="container mx-auto flex h-14 lg:h-16 items-center justify-between px-4">
        {/* Mobile Menu Button */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="ghost" size="icon" className="touch-target -ml-2">
              <Bars3Icon className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] p-0">
            <SheetHeader className="p-4 border-b border-gray-100">
              <SheetTitle className="flex items-center gap-2">
                <BrandLogo variant="icon" size="sm" />
                <span className="font-bold text-lg">{BRAND.name}</span>
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col h-[calc(100%-65px)]">
              {/* Mobile Navigation */}
              <div className="flex-1 p-4 space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium text-gray-700 hover:bg-gray-100 transition-colors touch-target"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <item.icon className="h-5 w-5 text-gray-400" />
                    {item.name}
                  </Link>
                ))}
              </div>

              {/* Mobile Preferences */}
              {mounted && (
                <div className="p-4 border-t border-gray-100 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
                    Preferences
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Language */}
                    <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
                      <SelectTrigger className="h-11 text-sm rounded-xl">
                        <GlobeAltIcon className="h-4 w-4 mr-2 text-gray-400" />
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
                    
                    {/* Currency */}
                    <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyCode)}>
                      <SelectTrigger className="h-11 text-sm rounded-xl">
                        <CurrencyDollarIcon className="h-4 w-4 mr-2 text-gray-400" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CURRENCIES).map(([code, info]) => (
                          <SelectItem key={code} value={code}>
                            <span className="mr-2">{info.symbol}</span>
                            {code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Country */}
                    <Select value={country} onValueChange={(v) => setCountry(v as CountryCode)}>
                      <SelectTrigger className="flex-1 h-11 text-sm rounded-xl">
                        <MapPinIcon className="h-4 w-4 mr-2 text-gray-400" />
                        <SelectValue>
                          {COUNTRIES[country]?.flag} {COUNTRIES[country]?.name}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(COUNTRIES).map(([code, info]) => (
                          <SelectItem key={code} value={code}>
                            <span className="mr-2">{info.flag}</span>
                            {info.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {/* Theme Toggle */}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 shrink-0 rounded-xl"
                      onClick={toggleTheme}
                    >
                      {isDark ? (
                        <SunIcon className="h-5 w-5" />
                      ) : (
                        <MoonIcon className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Mobile Auth Actions */}
              <div className="p-4 border-t border-gray-100 space-y-2">
                {isAuthenticated && user ? (
                  <>
                    {/* Role-specific quick actions for mobile */}
                    {getRoleQuickActions(user.role).map((action) => (
                      <Link key={action.href} href={action.href} onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="outline" className="w-full h-12 justify-start rounded-xl text-base">
                          <action.icon className="mr-3 h-5 w-5" />
                          {action.label}
                        </Button>
                      </Link>
                    ))}
                    <Button
                      variant="ghost"
                      className="w-full h-12 justify-start rounded-xl text-base text-red-600 hover:bg-red-50"
                      onClick={() => logout()}
                    >
                      <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" />
                      Log out
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/auth/login" className="block" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full h-12 rounded-xl text-base">
                        Log in
                      </Button>
                    </Link>
                    <Link href="/auth/register" className="block" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full h-12 rounded-xl text-base gold-gradient text-white">
                        Sign up
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <BrandLogo variant="icon" size="sm" className="lg:hidden" />
          <BrandLogo variant="icon" size="md" className="hidden lg:block" />
          <span className="font-bold text-base lg:text-xl tracking-tight">
            {BRAND.name}
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Desktop Preferences Controls */}
        <div className="hidden lg:flex items-center gap-2">
          {mounted && (
            <>
              {/* Language Selector */}
              <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
                <SelectTrigger className="w-[100px] h-9 text-xs rounded-lg border-gray-200">
                  <GlobeAltIcon className="h-3 w-3 mr-1 text-gray-400" />
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

              {/* Currency Selector */}
              <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyCode)}>
                <SelectTrigger className="w-[90px] h-9 text-xs rounded-lg border-gray-200">
                  <CurrencyDollarIcon className="h-3 w-3 mr-1 text-gray-400" />
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

              {/* Country Selector */}
              <Select value={country} onValueChange={(v) => setCountry(v as CountryCode)}>
                <SelectTrigger className="w-[90px] h-9 text-xs rounded-lg border-gray-200">
                  <MapPinIcon className="h-3 w-3 mr-1 text-gray-400" />
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
                className="h-9 w-9 rounded-lg"
                onClick={toggleTheme}
              >
                {isDark ? (
                  <SunIcon className="h-4 w-4" />
                ) : (
                  <MoonIcon className="h-4 w-4" />
                )}
              </Button>
            </>
          )}
        </div>

        {/* Desktop Auth/User Menu */}
        <div className="hidden lg:flex items-center gap-2">
          {authLoading ? (
            <div className="w-9 h-9 bg-gray-100 rounded-lg animate-pulse" />
          ) : isAuthenticated && user ? (
            <TooltipProvider delayDuration={200}>
              {/* Role-specific quick action icons */}
              {getRoleQuickActions(user.role).map((action) => (
                <Tooltip key={action.href}>
                  <TooltipTrigger asChild>
                    <Link href={action.href}>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
                        <action.icon className="h-5 w-5" />
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{action.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
              
              {/* Notifications */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/notifications">
                    <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-lg">
                      <BellIcon className="h-5 w-5" />
                      <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                        3
                      </span>
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Notifications</p>
                </TooltipContent>
              </Tooltip>
              
              {/* User menu dropdown */}
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-9 w-9 rounded-lg p-0">
                        <div className="w-9 h-9 bg-gradient-to-br from-gold-400 to-gold-600 rounded-lg flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-white" />
                        </div>
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Account</p>
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                      <p className="text-xs leading-none text-gold-600 font-medium mt-1">
                        {user.role}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={getDashboardRoute(user.role)}>
                      <Squares2X2Icon className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/orders">
                      <ShoppingBagIcon className="mr-2 h-4 w-4" />
                      My Orders
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/rfq">
                      <DocumentTextIcon className="mr-2 h-4 w-4" />
                      My Requests
                    </Link>
                  </DropdownMenuItem>
                  {user.role === 'SHOPKEEPER' && (
                    <DropdownMenuItem asChild>
                      <Link href="/shop/manage">
                        <BuildingStorefrontIcon className="mr-2 h-4 w-4" />
                        My Shop
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {user.role === 'ADMIN' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/admin">
                          <ShieldCheckIcon className="mr-2 h-4 w-4" />
                          Admin Panel
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/admin/orders">
                          <ClipboardDocumentListIcon className="mr-2 h-4 w-4" />
                          All Orders
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Cog6ToothIcon className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()} className="text-red-600">
                    <ArrowRightOnRectangleIcon className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipProvider>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost" className="h-9 rounded-lg">Log in</Button>
              </Link>
              <Link href="/auth/register">
                <Button className="h-9 rounded-lg gold-gradient text-white">Sign up</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Auth Icons */}
        <div className="flex lg:hidden items-center gap-1">
          {!authLoading && isAuthenticated && user && (
            <>
              {/* First quick action for mobile */}
              <Link href={getRoleQuickActions(user.role)[0]?.href || getDashboardRoute(user.role)}>
                <Button variant="ghost" size="icon" className="touch-target">
                  {(() => {
                    const Icon = getRoleQuickActions(user.role)[0]?.icon || Squares2X2Icon;
                    return <Icon className="h-5 w-5" />;
                  })()}
                </Button>
              </Link>
              <Link href="/notifications">
                <Button variant="ghost" size="icon" className="relative touch-target">
                  <BellIcon className="h-5 w-5" />
                  <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    3
                  </span>
                </Button>
              </Link>
              <Link href={getDashboardRoute(user.role)}>
                <Button variant="ghost" size="icon" className="touch-target">
                  <div className="w-8 h-8 bg-gradient-to-br from-gold-400 to-gold-600 rounded-lg flex items-center justify-center">
                    <UserIcon className="h-4 w-4 text-white" />
                  </div>
                </Button>
              </Link>
            </>
          )}
          {!authLoading && !isAuthenticated && (
            <Link href="/auth/login">
              <Button variant="ghost" size="icon" className="touch-target">
                <UserIcon className="h-5 w-5" />
              </Button>
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
