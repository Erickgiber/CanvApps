import { signal, UIElement, Engine, animate, Easings } from '@canvapps';

export interface GalleryItem {
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

export const initialGalleryData: GalleryItem[] = [

  {
    id: 'art-1',
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
    id: 'art-2',
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
    id: 'art-3',
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
    id: 'art-4',
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
    id: 'art-5',
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
    id: 'art-6',
    title: 'Futuristic Spiral Atrium',
    author: 'Zaha Studio',
    authorHandle: '@zaha.forms',
    avatarColor: '#ec4899',
    src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=700&auto=format&fit=crop&q=80',
    height: 280,
    aspectRatio: 0.68,
    category: 'Architecture',
    likes: 2450,
    tags: ['#parametric', '#interior', '#parametric'],
    description: 'Dynamic curving parametric bridges creating natural lighting shafts through center volume.',
  },
  {
    id: 'art-7',
    title: 'Chromatic Cyber Samurai',
    author: 'Hiroshi Tanaka',
    authorHandle: '@hiroshi.art',
    avatarColor: '#6366f1',
    src: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=700&auto=format&fit=crop&q=80',
    height: 340,
    aspectRatio: 0.6,
    category: 'Anime',
    likes: 4120,
    tags: ['#katana', '#hologram', '#synthwave'],
    description: 'Cybernetic ronin navigating the high altitude skyways of Neo-Kyoto.',
  },
  {
    id: 'art-8',
    title: 'Orbital Habitat Centrifuge',
    author: 'Dr. Sarah Vance',
    authorHandle: '@sarah.orbit',
    avatarColor: '#14b8a6',
    src: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=700&auto=format&fit=crop&q=80',
    height: 200,
    aspectRatio: 1.1,
    category: 'Sci-Fi',
    likes: 3670,
    tags: ['#space', '#station', '#earth'],
    description: 'Rotating torus station providing artificial gravity over low Earth orbit aurora lights.',
  },
  {
    id: 'art-9',
    title: 'Nordic Slate & Glass Cabin',
    author: 'Freja Lindqvist',
    authorHandle: '@freja.nordic',
    avatarColor: '#0ea5e9',
    src: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=700&auto=format&fit=crop&q=80',
    height: 260,
    aspectRatio: 0.77,
    category: 'Architecture',
    likes: 1980,
    tags: ['#nordic', '#cabin', '#norway'],
    description: 'Cantilevered glass pavilion facing the dramatic peaks of the Lofoten archipelago.',
  },
  {
    id: 'art-10',
    title: 'Emerald Forest Waterfall Mist',
    author: 'Mateo Rossi',
    authorHandle: '@mateo.wild',
    avatarColor: '#84cc16',
    src: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=700&auto=format&fit=crop&q=80',
    height: 310,
    aspectRatio: 0.65,
    category: 'Nature',
    likes: 2780,
    tags: ['#waterfall', '#moss', '#jungle'],
    description: 'Cascading pristine glacial river cutting through ancient temperate rain forest gorge.',
  },
  {
    id: 'art-11',
    title: 'Abstract Kinetic Sculpture',
    author: 'Solomon K.',
    authorHandle: '@solomon.kinetic',
    avatarColor: '#a855f7',
    src: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=700&auto=format&fit=crop&q=80',
    height: 220,
    aspectRatio: 1.0,
    category: 'Art & Design',
    likes: 1340,
    tags: ['#acrylic', '#motion', '#fluid'],
    description: 'Continuous smooth surface deformations computed in real time on canvas.',
  },
  {
    id: 'art-12',
    title: 'Vaporwave Neon Horizon',
    author: 'Kira Thorne',
    authorHandle: '@kira.wave',
    avatarColor: '#f43f5e',
    src: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=700&auto=format&fit=crop&q=80',
    height: 280,
    aspectRatio: 0.71,
    category: 'Cyberpunk',
    likes: 3890,
    tags: ['#vaporwave', '#sunset', '#grid'],
    description: 'Retro-futuristic perspective wireframe plane receding into neon magenta sunset.',
  },
];

export const galleryData = signal<GalleryItem[]>(initialGalleryData);

export function toggleSaveGalleryItem(itemOrId: GalleryItem | string, e?: any): void {
  if (e && typeof e.stopPropagation === 'function') {
    e.stopPropagation();
  }
  const id = typeof itemOrId === 'string' ? itemOrId : itemOrId.id;
  galleryData.update((items) =>
    items.map((item) => {
      if (item.id !== id) return item;
      return { ...item, isSaved: !item.isSaved };
    })
  );
}

export function toggleLikeGalleryItem(itemOrId: GalleryItem | string, e?: any): void {
  if (e && typeof e.stopPropagation === 'function') {
    e.stopPropagation();
  }
  const id = typeof itemOrId === 'string' ? itemOrId : itemOrId.id;
  galleryData.update((items) =>
    items.map((item) => {
      if (item.id !== id) return item;
      const isLiked = !item.isLiked;
      const likes = isLiked ? item.likes + 1 : Math.max(0, item.likes - 1);
      return { ...item, isLiked, likes };
    })
  );
}

export const categories = ['All', 'Architecture', 'Cyberpunk', 'Art & Design', 'Nature', 'Fashion', 'Anime', 'Sci-Fi'];
export const activeCategory = signal<string>('All');
export const searchQuery = signal<string>('');

export const galleryScrollPosition = signal<number>(0);
let activeScrollTween: (() => void) | null = null;

export function saveGalleryScroll(): void {
  const scrollEl = UIElement.getElementById('app-layout-scroll');
  if (scrollEl) {
    galleryScrollPosition.value = scrollEl.scrollTop;
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

export function restoreGalleryScroll(duration = 0): void {
  const scrollEl = UIElement.getElementById('app-layout-scroll');
  if (!scrollEl) return;

  if (activeScrollTween) {
    activeScrollTween();
    activeScrollTween = null;
  }

  const target = galleryScrollPosition.value;
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

