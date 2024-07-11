export type Social = {
    github?: string
    discord?: string
    qq?: string
    wx?: string
    email?: string
    twitter?: string
  }
  
  type SocialValue = {
    href?: string
    title: string
    icon: string
    color: string
  }
  
  const social: Social = {
    github: 'https://github.com/VirtualSelect',
    email: 'mailto:huhohoo@163.com',
    twitter: 'https://x.com/HuHohoo1997',
  }
  
  const socialSet: Record<keyof Social | 'rss', SocialValue> = {
    github: {
      href: social.github,
      title: 'GitHub',
      icon: 'ri:github-line',
      color: '#010409',
    },
    twitter: {
      href: social.twitter,
      title: 'Twitter',
      icon: 'ri:twitter-line',
      color: '#1da1f2',
    },
    discord: {
      href: social.discord,
      title: 'Discord',
      icon: 'ri:discord-line',
      color: '#5A65F6',
    },
    qq: {
      href: social.qq,
      title: 'QQ',
      icon: 'ri:qq-line',
      color: '#1296db',
    },
    wx: {
      href: social.wx,
      title: '微信',
      icon: 'ri:wechat-2-line',
      color: '#07c160',
    },
    email: {
      href: social.email,
      title: '邮箱',
      icon: 'ri:mail-line',
      color: '#D44638',
    },
    rss: {
      href: '/blog/rss.xml',
      title: 'RSS',
      icon: 'ri:rss-line',
      color: '#FFA501',
    },
  }
  
  export default socialSet