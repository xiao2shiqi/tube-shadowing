import React from 'react';

/**
 * xiao27 站点品牌标 —— 三个站共用同一个壳
 * 黑底方块 + 站点图标 + 站名 + 返回 hub 的路径提示
 */
interface SiteMarkProps {
  /** 站点名，如 "Tube Shadowing" */
  name: string;
  /** 站点图标路径，默认取各站 public 下的 favicon.svg */
  icon?: string;
}

export const SiteMark: React.FC<SiteMarkProps> = ({ name, icon = '/favicon.svg' }) => (
  <a
    href="https://xiao27.com"
    className="group flex items-center gap-2.5 shrink-0"
    title="返回 phoenix hub"
  >
    <img src={icon} alt="" width={32} height={32} className="w-8 h-8 rounded-md" />
    <span className="hidden sm:flex items-center gap-1.5 whitespace-nowrap">
      <span className="text-sm font-semibold tracking-wide text-ink group-hover:text-ink transition-colors">
        {name}
      </span>
      <span className="text-xs font-mono text-ink-mute group-hover:text-ink-soft transition-colors">
        / xiao27
      </span>
    </span>
  </a>
);
