import modelPriaStudio from "../assets/images/model_pria_studio_1794795791374.jpg";
import modelWanitaStudio from "../assets/images/model_wanita_studio_1794795792780.jpg";
import modelHijabStudio from "../assets/images/model_wanita_hijab_studio_1794795793021.jpg";

export type BatikRegion =
  | "all"
  | "jawa_klasik"
  | "pesisir_madura"
  | "nusantara_timur";

export type GarmentSlot = "top" | "bottom" | "outer" | "fullset" | "accessory";

export interface BatikMotif {
  id: string;
  name: string;
  origin: string;
  region: Exclude<BatikRegion, "all">;
  regionLabel: string;
  philosophy: string;
  patternType:
    | "parang"
    | "kawung"
    | "megamendung"
    | "sidomukti"
    | "sekarjagad"
    | "truntum"
    | "tujuhrupa"
    | "gentongan"
    | "tiganegeri"
    | "bali_prapen"
    | "dayak"
    | "cendrawasih";
  colors: {
    base: string;
    primary: string;
    secondary: string;
    accent: string;
  };
}

export interface BatikColorMode {
  id: string;
  name: string;
  colors: {
    base: string;
    primary: string;
    secondary: string;
    accent: string;
  } | null; // null means use motif's authentic original palette
}

export interface GarmentItem {
  id: string;
  slot: GarmentSlot;
  name: string;
  cutTag: string;
  shape:
    | "kemeja_panjang"
    | "kemeja_pendek"
    | "kebaya_kutubaru"
    | "tunik_modern"
    | "blouse_peplum"
    | "rok_jarik"
    | "rok_span"
    | "celana_kulot"
    | "celana_bahan"
    | "blazer_batik"
    | "kimono_outer"
    | "selendang_sampur"
    | "dress_gamis"
    | "beskap_set"
    | "sarimbit_set"
    | "peci"
    | "blangkon"
    | "hijab_senada"
    | "tas_tenun";
  usesBatikPattern: boolean;
  solidFallbackColor?: string;
  desc: string;
}

export interface DetectedPose {
  torsoCenterX: number;
  torsoCenterY: number;
  shoulderWidthRatio: number;
  torsoHeightRatio: number;
  tiltDeg: number;
  bodyTurnDeg: number;
  poseLabel: string;
  detectedSubjectType: string;
}

export interface SampleStudioModel {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  defaultPose: DetectedPose;
  recommendedSlotCutId: string;
}

export const BATIK_REGIONS: Array<{ id: BatikRegion; label: string }> = [
  { id: "all", label: "Semua" },
  { id: "jawa_klasik", label: "Jawa Klasik" },
  { id: "pesisir_madura", label: "Pesisir & Madura" },
  { id: "nusantara_timur", label: "Nusantara" },
];

export const BATIK_MOTIFS: BatikMotif[] = [
  {
    id: "parang_rusak",
    name: "Parang Rusak Barong",
    origin: "Yogyakarta & Solo",
    region: "jawa_klasik",
    regionLabel: "Jawa Klasik",
    philosophy: "Bilah diagonal ombak samudra simbol keteguhan jiwa",
    patternType: "parang",
    colors: {
      base: "#241710",
      primary: "#EFE3C8",
      secondary: "#9D5B2B",
      accent: "#D99B26",
    },
  },
  {
    id: "kawung_keraton",
    name: "Kawung Keraton",
    origin: "Yogyakarta",
    region: "jawa_klasik",
    regionLabel: "Jawa Klasik",
    philosophy: "Empat kelopak simetris simbol kesucian & kebijaksanaan",
    patternType: "kawung",
    colors: {
      base: "#2B190E",
      primary: "#EAD7B7",
      secondary: "#A66A32",
      accent: "#E5B45B",
    },
  },
  {
    id: "mega_mendung",
    name: "Mega Mendung",
    origin: "Cirebon",
    region: "pesisir_madura",
    regionLabel: "Pesisir & Madura",
    philosophy: "Awan berarak tujuh gradasi biru simbol keteduhan hati",
    patternType: "megamendung",
    colors: {
      base: "#0F294A",
      primary: "#2563EB",
      secondary: "#60A5FA",
      accent: "#E0F2FE",
    },
  },
  {
    id: "sido_mukti",
    name: "Sido Mukti",
    origin: "Surakarta",
    region: "jawa_klasik",
    regionLabel: "Jawa Klasik",
    philosophy: "Sayap garuda & meru pembawa keluhuran dan kemakmuran",
    patternType: "sidomukti",
    colors: {
      base: "#331C10",
      primary: "#C9893B",
      secondary: "#F2E2C4",
      accent: "#7C3F19",
    },
  },
  {
    id: "sekar_jagad",
    name: "Sekar Jagad",
    origin: "Solo & Yogyakarta",
    region: "jawa_klasik",
    regionLabel: "Jawa Klasik",
    philosophy: "Mozaik pulau bunga lambang keindahan keragaman dunia",
    patternType: "sekarjagad",
    colors: {
      base: "#1F1713",
      primary: "#B45309",
      secondary: "#1E5648",
      accent: "#F3DFB8",
    },
  },
  {
    id: "truntum",
    name: "Truntum Bintang",
    origin: "Surakarta",
    region: "jawa_klasik",
    regionLabel: "Jawa Klasik",
    philosophy: "Taburan bunga tanjung bak bintang malam penuntun kasih",
    patternType: "truntum",
    colors: {
      base: "#171412",
      primary: "#D6A656",
      secondary: "#F5EAD4",
      accent: "#8C5828",
    },
  },
  {
    id: "tujuh_rupa",
    name: "Tujuh Rupa Buketan",
    origin: "Pekalongan",
    region: "pesisir_madura",
    regionLabel: "Pesisir & Madura",
    philosophy: "Ragam flora pesisir cerah hasil akulturasi maritim",
    patternType: "tujuhrupa",
    colors: {
      base: "#F5ECD8",
      primary: "#9F1239",
      secondary: "#166534",
      accent: "#D97706",
    },
  },
  {
    id: "gentongan",
    name: "Gentongan Madura",
    origin: "Tanjung Bumi, Madura",
    region: "pesisir_madura",
    regionLabel: "Pesisir & Madura",
    philosophy: "Pewarnaan rendam gentong pekat merah marun dan emas",
    patternType: "gentongan",
    colors: {
      base: "#4C0D14",
      primary: "#EAB308",
      secondary: "#FDF3D7",
      accent: "#1C1917",
    },
  },
  {
    id: "tiga_negeri",
    name: "Tiga Negeri Lasem",
    origin: "Lasem, Rembang",
    region: "pesisir_madura",
    regionLabel: "Pesisir & Madura",
    philosophy: "Akulturasi merah mengkudu Lasem, biru Pekalongan, soga Solo",
    patternType: "tiganegeri",
    colors: {
      base: "#6B1225",
      primary: "#1D4ED8",
      secondary: "#F5E6C8",
      accent: "#B45309",
    },
  },
  {
    id: "bali_prapen",
    name: "Prapen Singa Barong",
    origin: "Gianyar, Bali",
    region: "nusantara_timur",
    regionLabel: "Nusantara",
    philosophy: "Ukiran patra Bali berbalut prada emas yang berwibawa",
    patternType: "bali_prapen",
    colors: {
      base: "#1C1512",
      primary: "#E5B44D",
      secondary: "#991B1B",
      accent: "#FEF3C7",
    },
  },
  {
    id: "dayak_garing",
    name: "Batang Garing Dayak",
    origin: "Kalimantan Tengah",
    region: "nusantara_timur",
    regionLabel: "Nusantara",
    philosophy: "Pohon kehidupan dan ukiran talawang Kalimantan",
    patternType: "dayak",
    colors: {
      base: "#123524",
      primary: "#FACC15",
      secondary: "#DC2626",
      accent: "#ECFDF5",
    },
  },
  {
    id: "cendrawasih_papua",
    name: "Cendrawasih Papua",
    origin: "Jayapura, Papua",
    region: "nusantara_timur",
    regionLabel: "Nusantara",
    philosophy: "Siluet burung surga Cendrawasih dan ukiran etnik Papua",
    patternType: "cendrawasih",
    colors: {
      base: "#3E1B11",
      primary: "#F59E0B",
      secondary: "#FEF08A",
      accent: "#1F1B18",
    },
  },
];

export const BATIK_COLOR_MODES: BatikColorMode[] = [
  { id: "authentic", name: "Warna Asli Motif", colors: null },
  {
    id: "soga_klasik",
    name: "Soga Keraton",
    colors: {
      base: "#29180D",
      primary: "#E6CFA6",
      secondary: "#9A5B25",
      accent: "#D49B35",
    },
  },
  {
    id: "indigo_malam",
    name: "Indigo Malam",
    colors: {
      base: "#0F1E3A",
      primary: "#93C5FD",
      secondary: "#1D4ED8",
      accent: "#F0F9FF",
    },
  },
  {
    id: "mengkudu_lasem",
    name: "Merah Mengkudu",
    colors: {
      base: "#5E101D",
      primary: "#FBE5C8",
      secondary: "#B91C1C",
      accent: "#F59E0B",
    },
  },
  {
    id: "zamrud_borneo",
    name: "Hijau Zamrud",
    colors: {
      base: "#0F2E22",
      primary: "#D1FAE5",
      secondary: "#059669",
      accent: "#EAB308",
    },
  },
  {
    id: "prada_hitam",
    name: "Hitam Prada Emas",
    colors: {
      base: "#141312",
      primary: "#E5B44D",
      secondary: "#785722",
      accent: "#FAF3E0",
    },
  },
];

export const GARMENT_SLOTS: Array<{ id: GarmentSlot; name: string }> = [
  { id: "top", name: "Atasan" },
  { id: "bottom", name: "Bawahan" },
  { id: "outer", name: "Outer" },
  { id: "fullset", name: "Setelan" },
  { id: "accessory", name: "Aksesori" },
];

export const GARMENT_ITEMS: Record<GarmentSlot, GarmentItem[]> = {
  top: [
    {
      id: "top_kemeja_panjang",
      slot: "top",
      name: "Kemeja Batik Lengan Panjang",
      cutTag: "Formal",
      shape: "kemeja_panjang",
      usesBatikPattern: true,
      desc: "Potongan slim-tailored berkerah resmi untuk acara formal & kantor",
    },
    {
      id: "top_kemeja_pendek",
      slot: "top",
      name: "Kemeja Batik Lengan Pendek",
      cutTag: "Kasual",
      shape: "kemeja_pendek",
      usesBatikPattern: true,
      desc: "Kemeja batik lengan pendek rapi dan sejuk",
    },
    {
      id: "top_kebaya",
      slot: "top",
      name: "Kebaya Kutubaru Batik",
      cutTag: "Adat",
      shape: "kebaya_kutubaru",
      usesBatikPattern: true,
      desc: "Siluet kebaya kutubaru klasik dengan panel dada anggun",
    },
    {
      id: "top_tunik",
      slot: "top",
      name: "Tunik Batik Modern",
      cutTag: "Modest",
      shape: "tunik_modern",
      usesBatikPattern: true,
      desc: "Atasan tunik panjang nyaman untuk gaya berhijab & kontemporer",
    },
    {
      id: "top_blouse",
      slot: "top",
      name: "Blouse Peplum Batik",
      cutTag: "Elegan",
      shape: "blouse_peplum",
      usesBatikPattern: true,
      desc: "Blouse wanita berpinggang ramping dengan aksen lipit",
    },
  ],
  bottom: [
    {
      id: "bot_jarik",
      slot: "bottom",
      name: "Rok Kain Lilit Jarik",
      cutTag: "Adat",
      shape: "rok_jarik",
      usesBatikPattern: true,
      desc: "Kain jarik lilit tradisional bernuansa keraton",
    },
    {
      id: "bot_span",
      slot: "bottom",
      name: "Rok Span Batik Modern",
      cutTag: "Formal",
      shape: "rok_span",
      usesBatikPattern: true,
      desc: "Rok span rapi setinggi mata kaki untuk paduan kebaya atau blouse",
    },
    {
      id: "bot_kulot",
      slot: "bottom",
      name: "Celana Kulot Batik",
      cutTag: "Kasual",
      shape: "celana_kulot",
      usesBatikPattern: true,
      desc: "Kulot longgar berpotongan modern dan dinamis",
    },
    {
      id: "bot_bahan",
      slot: "bottom",
      name: "Celana Bahan Hitam Polos",
      cutTag: "Formal",
      shape: "celana_bahan",
      usesBatikPattern: false,
      solidFallbackColor: "#1B1B1E",
      desc: "Celana kain gelap netral penyeimbang kemeja batik",
    },
  ],
  outer: [
    {
      id: "out_blazer",
      slot: "outer",
      name: "Blazer / Jas Batik Terbuka",
      cutTag: "Eksekutif",
      shape: "blazer_batik",
      usesBatikPattern: true,
      desc: "Blazer berkerah lapel dengan motif batik kontemporer",
    },
    {
      id: "out_kimono",
      slot: "outer",
      name: "Outer Cardigan Batik",
      cutTag: "Modern",
      shape: "kimono_outer",
      usesBatikPattern: true,
      desc: "Luaran tanpa kancing bergaya kasual chic",
    },
    {
      id: "out_selendang",
      slot: "outer",
      name: "Selendang Batik Sampur",
      cutTag: "Adat",
      shape: "selendang_sampur",
      usesBatikPattern: true,
      desc: "Selendang batik tersampir elegan di bahu",
    },
  ],
  fullset: [
    {
      id: "full_gamis",
      slot: "fullset",
      name: "Dress / Gamis Batik Panjang",
      cutTag: "Resmi",
      shape: "dress_gamis",
      usesBatikPattern: true,
      desc: "Terusan batik panjang mengalir anggun dari bahu hingga mata kaki",
    },
    {
      id: "full_sarimbit",
      slot: "fullset",
      name: "Setelan Kemeja & Jarik Senada",
      cutTag: "Adat",
      shape: "sarimbit_set",
      usesBatikPattern: true,
      desc: "Paduan lengkap atasan dan kain bawahan batik senada",
    },
    {
      id: "full_beskap",
      slot: "fullset",
      name: "Setelan Beskap & Kain Batik",
      cutTag: "Keraton",
      shape: "beskap_set",
      usesBatikPattern: true,
      desc: "Beskap resmi dipadukan kain batik tradisional",
    },
  ],
  accessory: [
    {
      id: "acc_peci",
      slot: "accessory",
      name: "Peci Hitam Nasional",
      cutTag: "Resmi",
      shape: "peci",
      usesBatikPattern: false,
      solidFallbackColor: "#141416",
      desc: "Pelengkap busana batik pria nasional",
    },
    {
      id: "acc_blangkon",
      slot: "accessory",
      name: "Blangkon Motif Batik",
      cutTag: "Adat",
      shape: "blangkon",
      usesBatikPattern: true,
      desc: "Tutup kepala adat Jawa bermotif senada",
    },
    {
      id: "acc_hijab",
      slot: "accessory",
      name: "Hijab Pashmina Senada",
      cutTag: "Modest",
      shape: "hijab_senada",
      usesBatikPattern: false,
      solidFallbackColor: "#8E6E53",
      desc: "Hijab polos serasi dengan warna dasar batik",
    },
    {
      id: "acc_tas",
      slot: "accessory",
      name: "Tas Clutch Batik Nusantara",
      cutTag: "Pesta",
      shape: "tas_tenun",
      usesBatikPattern: true,
      desc: "Tas jinjing motif batik aksen kulit",
    },
  ],
};

export const SAMPLE_STUDIO_MODELS: SampleStudioModel[] = [
  {
    id: "model_pria",
    name: "Arga — Studio Pria",
    category: "Pose 3/4 Santai",
    imageUrl: modelPriaStudio,
    recommendedSlotCutId: "top_kemeja_panjang",
    defaultPose: {
      torsoCenterX: 0.515,
      torsoCenterY: 0.34,
      shoulderWidthRatio: 0.28,
      torsoHeightRatio: 0.27,
      tiltDeg: 2,
      bodyTurnDeg: 10,
      poseLabel: "Pose 3/4 Tangan di Saku",
      detectedSubjectType: "pria",
    },
  },
  {
    id: "model_wanita",
    name: "Kirana — Studio Wanita",
    category: "Pose Tegak Anggun",
    imageUrl: modelWanitaStudio,
    recommendedSlotCutId: "top_kebaya",
    defaultPose: {
      torsoCenterX: 0.495,
      torsoCenterY: 0.345,
      shoulderWidthRatio: 0.245,
      torsoHeightRatio: 0.255,
      tiltDeg: -1,
      bodyTurnDeg: 4,
      poseLabel: "Berdiri Tegak Tangan di Pinggang",
      detectedSubjectType: "wanita",
    },
  },
  {
    id: "model_hijab",
    name: "Nadia — Studio Berhijab",
    category: "Pose Modest Tegak",
    imageUrl: modelHijabStudio,
    recommendedSlotCutId: "top_tunik",
    defaultPose: {
      torsoCenterX: 0.495,
      torsoCenterY: 0.37,
      shoulderWidthRatio: 0.265,
      torsoHeightRatio: 0.3,
      tiltDeg: 0,
      bodyTurnDeg: -4,
      poseLabel: "Berdiri Tegak Modest",
      detectedSubjectType: "berhijab",
    },
  },
];
