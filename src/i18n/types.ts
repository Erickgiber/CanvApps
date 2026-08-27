/**
 * CanvApps i18n Translation Schema & Type Definitions
 */

export type Locale = 'es' | 'en';

export interface TranslationSchema {
  common: {
    back: string;
    close: string;
    save: string;
    saved: string;
    like: string;
    liked: string;
    loading: string;
    search: string;
    searchPlaceholder: string;
    copy: string;
    copied: string;
    all: string;
    follow: string;
    fps: string;
    mitLicense: string;
  };
  header: {
    fpsBadge: string;
    navHome: string;
    navDocs: string;
    navShowcases: string;
    navGallery: string;
    navMusic: string;
    soundOn: string;
    soundOff: string;
    themeDark: string;
    themeLight: string;
    github: string;
    langButton: string;
  };
  breadcrumb: {
    home: string;
    docs: string;
    showcases: string;
    gallery: string;
    galleryDetail: string;
    music: string;
    notFound: string;
  };
  home: {
    badge: string;
    heroTitle: string;
    heroSubtitle: string;
    installCommand: string;
    copyCommand: string;
    copiedCommand: string;
    gameTitle: string;
    gamePlaying: string;
    gameVictory: string;
    gameOver: string;
    gameTime: string;
    gameScore: string;
    gameHighScore: string;
    gameLaunchBtn: string;
    gameRestartBtn: string;
    gameSpeedSlow: string;
    gameSpeedNormal: string;
    gameSpeedFast: string;
    gameSpeedUltra: string;
    featuresTitle: string;
    card1Title: string;
    card1Desc: string;
    card2Title: string;
    card2Desc: string;
    card3Title: string;
    card3Desc: string;
    card4Title: string;
    card4Desc: string;
    card5Title: string;
    card5Desc: string;
    card6Title: string;
    card6Desc: string;
    footerTitle: string;
  };
  docs: {
    tabs: {
      quickstart: string;
      components: string;
      attributes: string;
      layout: string;
      signals: string;
      cli: string;
    };
    quickstart: {
      title: string;
      subtitle: string;
      step1Title: string;
      step1Desc: string;
      step2Title: string;
      step2Desc: string;
      step3Title: string;
      step3Desc: string;
      interactiveDemoTitle: string;
      interactiveDemoDesc: string;
      counterLabel: string;
      incrementBtn: string;
      resetBtn: string;
    };
    components: {
      title: string;
      subtitle: string;
      viewDesc: string;
      textDesc: string;
      buttonDesc: string;
      imageDesc: string;
      inputDesc: string;
      sliderDesc: string;
      selectDesc: string;
      modalDesc: string;
      motionDesc: string;
      demoButtonLabel: string;
      demoSliderLabel: string;
      demoOpenModalBtn: string;
      demoModalTitle: string;
      demoModalText: string;
      demoModalCloseBtn: string;
    };
    attributes: {
      title: string;
      subtitle: string;
      colProp: string;
      colType: string;
      colDefault: string;
      colDesc: string;
      table: Array<{
        prop: string;
        type: string;
        def: string;
        desc: string;
      }>;
    };
    layout: {
      title: string;
      subtitle: string;
      boxModelTitle: string;
      boxModelDesc: string;
      flexDirectionTitle: string;
      flexDirectionDesc: string;
      responsiveTitle: string;
      responsiveDesc: string;
    };
    signals: {
      title: string;
      subtitle: string;
      signalsIntroTitle: string;
      signalsIntroDesc: string;
      computedTitle: string;
      computedDesc: string;
      storesTitle: string;
      storesDesc: string;
    };
    cli: {
      title: string;
      subtitle: string;
      devCommandTitle: string;
      devCommandDesc: string;
      buildCommandTitle: string;
      buildCommandDesc: string;
      targetsTitle: string;
      targetsDesc: string;
    };
    codeComments: {
      createApp: string;
      enterDir: string;
      installDeps: string;
      startDev: string;
      buildPwa: string;
      defineSignal: string;
      defineComputed: string;
      updateSignal: string;
      createStore: string;
    };
  };
  showcase: {
    title: string;
    subtitle: string;
    galleryTitle: string;
    galleryTag: string;
    galleryDesc: string;
    galleryAction: string;
    musicTitle: string;
    musicTag: string;
    musicDesc: string;
    musicAction: string;
  };
  gallery: {
    title: string;
    subtitle: string;
    badgeCount: string;
    searchPlaceholder: string;
    allCategory: string;
    categories: {
      all: string;
      architecture: string;
      nature: string;
      abstract: string;
      minimalism: string;
      urban: string;
    };
    saveBtn: string;
    savedBtn: string;
    likeBtn: string;
    likedBtn: string;
    followBtn: string;
    categoryLabel: string;
    modalClose: string;
  };
  galleryDetail: {
    backBtn: string;
    saveBtn: string;
    savedBtn: string;
    likeBtn: string;
    likedBtn: string;
    followBtn: string;
    hardwareTag: string;
    notFoundTitle: string;
    notFoundDesc: string;
    notFoundBackBtn: string;
  };
  music: {
    title: string;
    brandTitle: string;
    statusPlaying: string;
    statusPaused: string;
    tabPlayer: string;
    tabQueue: string;
    tabLyrics: string;
    tabFx: string;
    queueTitle: string;
    searchPlaceholder: string;
    genres: {
      all: string;
      electronic: string;
      ambient: string;
      chillout: string;
      lofi: string;
    };
    lyricsTitle: string;
    lyricsSyncTag: string;
    fxTitle: string;
    dspTag: string;
    presetNormal: string;
    presetBass: string;
    presetLofi: string;
    spectrumTitle: string;
    spectrumLive: string;
    spectrumIdle: string;
  };
  notFound: {
    title: string;
    subtitle: string;
    description: string;
    targetUrl: string;
    homeButton: string;
    showcasesButton: string;
    backHomeBtn: string;
  };
}
