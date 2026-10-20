const SOCIAL_LINKS = {
  github: {
    href: "https://github.com/HarrisonDo/sonic-relics",
    label: "GitHub",
    description: "在 GitHub 查看声物源码",
    hint: "让灵感接通电流 ↗",
  },
  bilibili: {
    href: "https://space.bilibili.com/3659712",
    label: "B 站",
    description: "访问作者的 B 站主页",
    hint: "换个频道，继续同频 ↗",
  },
  xiaohongshu: {
    href: "https://xhslink.cn/o/1Nd57Kgvp6a",
    label: "小红书",
    description: "访问作者的小红书主页",
    hint: "翻到生活的另一面 ↗",
  },
};

export function SocialLink({
  platform,
}: {
  platform: keyof typeof SOCIAL_LINKS;
}) {
  const link = SOCIAL_LINKS[platform];

  return (
    <a
      className={`social-link ${platform}-link`}
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${link.description}（在新窗口打开）`}
    >
      <span className="social-icon" aria-hidden="true">
        <span className="platform-mark" />
        {platform === "github" && (
          <svg className="github-lightning" viewBox="-12 -12 48 48" fill="none">
            <path d="m1-8-5 8h5l-4 8" pathLength="1" />
            <path d="m29 3-5 7h5l-5 8" pathLength="1" />
            <path d="m10 23-4 6h4l-3 6" pathLength="1" />
          </svg>
        )}
        {platform === "bilibili" && <span className="bilibili-static" />}
      </span>
      <span className="social-label">{link.label}</span>
      <span className="social-tooltip" aria-hidden="true">
        {link.hint}
      </span>
    </a>
  );
}
