export interface ProductPresentation {
  name: string; // 'balon' | 'bomba' | 'proveedor' | 'unidad' | 'balde'
  label: string;
  price: number;
}

export interface CatalogProduct {
  id: string;
  name: string;
  category: "Verde" | "Blanco";
  imageType: "mamitas" | "tornillos" | "baldes" | "gordos" | "minis" | "largos" | "promo";
  defaultPrice: number;
  stock: number;
  presentations: ProductPresentation[];
  description?: string;
}

export const CATALOG_PRODUCTS: CatalogProduct[] = [
  // CATEGORIA: VERDE
  {
    id: "prod-gordos",
    name: "Gordos",
    category: "Verde",
    imageType: "gordos",
    defaultPrice: 3400,
    stock: 26,
    description: "Producto Verde - Presentación Gordo",
    presentations: [
      { name: "balon", label: "Balón", price: 255000 },
      { name: "proveedor", label: "Proveedor", price: 17000 },
      { name: "unidad", label: "Unidad", price: 3400 },
    ],
  },
  {
    id: "prod-minis",
    name: "Minis",
    category: "Verde",
    imageType: "minis",
    defaultPrice: 1571,
    stock: 45,
    description: "Producto Verde - Presentación Mini",
    presentations: [
      { name: "balon", label: "Balón", price: 110000 },
      { name: "proveedor", label: "Proveedor", price: 11000 },
      { name: "unidad", label: "Unidad", price: 1571 },
    ],
  },
  {
    id: "prod-largos",
    name: "Largos",
    category: "Verde",
    imageType: "largos",
    defaultPrice: 4000,
    stock: 18,
    description: "Producto Verde - Presentación Largo",
    presentations: [
      { name: "balon", label: "Balón", price: 300000 },
      { name: "proveedor", label: "Proveedor", price: 20000 },
      { name: "unidad", label: "Unidad", price: 4000 },
    ],
  },
  {
    id: "prod-promo",
    name: "Promo",
    category: "Verde",
    imageType: "promo",
    defaultPrice: 1660,
    stock: 32,
    description: "Producto Verde - Promoción Especial",
    presentations: [
      { name: "balon", label: "Balón", price: 150000 },
      { name: "proveedor", label: "Proveedor", price: 15000 },
      { name: "unidad", label: "Unidad", price: 1660 },
    ],
  },

  // CATEGORIA: BLANCO
  {
    id: "prod-baldes",
    name: "Baldes",
    category: "Blanco",
    imageType: "baldes",
    defaultPrice: 8000,
    stock: 15,
    description: "Producto Blanco - Baldes / Potecitos plásticos",
    presentations: [
      { name: "balde", label: "Balde", price: 8000 },
      { name: "unidad", label: "Unidad", price: 8000 },
    ],
  },
  {
    id: "prod-mamitas",
    name: "Mamitas",
    category: "Blanco",
    imageType: "mamitas",
    defaultPrice: 4400,
    stock: 22,
    description: "Producto Blanco - Mamitas (Abuelita)",
    presentations: [
      { name: "bomba", label: "Bomba", price: 44000 },
      { name: "unidad", label: "Unidad", price: 4400 },
    ],
  },
  {
    id: "prod-tornillos",
    name: "Tornillos",
    category: "Blanco",
    imageType: "tornillos",
    defaultPrice: 5172,
    stock: 12,
    description: "Producto Blanco - Tornillos metálicos 3D",
    presentations: [
      { name: "bomba", label: "Bomba", price: 36000 },
      { name: "unidad", label: "Unidad", price: 5172 },
    ],
  },
];
