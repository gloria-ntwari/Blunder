import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-[#f8fafb] p-1.5 gap-1.5">
      {/* Topbar spans full width above everything */}
      <Topbar onMenuClick={() => setSidebarOpen(true)} />
      {/* Sidebar + content sit side by side below the topbar */}
      <div className="flex flex-1 overflow-hidden gap-1.5 min-h-0">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 min-w-0 overflow-y-auto px-3 py-4 sm:p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
