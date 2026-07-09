'use client';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { NotificationProvider } from '@/components/providers/NotificationProvider';
import Toaster from '@/components/ui/Toaster';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <NotificationProvider>
      <div className="admin-shell">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="admin-content">
          <Topbar onMenuClick={() => setSidebarOpen(true)} />
          <main className="admin-main animate-fade-in">
            {children}
          </main>
        </div>
      </div>
      <Toaster />
    </NotificationProvider>
  );
}
