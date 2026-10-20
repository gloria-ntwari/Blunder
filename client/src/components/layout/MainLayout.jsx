import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

export default function MainLayout() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#f8fafb] p-1.5 gap-1.5">
      {/* Topbar spans full width above everything */}
      <Topbar />
      {/* Sidebar + content sit side by side below the topbar */}
      <div className="flex flex-1 overflow-hidden gap-1.5 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
