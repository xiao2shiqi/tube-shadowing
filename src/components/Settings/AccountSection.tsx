import { useState } from 'react';
import { Loader2, Github } from 'lucide-react';
import type { User } from '../../services/authService';
import { updateProfile } from '../../services/authService';

interface AccountSectionProps {
  user: User;
  onUserUpdate: (user: User) => void;
  onToast: (message: string) => void;
}

export default function AccountSection({ user, onUserUpdate, onToast }: AccountSectionProps) {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [saving, setSaving] = useState(false);

  const isGithub = user.sub.startsWith('github:');
  const dirty = displayName.trim() !== (user.displayName || '').trim();

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateProfile(displayName.trim());
      onUserUpdate(updated);
      onToast('个人信息已保存');
    } catch (err) {
      onToast(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        {user.picture ? (
          <img
            src={user.picture}
            alt=""
            className="w-12 h-12 rounded-full border border-line"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-hovered border border-line-strong" />
        )}
        <div className="min-w-0">
          <div className="text-sm text-ink truncate">{user.name}</div>
          <div className="text-xs text-ink-mute truncate">{user.email}</div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-soft mb-1.5">显示名称</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={user.name}
          maxLength={60}
          className="w-full bg-hovered border border-line-strong rounded-md px-3 py-2 text-sm text-ink placeholder-ink-mute outline-none focus:border-line-strong"
        />
        <p className="mt-1 text-xs text-ink-mute">
          留空则使用登录账号的名称。重新登录不会覆盖你在这里填的名字。
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-soft mb-1.5">登录方式</label>
        <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-hovered border border-line-strong text-xs text-ink-soft">
          {isGithub ? (
            <>
              <Github className="w-3.5 h-3.5" />
              GitHub
            </>
          ) : (
            <>
              <span className="w-3.5 h-3.5 flex items-center justify-center font-bold text-[11px]">
                G
              </span>
              Google
            </>
          )}
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium btn-primary rounded-md transition-colors disabled:opacity-40 disabled:hover:bg-btn"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          保存
        </button>
      </div>
    </div>
  );
}
