import { signal, UIElement, Engine, animate, Easings } from '@canvapps';

export interface PinItem {
  id: string;
  title: string;
  author: string;
  authorHandle: string;
  avatarColor: string;
  src: string;
  height: number;
  aspectRatio: number;
  category: string;
  likes: number;
  isLiked?: boolean;
  isSaved?: boolean;
  tags: string[];
  description: string;
}

export const initialPinsData: PinItem[] = [
  {
    id: 'pin-1',
    title: 'Minimalist Bauhaus Villa',
    author: 'Elena Rostova',
    authorHandle: '@elena.arch',
    avatarColor: '#e11d48',
    src: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=700&auto=format&fit=crop&q=80',
    height: 270,
    aspectRatio: 0.75,
    category: 'Architecture',
    likes: 1420,
    tags: ['#bauhaus', '#minimal', '#concrete'],
    description: 'Monolithic raw concrete lines contrasting with warm natural wood interior aesthetics.',
  },
  {
    id: 'pin-2',
    title: 'Neo-Tokyo Cyberpunk Rain',
    author: 'Kenji Sato',
    authorHandle: '@kenji.visuals',
    avatarColor: '#06b6d4',
    src: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=700&auto=format&fit=crop&q=80',
    height: 320,
    aspectRatio: 0.65,
    category: 'Cyberpunk',
    likes: 2890,
    tags: ['#cyberpunk', '#neon', '#tokyo'],
    description: 'Atmospheric neon drenched alleyway in Shinjuku during midnight rainstorm.',
  },
  {
    id: 'pin-3',
    title: 'Fluid Iridescent Glasswave',
    author: 'Maya Lin',
    authorHandle: '@maya.design',
    avatarColor: '#8b5cf6',
    src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=700&auto=format&fit=crop&q=80',
    height: 180,
    aspectRatio: 1.2,
    category: 'Art & Design',
    likes: 954,
    tags: ['#3d', '#glassmorphism', '#gradient'],
    description: 'Organic caustic refractions simulated in high precision sub-pixel shaders.',
  },
  {
    id: 'pin-4',
    title: 'Misty Alpine Pine Ridge',
    author: 'Lukas Steiner',
    authorHandle: '@lukas.nature',
    avatarColor: '#10b981',
    src: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=700&auto=format&fit=crop&q=80',
    height: 310,
    aspectRatio: 0.67,
    category: 'Nature',
    likes: 3110,
    tags: ['#forest', '#mountains', '#fog'],
    description: 'Sunrise fog rolls over dense alpine evergreen canopies in the Dolomites.',
  },
  {
    id: 'pin-5',
    title: 'High-Fashion Minimal Trench',
    author: 'Clara Dupont',
    authorHandle: '@clara.vogue',
    avatarColor: '#f59e0b',
    src: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=700&auto=format&fit=crop&q=80',
    height: 290,
    aspectRatio: 0.67,
    category: 'Fashion',
    likes: 1870,
    tags: ['#couture', '#editorial', '#minimal'],
    description: 'Autumn runway statement piece with structured geometry and bold saffron tones.',
  },
  {
    id: 'pin-6',
    title: 'Futuristic Spiral Atrium',
    author: 'Zaha Studio',
    authorHandle: '@zaha.forms',
    avatarColor: '#ec4899',
    src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=700&auto=format&fit=crop&q=80',
    height: 280,
    aspectRatio: 0.68,
    category: 'Architecture',
    likes: 2415,
    tags: ['#parametric', '#spiral', '#atrium'],
    description: 'Continuous parametric spiral connecting 8 levels of light-filled open gallery space.',
  },
  {
    id: 'pin-7',
    title: 'Vibrant Acrylic Chromatics',
    author: 'Gabriel Ross',
    authorHandle: '@gabriel.art',
    avatarColor: '#3b82f6',
    src: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=700&auto=format&fit=crop&q=80',
    height: 260,
    aspectRatio: 0.7,
    category: 'Art & Design',
    likes: 1240,
    tags: ['#acrylic', '#colorplay', '#abstract'],
    description: 'Macro pigment suspension capturing microscopic eddies of saturated cobalt and magenta.',
  },
  {
    id: 'pin-8',
    title: 'Cyber Mech Core Reactor',
    author: 'Aoi Kuroda',
    authorHandle: '@aoi.mecha',
    avatarColor: '#14b8a6',
    src: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=700&auto=format&fit=crop&q=80',
    height: 190,
    aspectRatio: 1.1,
    category: 'Cyberpunk',
    likes: 3820,
    tags: ['#mecha', '#scifi', '#hardedge'],
    description: 'High-density computational core housing quantum stabilization chambers.',
  },
  {
    id: 'pin-9',
    title: 'Golden Hour Dolomite Peak',
    author: 'Marco Bellini',
    authorHandle: '@marco.peaks',
    avatarColor: '#f97316',
    src: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=700&auto=format&fit=crop&q=80',
    height: 175,
    aspectRatio: 1.3,
    category: 'Nature',
    likes: 4190,
    tags: ['#dolomites', '#goldenhour', '#alps'],
    description: 'Last rays of alpine sun illuminating jagged limestone cliffs above the cloud layer.',
  },
  {
    id: 'pin-10',
    title: 'Anime Sunset Twilight Cloud',
    author: 'Sora Hayashi',
    authorHandle: '@sora.sky',
    avatarColor: '#a855f7',
    src: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=700&auto=format&fit=crop&q=80',
    height: 285,
    aspectRatio: 0.7,
    category: 'Anime',
    likes: 5620,
    tags: ['#makoto', '#clouds', '#sunset'],
    description: 'Dreamlike cumulus towers glowing under pastel twilight skies.',
  },
  {
    id: 'pin-11',
    title: 'Glass Horizon Infinity Villa',
    author: 'Elena Rostova',
    authorHandle: '@elena.arch',
    avatarColor: '#e11d48',
    src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=700&auto=format&fit=crop&q=80',
    height: 185,
    aspectRatio: 1.25,
    category: 'Architecture',
    likes: 2130,
    tags: ['#villa', '#infinity', '#luxury'],
    description: 'Seamless glass boundaries connecting interior living spaces directly with ocean vistas.',
  },
  {
    id: 'pin-12',
    title: 'Deep Space Nebula Cluster',
    author: 'Cosmo Lab',
    authorHandle: '@cosmo.deep',
    avatarColor: '#6366f1',
    src: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=700&auto=format&fit=crop&q=80',
    height: 270,
    aspectRatio: 0.75,
    category: 'Sci-Fi',
    likes: 3490,
    tags: ['#nebula', '#astronomy', '#deepspace'],
    description: 'Stellar nursery glowing in ionized hydrogen and oxygen emission spectrums.',
  },
];

export const pinsData = signal<PinItem[]>([...initialPinsData]);

export function getPinById(id: string): PinItem | undefined {
  return pinsData.value.find((p) => p.id === id);
}

export function toggleSavePin(pinOrId: PinItem | string, e?: any): void {
  if (e && typeof e.stopPropagation === 'function') {
    e.stopPropagation();
  }
  const id = typeof pinOrId === 'string' ? pinOrId : pinOrId.id;
  pinsData.update((pins) =>
    pins.map((p) => (p.id === id ? { ...p, isSaved: !p.isSaved } : p))
  );
}

export function toggleLikePin(pinOrId: PinItem | string, e?: any): void {
  if (e && typeof e.stopPropagation === 'function') {
    e.stopPropagation();
  }
  const id = typeof pinOrId === 'string' ? pinOrId : pinOrId.id;
  pinsData.update((pins) =>
    pins.map((p) => {
      if (p.id !== id) return p;
      const isLiked = !p.isLiked;
      const likes = isLiked ? p.likes + 1 : Math.max(0, p.likes - 1);
      return { ...p, isLiked, likes };
    })
  );
}

export const pintertestScrollPosition = signal<number>(0);
let activeScrollTween: (() => void) | null = null;

export function savePintertestScroll(): void {
  const scrollEl = UIElement.getElementById('app-layout-scroll');
  if (scrollEl) {
    pintertestScrollPosition.value = scrollEl.scrollTop;
  }
}

export function resetScrollToTop(): void {
  const scrollEl = UIElement.getElementById('app-layout-scroll');
  if (!scrollEl) return;

  if (activeScrollTween) {
    activeScrollTween();
    activeScrollTween = null;
  }

  scrollEl.scrollTop = 0;
  Engine.invalidateActive();
}

export function smoothScrollToTop(duration = 420): void {
  const scrollEl = UIElement.getElementById('app-layout-scroll');
  if (!scrollEl) return;

  if (activeScrollTween) {
    activeScrollTween();
    activeScrollTween = null;
  }

  const start = scrollEl.scrollTop;
  if (start <= 0) return;

  activeScrollTween = animate({
    from: start,
    to: 0,
    duration,
    easing: Easings.easeOutCubic,
    onUpdate: (val) => {
      scrollEl.scrollTop = val;
      Engine.invalidateActive();
    },
    onComplete: () => {
      scrollEl.scrollTop = 0;
      Engine.invalidateActive();
      activeScrollTween = null;
    },
  });
}

export function restorePintertestScroll(duration = 0): void {
  const scrollEl = UIElement.getElementById('app-layout-scroll');
  if (!scrollEl) return;

  if (activeScrollTween) {
    activeScrollTween();
    activeScrollTween = null;
  }

  const target = pintertestScrollPosition.value;
  if (duration <= 0) {
    scrollEl.scrollTop = target;
    Engine.invalidateActive();
  } else {
    const start = scrollEl.scrollTop;
    activeScrollTween = animate({
      from: start,
      to: target,
      duration,
      easing: Easings.easeOutCubic,
      onUpdate: (val) => {
        scrollEl.scrollTop = val;
        Engine.invalidateActive();
      },
      onComplete: () => {
        scrollEl.scrollTop = target;
        Engine.invalidateActive();
        activeScrollTween = null;
      },
    });
  }
}
