export interface ProductPackaging {
  id: string;
  label: string;
  multiplier: number; // Cantidad de unidades físicas contenidas
  packagePrice: number; // Precio total de este paquete o presentación
}

export interface CanonicalProductDetails {
  name: string;
  group: "blanco" | "verde" | "adicionales";
  groupLabel: "Blanco" | "Verde" | "Productos adicionales";
  unitPrice: number;
  packagings: ProductPackaging[];
}

export function getProductPackagings(productName: string): CanonicalProductDetails {
  const n = (productName || "").trim().toLowerCase();

  // 1. Grupo Blanco: Mamitas y Tornillo
  if (n.includes("mamita")) {
    return {
      name: "Mamitas",
      group: "blanco",
      groupLabel: "Blanco",
      unitPrice: 4400,
      packagings: [
        { id: "bomba", label: "Bomba (10 un)", multiplier: 10, packagePrice: 44000 },
        { id: "unidad", label: "Unidad (4.400)", multiplier: 1, packagePrice: 4400 },
      ]
    };
  }

  if (n.includes("tornillo")) {
    return {
      name: "Tornillo",
      group: "blanco",
      groupLabel: "Blanco",
      unitPrice: 5142,
      packagings: [
        { id: "bomba", label: "Bomba (7 un)", multiplier: 7, packagePrice: 36000 },
        { id: "unidad", label: "Unidad (5.142)", multiplier: 1, packagePrice: 5142 },
      ]
    };
  }

  // 2. Grupo Verde: Lisos, Largos y Minis
  if (n.includes("liso") || n.includes("gordo")) {
    return {
      name: "Lisos",
      group: "verde",
      groupLabel: "Verde",
      unitPrice: 3400,
      packagings: [
        { id: "balon", label: "Balón (75 un)", multiplier: 75, packagePrice: 255000 },
        { id: "paquete", label: "Paquete (5 un)", multiplier: 5, packagePrice: 17000 },
        { id: "unidad", label: "Unidad (3.400)", multiplier: 1, packagePrice: 3400 },
      ]
    };
  }

  if (n.includes("largo")) {
    return {
      name: "Largos",
      group: "verde",
      groupLabel: "Verde",
      unitPrice: 4000,
      packagings: [
        { id: "balon", label: "Balón (75 un)", multiplier: 75, packagePrice: 300000 },
        { id: "paquete", label: "Paquete (5 un)", multiplier: 5, packagePrice: 20000 },
        { id: "unidad", label: "Unidad (4.000)", multiplier: 1, packagePrice: 4000 },
      ]
    };
  }

  if (n.includes("mini")) {
    return {
      name: "Minis",
      group: "verde",
      groupLabel: "Verde",
      unitPrice: 1571,
      packagings: [
        { id: "balon", label: "Balón (70 un)", multiplier: 70, packagePrice: 110000 },
        { id: "paquete", label: "Paquete (7 un)", multiplier: 7, packagePrice: 11000 },
        { id: "unidad", label: "Unidad (1.571)", multiplier: 1, packagePrice: 1571 },
      ]
    };
  }

  // 3. Productos adicionales: Baldes, Rojas, Flores, Pre-roll (todos a $8.000)
  if (n.includes("balde")) {
    return {
      name: "Baldes",
      group: "adicionales",
      groupLabel: "Productos adicionales",
      unitPrice: 8000,
      packagings: [
        { id: "balde", label: "Balde (8.000)", multiplier: 1, packagePrice: 8000 },
        { id: "unidad", label: "Unidad (8.000)", multiplier: 1, packagePrice: 8000 },
      ]
    };
  }

  if (n.includes("roja")) {
    return {
      name: "Rojas",
      group: "adicionales",
      groupLabel: "Productos adicionales",
      unitPrice: 8000,
      packagings: [
        { id: "unidad", label: "Unidad (8.000)", multiplier: 1, packagePrice: 8000 },
      ]
    };
  }

  if (n.includes("flor")) {
    return {
      name: "Flores",
      group: "adicionales",
      groupLabel: "Productos adicionales",
      unitPrice: 8000,
      packagings: [
        { id: "unidad", label: "Unidad (8.000)", multiplier: 1, packagePrice: 8000 },
      ]
    };
  }

  if (n.includes("roll")) {
    return {
      name: "Pre-roll",
      group: "adicionales",
      groupLabel: "Productos adicionales",
      unitPrice: 8000,
      packagings: [
        { id: "unidad", label: "Unidad (8.000)", multiplier: 1, packagePrice: 8000 },
      ]
    };
  }

  return {
    name: productName || "Producto",
    group: "adicionales",
    groupLabel: "Productos adicionales",
    unitPrice: 8000,
    packagings: [
      { id: "unidad", label: "Unidad", multiplier: 1, packagePrice: 8000 },
    ]
  };
}

