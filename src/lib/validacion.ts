import { z } from "zod";

export const esquemaCliente = z.object({
  nombre: z.string().trim().min(3, "Escribe tu nombre completo.").max(80, "Máximo 80 caracteres."),
  celular: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s()-]/g, ""))
    .refine((v) => /^(\+?57)?3\d{9}$/.test(v) || /^\+?\d{7,15}$/.test(v), "Escribe un celular válido (10 dígitos)."),
  ciudad: z.string().trim().min(2, "Escribe tu ciudad.").max(60, "Máximo 60 caracteres."),
  correo: z.union([z.literal(""), z.string().trim().email("Correo no válido.").max(120)]).optional(),
  nota: z.string().trim().max(500, "Máximo 500 caracteres.").optional(),
});

export type EntradaCliente = z.input<typeof esquemaCliente>;
