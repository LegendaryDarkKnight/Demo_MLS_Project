'use client';

import { Building2, Menu, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SearchBar from '@/components/search/SearchBar';
import type { SearchSuggestion } from '@/types/listing';

interface HeaderProps {
  onSearch: (result: SearchSuggestion) => void;
}

export default function Header({ onSearch }: HeaderProps) {
  return (
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

      {/* Search — grows to fill */}
      <div className="flex-1 max-w-xl mx-auto">
        <SearchBar onSelect={onSearch} />
      </div>

      {/* Nav actions */}
      <div className="ml-4 flex items-center gap-2 flex-shrink-0">
        <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-navy-600 hidden md:flex">
          <User className="h-4 w-4 mr-1" />
          Sign In
        </Button>
        <Button size="sm" variant="brand" className="hidden md:flex">
          List Property
        </Button>
        <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white hover:bg-navy-600 md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
