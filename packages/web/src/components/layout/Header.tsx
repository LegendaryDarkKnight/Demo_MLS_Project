'use client';

import { useState } from 'react';
import { Building2, Menu, User, LogOut, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SearchBar from '@/components/search/SearchBar';
import AuthModal from '@/components/auth/AuthModal';
import { useAuth } from '@/contexts/AuthContext';
import type { SearchSuggestion } from '@/types/listing';

interface HeaderProps {
  onSearch: (result: SearchSuggestion) => void;
}

export default function Header({ onSearch }: HeaderProps) {
  const { user, isLoading, logout } = useAuth();
  const [authModal, setAuthModal] = useState<'signin' | 'signup' | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center border-b border-slate-200 bg-navy-700 px-4 shadow-md">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-6 flex-shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="hidden sm:block text-white font-bold text-lg tracking-tight">
            Urban<span className="text-brand-light">Lease</span>
            <span className="text-slate-400 font-normal text-sm ml-1">NYC</span>
          </span>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-xl mx-auto">
          <SearchBar onSelect={onSearch} />
        </div>

        {/* Nav actions */}
        <div className="ml-4 flex items-center gap-2 flex-shrink-0">
          {!isLoading && (
            user ? (
              <div className="relative hidden md:block">
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className="flex items-center gap-1.5 text-slate-300 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-navy-600 transition-colors"
                >
                  <User className="h-4 w-4" />
                  <span>{user.firstName ?? user.email.split('@')[0]}</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-100 py-1 z-50">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => { logout(); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-300 hover:text-white hover:bg-navy-600 hidden md:flex"
                  onClick={() => setAuthModal('signin')}
                >
                  <User className="h-4 w-4 mr-1" />
                  Sign In
                </Button>
                <Button
                  size="sm"
                  variant="brand"
                  className="hidden md:flex"
                  onClick={() => setAuthModal('signup')}
                >
                  Sign Up
                </Button>
              </>
            )
          )}
          <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white hover:bg-navy-600 md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {authModal && (
        <AuthModal
          isOpen
          defaultMode={authModal}
          onClose={() => setAuthModal(null)}
        />
      )}
    </>
  );
}
