import { useAuth } from '../store/auth';
import { useInvoices } from '../store/invoices';
import type { Page } from '../types';
import {
  FileText, LayoutDashboard, FilePlus, Clock, LogOut, Shield, UserCheck, ChevronDown, Menu, X,
  Cloud, HardDrive, Wifi, WifiOff, BarChart3,
} from 'lucide-react';
import { useState } from 'react';

interface NavbarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export default function Navbar({ currentPage, onNavigate }: NavbarProps) {
  const { user, logout, isOwner } = useAuth();
  const { storageMode, firestoreConnected } = useInvoices();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const links: { page: Page; label: string; icon: React.ReactNode }[] = [
    { page: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { page: 'financial', label: 'Financial', icon: <BarChart3 className="w-4 h-4" /> },
    { page: 'create', label: 'New Invoice', icon: <FilePlus className="w-4 h-4" /> },
    { page: 'history', label: 'History', icon: <Clock className="w-4 h-4" /> },
  ];

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('dashboard')}>
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="text-lg font-bold text-slate-800">Invoice Pro</span>
            </div>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {links.map(l => (
              <button
                key={l.page}
                onClick={() => onNavigate(l.page)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentPage === l.page
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {l.icon}
                {l.label}
              </button>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Storage mode badge */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold ${
                storageMode === 'firestore' && firestoreConnected
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : storageMode === 'firestore' && !firestoreConnected
                  ? 'bg-red-50 text-red-600 border border-red-200'
                  : 'bg-slate-50 text-slate-600 border border-slate-200'
              }`}
              title={
                storageMode === 'firestore' && firestoreConnected
                  ? 'Connected to Firebase Firestore — data syncs in real-time'
                  : storageMode === 'firestore'
                  ? 'Firestore connection lost — retrying...'
                  : 'Using local storage — add Firebase config to enable cloud sync'
              }
            >
              {storageMode === 'firestore' && firestoreConnected ? (
                <>
                  <Cloud className="w-3 h-3" />
                  <Wifi className="w-3 h-3" />
                  <span className="hidden lg:inline">Firestore</span>
                </>
              ) : storageMode === 'firestore' ? (
                <>
                  <Cloud className="w-3 h-3" />
                  <WifiOff className="w-3 h-3" />
                  <span className="hidden lg:inline">Reconnecting</span>
                </>
              ) : (
                <>
                  <HardDrive className="w-3 h-3" />
                  <span className="hidden lg:inline">Local</span>
                </>
              )}
            </div>

            {/* Role badge */}
            <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold ${
              isOwner
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-sky-50 text-sky-700 border border-sky-200'
            }`}>
              {isOwner ? <Shield className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
              {isOwner ? 'Owner' : 'Staff'}
            </div>

            {/* Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-all"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:block text-sm font-medium text-slate-700 max-w-[120px] truncate">
                  {user?.name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 top-12 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
                      <p className="text-xs text-slate-500">{user?.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          isOwner ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700'
                        }`}>
                          {isOwner ? <Shield className="w-2.5 h-2.5" /> : <UserCheck className="w-2.5 h-2.5" />}
                          {isOwner ? 'Owner' : 'Staff'}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          storageMode === 'firestore' && firestoreConnected
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-slate-50 text-slate-500'
                        }`}>
                          {storageMode === 'firestore' && firestoreConnected ? (
                            <><Cloud className="w-2.5 h-2.5" /> Firestore</>
                          ) : (
                            <><HardDrive className="w-2.5 h-2.5" /> Local</>
                          )}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => { logout(); setProfileOpen(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-all"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-50 text-slate-600"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
          {/* Mobile storage badge */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium mb-2 ${
            storageMode === 'firestore' && firestoreConnected
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-slate-50 text-slate-600 border border-slate-200'
          }`}>
            {storageMode === 'firestore' && firestoreConnected ? (
              <><Cloud className="w-3.5 h-3.5" /><Wifi className="w-3.5 h-3.5" /> Connected to Firestore</>
            ) : (
              <><HardDrive className="w-3.5 h-3.5" /> Using Local Storage</>
            )}
          </div>

          {links.map(l => (
            <button
              key={l.page}
              onClick={() => { onNavigate(l.page); setMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                currentPage === l.page
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {l.icon}
              {l.label}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}
