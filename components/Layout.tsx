import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShieldCheck, Info, Settings, Bell, UserCircle, Activity, BookOpen, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = React.useState(true);
  const location = useLocation();

  return (
    <div className="flex h-screen bg-[#0B1120] text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside 
        className={clsx(
          "bg-[#0F172A] border-r border-slate-800/50 transition-all duration-300 flex flex-col relative z-20",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        {/* Toggle Button */}
        <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)} 
            className="absolute -right-3 top-9 bg-slate-800 border border-slate-700 text-slate-400 rounded-full p-1 hover:text-white hover:bg-slate-700 transition-colors z-50 shadow-lg"
        >
            {isSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>

        {/* Logo Area */}
        <div className="h-24 flex items-center px-6 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
             <div className="bg-blue-600/20 p-2 rounded-lg border border-blue-500/30">
                <ShieldCheck className="w-6 h-6 text-blue-500" />
             </div>
             {isSidebarOpen && (
                 <span className="font-bold text-lg tracking-tight text-white">DarknetGuard</span>
             )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-8 flex flex-col gap-2 px-4">
          <NavItem to="/" icon={<LayoutDashboard size={20} />} label="Overview" isOpen={isSidebarOpen} />
          <NavItem to="/analytics" icon={<Activity size={20} />} label="Live Monitor" isOpen={isSidebarOpen} />
          <NavItem to="/alerts" icon={<AlertTriangle size={20} />} label="Threat Alerts" isOpen={isSidebarOpen} />
          
          <div className="my-2 border-t border-slate-800/50 mx-2 opacity-50"></div>
          
          <NavItem to="/guide" icon={<BookOpen size={20} />} label="Coding Guide" isOpen={isSidebarOpen} />
          <NavItem to="/about" icon={<Info size={20} />} label="About System" isOpen={isSidebarOpen} />
          <NavItem to="/settings" icon={<Settings size={20} />} label="Configuration" isOpen={isSidebarOpen} />
        </nav>

        {/* Status Card (Footer) */}
        <div className="p-4">
            <div className={clsx(
                "bg-slate-900/80 rounded-xl border border-slate-800 p-4 transition-all overflow-hidden",
                !isSidebarOpen && "items-center justify-center flex p-2"
            )}>
                {isSidebarOpen ? (
                    <>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                            <span className="text-sm font-semibold text-slate-200">System Operational</span>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-slate-500">Engine v2.4.1</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                Connected to Kafka
                            </p>
                        </div>
                    </>
                ) : (
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                )}
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#0B1120]">
        {/* Top Bar */}
        <header className="h-16 border-b border-slate-800/50 flex items-center justify-between px-8 bg-[#0F172A]/50 backdrop-blur-sm">
           <div className="flex items-center text-slate-400 text-sm">
              <span className="opacity-50">Console</span>
              <span className="mx-2">/</span>
              <span className="text-slate-200 font-medium">{getPageName(location.pathname)}</span>
           </div>
          
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Bell className="w-5 h-5 text-slate-400 group-hover:text-blue-400 cursor-pointer transition-colors" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0F172A]"></span>
            </div>
            <div className="flex items-center gap-3 pl-6 border-l border-slate-700">
               <div className="text-right hidden md:block">
                   <p className="text-sm font-medium text-slate-200">Alex Chen</p>
                   <p className="text-xs text-slate-500">Security Analyst</p>
               </div>
               <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 p-[2px]">
                   <div className="w-full h-full rounded-full bg-[#0F172A] flex items-center justify-center">
                       <UserCircle className="w-5 h-5 text-slate-300" />
                   </div>
               </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-8 relative scroll-smooth">
          {children}
        </main>
      </div>
    </div>
  );
};

const getPageName = (path: string) => {
    switch(path) {
        case '/': return 'Overview';
        case '/analytics': return 'Live Monitor';
        case '/alerts': return 'Threat Alerts';
        case '/guide': return 'Coding Guide';
        case '/about': return 'About System';
        case '/settings': return 'Configuration';
        default: return 'Dashboard';
    }
}

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isOpen: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, isOpen }) => (
  <NavLink 
    to={to}
    className={({ isActive }) => clsx(
      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative overflow-hidden",
      isActive 
        ? "text-white bg-blue-600/10" 
        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
    )}
  >
    {({ isActive }) => (
        <>
            {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full shadow-[0_0_12px_rgba(59,130,246,0.5)]"></div>
            )}
            <span className={clsx("relative z-10 transition-colors", isActive ? "text-blue-400" : "group-hover:text-slate-200")}>
                {icon}
            </span>
            {isOpen && (
                <span className={clsx("font-medium text-sm whitespace-nowrap relative z-10")}>
                    {label}
                </span>
            )}
        </>
    )}
  </NavLink>
);

export default Layout;