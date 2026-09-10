import React, { useState } from 'react';
import { useAppStore, NavTab } from '../../lib/store';
import {
  Sliders,
  Camera,
  CloudRain,
  Crosshair,
  FileVideo,
  BarChart3,
  FileText,
  HelpCircle,
  Code,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const activeTab = useAppStore((state) => state.activeTab);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const [isExpanded, setIsExpanded] = useState(false);

  const navItems: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; group?: string }[] = [
    { id: 'simulation', label: 'Simulation Setup', icon: Sliders, group: 'CORE' },
    { id: 'camera', label: 'Camera Controls', icon: Camera, group: 'CORE' },
    { id: 'disturbances', label: 'Disturbances', icon: CloudRain, group: 'CORE' },
    { id: 'detection', label: 'Detection & Servo', icon: Crosshair, group: 'PIPELINE' },
    { id: 'input', label: 'Benchmark & Video', icon: FileVideo, group: 'PIPELINE' },
    { id: 'performance', label: 'Live Performance', icon: BarChart3, group: 'EVALUATION' },
    { id: 'reports', label: 'Reports & Logs', icon: FileText, group: 'EVALUATION' },
    { id: 'help', label: 'User Manual & Spec', icon: HelpCircle, group: 'SYSTEM' },
    { id: 'code', label: 'Project Files', icon: Code, group: 'SYSTEM' },
  ];

  return (
    <aside
      id="app-sidebar"
      className={`h-screen bg-[#0E0E10] border-r border-[#1F1F23]/40 flex flex-col justify-between transition-all duration-120 z-30 shrink-0 select-none ${
        isExpanded ? 'w-[200px]' : 'w-12'
      }`}
    >
      <div className="flex flex-col flex-1 min-h-0">
        {/* Top spacer to align with 56px TopBar */}
        <div className="h-14 flex items-center justify-center border-b border-[#1F1F23]/40">
          <div className="w-2 h-2 rounded-full bg-[#5B8DEF]" />
        </div>

        {/* Nav Items List */}
        <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  title={!isExpanded ? item.label : undefined}
                  className={`w-full flex items-center h-10 transition-colors duration-120 relative focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5B8DEF] group ${
                    isActive
                      ? 'text-[#5B8DEF] bg-[#17171A]'
                      : 'text-[#8A8A93] hover:text-[#EDEDED] hover:bg-[#17171A]'
                  } ${isExpanded ? 'px-3 gap-3' : 'justify-center'}`}
                >
                  {/* 2px left accent bar */}
                  {isActive && (
                    <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#5B8DEF]" />
                  )}

                  <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.5} />

                  {isExpanded && (
                    <span className="text-[13px] font-medium tracking-tight truncate text-left">
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Expand / Collapse Footer Button */}
      <div className="p-1 border-t border-[#1F1F23]/40">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-full h-9 flex items-center rounded hover:bg-[#17171A] text-[#8A8A93] hover:text-[#EDEDED] transition-colors duration-120 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5B8DEF] ${
            isExpanded ? 'px-2.5 gap-2' : 'justify-center'
          }`}
          title={isExpanded ? 'Collapse Navigation' : 'Expand Navigation'}
        >
          {isExpanded ? (
            <>
              <ChevronLeft className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              <span className="text-[11px] font-medium text-[#8A8A93] uppercase tracking-[0.08em]">
                Collapse
              </span>
            </>
          ) : (
            <ChevronRight className="w-4 h-4 shrink-0" strokeWidth={1.5} />
          )}
        </button>
      </div>
    </aside>
  );
};
