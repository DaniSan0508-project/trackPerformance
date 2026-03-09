import { z } from 'zod';

// Schema para Login
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'E-mail é obrigatório')
    .email('E-mail inválido'),
  password: z
    .string()
    .min(1, 'Senha é obrigatória')
    .min(6, 'A senha deve ter no mínimo 6 caracteres'),
});

// Schema para Usuário (criação)
export const userSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome é obrigatório')
    .min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z
    .string()
    .min(1, 'E-mail é obrigatório')
    .email('E-mail inválido'),
  password: z
    .string()
    .min(1, 'Senha é obrigatória')
    .min(6, 'A senha deve ter no mínimo 6 caracteres'),
  user_type_id: z.string(),
  store_id: z.string().optional(),
});

// Schema para Usuário (edição - senha opcional)
export const userUpdateSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome é obrigatório')
    .min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z
    .string()
    .min(1, 'E-mail é obrigatório')
    .email('E-mail inválido'),
  password: z.string().optional(),
  user_type_id: z.string(),
  store_id: z.string().optional(),
});

// Schema para Loja
export const storeSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome da loja é obrigatório')
    .min(3, 'Nome da loja deve ter no mínimo 3 caracteres'),
  cnpj: z
    .string()
    .min(1, 'CNPJ inválido')
    .regex(/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/, 'CNPJ inválido'),
  email: z
    .string()
    .min(1, 'E-mail inválido')
    .email('E-mail inválido'),
  phone: z
    .string()
    .min(1, 'Telefone inválido')
    .regex(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/, 'Telefone inválido'),
  active: z.boolean(),
  store_group_id: z.union([z.string(), z.number()]).nullable(),
});

// Schema para Grupo de Lojas
export const storeGroupSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome do grupo é obrigatório')
    .min(3, 'Nome do grupo deve ter no mínimo 3 caracteres'),
  active: z.boolean(),
});

// Schema para Feedback
export const feedbackSchema = z.object({
  recipient_id: z.number().int().positive('Destinatário inválido'),
  content: z
    .string()
    .min(1, 'Mensagem é obrigatória')
    .min(10, 'A mensagem deve ter no mínimo 10 caracteres')
    .max(1000, 'A mensagem deve ter no máximo 1000 caracteres'),
  is_anonymous: z.boolean(),
});

// Schema para Post
export const postSchema = z.object({
  content: z
    .string()
    .min(1, 'Conteúdo é obrigatório')
    .min(10, 'O conteúdo deve ter no mínimo 10 caracteres')
    .max(5000, 'O conteúdo deve ter no máximo 5000 caracteres'),
  image: z.instanceof(File).optional().nullable(),
});

// Schema para Configuração do Tenant
export const tenantConfigSchema = z.object({
  tenant_id: z.number().int().positive(),
  config_key: z.string(),
  config_value: z.string(),
});

// Schema para Configurações Específicas
export const tenantConfigValidations = {
  cnpj: z.string().regex(/^\d{14}$/, 'CNPJ deve conter 14 dígitos'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().regex(/^\(\d{2}\)\s?\d{4,5}-?\d{4}$/, 'Telefone inválido'),
  timezone: z.string().min(1, 'Fuso horário é obrigatório'),
  date_format: z.string().min(1, 'Formato de data é obrigatório'),
  webhook_url: z.string().url('URL inválida').or(z.literal('')),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida (use #RRGGBB)'),
  secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida (use #RRGGBB)'),
  path_logo: z.string().url('URL inválida').or(z.literal('')),
  privacy_policy_url: z.string().url('URL inválida').or(z.literal('')),
  post_quantity: z.string().regex(/^\d+$/, 'Deve ser um número válido'),
  user_profile: z.enum(['corporate', 'multiple_companies']),
  email_notifications_enabled: z.enum(['true', 'false']),
  api_integration_enabled: z.enum(['true', 'false']),
  allow_user_post: z.enum(['true', 'false']),
};

// Schema para Recompensa (criação)
export const rewardSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome é obrigatório')
    .min(3, 'Nome deve ter no mínimo 3 caracteres'),
  description: z
    .string()
    .min(1, 'Descrição é obrigatória')
    .min(10, 'Descrição deve ter no mínimo 10 caracteres'),
  price_coins: z
    .string()
    .min(1, 'Preço é obrigatório')
    .regex(/^\d+$/, 'Deve ser um número válido'),
  stock: z
    .string()
    .min(1, 'Estoque é obrigatório')
    .regex(/^\d+$/, 'Deve ser um número válido'),
  is_active: z.string(),
  images: z.array(z.instanceof(File)).optional(),
  primary_image_index: z.string().optional(),
});

// Schema para Recompensa (edição - campos opcionais)
export const rewardUpdateSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome é obrigatório')
    .min(3, 'Nome deve ter no mínimo 3 caracteres'),
  description: z
    .string()
    .min(1, 'Descrição é obrigatória')
    .min(10, 'Descrição deve ter no mínimo 10 caracteres'),
  price_coins: z
    .string()
    .min(1, 'Preço é obrigatório')
    .regex(/^\d+$/, 'Deve ser um número válido'),
  stock: z
    .string()
    .min(1, 'Estoque é obrigatório')
    .regex(/^\d+$/, 'Deve ser um número válido'),
  is_active: z.string(),
  images: z.array(z.instanceof(File)).optional(),
  primary_image_index: z.string().optional(),
});

// Tipos inferidos dos schemas
export type LoginFormData = z.infer<typeof loginSchema>;
export type UserFormData = z.infer<typeof userSchema>;
export type StoreFormData = z.infer<typeof storeSchema>;
export type StoreGroupFormData = z.infer<typeof storeGroupSchema>;
export type FeedbackFormData = z.infer<typeof feedbackSchema>;
export type PostFormData = z.infer<typeof postSchema>;
export type RewardFormData = z.infer<typeof rewardSchema>;
export type RewardUpdateFormData = z.infer<typeof rewardUpdateSchema>;
