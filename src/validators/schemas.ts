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

export const resetEmailSchema = z.object({
  email: z
    .string()
    .min(1, 'E-mail é obrigatório')
    .email('E-mail inválido'),
});

export const resetPasswordSchema = z.object({
  code: z
    .string()
    .length(6, 'O código deve ter 6 dígitos')
    .regex(/^\d{6}$/, 'O código deve conter apenas números'),
  password: z
    .string()
    .min(1, 'Senha é obrigatória')
    .min(6, 'A senha deve ter no mínimo 6 caracteres'),
  passwordConfirmation: z
    .string()
    .min(1, 'Confirmação de senha é obrigatória'),
}).refine((data) => data.password === data.passwordConfirmation, {
  message: 'As senhas não coincidem',
  path: ['passwordConfirmation'],
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
  phone: z
    .string()
    .optional()
    .refine((val) => !val || /^\(\d{2}\)\s?\d{4,5}-\d{4}$/.test(val), {
      message: 'Telefone inválido',
    }),
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
  phone: z
    .string()
    .optional()
    .refine((val) => !val || /^\(\d{2}\)\s?\d{4,5}-\d{4}$/.test(val), {
      message: 'Telefone inválido',
    }),
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
    .email('E-mail inválido')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .regex(/^\(\d{2}\)\s?\d{4,5}-\d{4}$/, 'Telefone inválido')
    .optional()
    .or(z.literal('')),
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
  phone: z.string().regex(/^\(\d{2}\)\s?\d{4,5}-\d{4}$/, 'Telefone inválido'),
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
  fulfillment_type: z
    .enum(['physical', 'voucher'])
    .default('physical'),
  valid_until: z.string().optional(),
  voucher_instructions: z.string().optional(),
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
  fulfillment_type: z
    .enum(['physical', 'voucher'])
    .default('physical'),
  valid_until: z.string().optional(),
  voucher_instructions: z.string().optional(),
  is_active: z.string(),
  images: z.array(z.instanceof(File)).optional(),
  primary_image_index: z.string().optional(),
});

// Schema para Campanha
export const campaignSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome é obrigatório')
    .min(3, 'Nome deve ter no mínimo 3 caracteres'),
  type: z
    .string()
    .min(1, 'Tipo de campanha é obrigatório')
    .refine((val) => val === 'sales' || val === 'engagement', {
      message: 'Tipo de campanha inválido',
    }),
  goal: z
    .string()
    .optional(),
  goal_campaign: z
    .string()
    .optional(),
  start_date: z
    .string()
    .min(1, 'Data de início é obrigatória'),
  end_date: z
    .string()
    .min(1, 'Data de término é obrigatória'),
  status: z
    .string()
    .min(1, 'Status é obrigatório')
    .refine((val) => val === 'ativa' || val === 'pausada' || val === 'finalizada', {
      message: 'Status inválido',
    }),
  is_public: z.boolean().optional(),
  hashtags: z.array(z.object({
    hashtag: z.string().startsWith('#', 'Hashtag deve começar com #'),
    coins: z.number().positive('Valor de coins deve ser positivo')
  })).optional(),
}).refine((data) => {
  // Goal é obrigatório para sales e engagement
  if (data.type === 'sales' && (!data.goal || data.goal.trim() === '')) {
    return false;
  }
  if (data.type === 'engagement' && (!data.goal || data.goal.trim() === '')) {
    return false;
  }
  return true;
  }, {
  message: 'Meta é obrigatória',
  path: ['goal'],
  }).refine((data) => {
  // Valida formato numérico se goal estiver presente
  if (data.goal && data.goal.trim() !== '') {
    if (data.type === 'sales') {
      return /^\d+(\.\d{1,2})?$/.test(data.goal);
    } else if (data.type === 'engagement') {
      return /^\d+$/.test(data.goal);
    }
  }
  return true;
  }, {
  message: 'Deve ser um número válido',
  path: ['goal'],
});

// Schema para Produto
export const productSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome é obrigatório')
    .min(3, 'Nome deve ter no mínimo 3 caracteres'),
  barcode: z
    .string()
    .min(1, 'Código de barras é obrigatório'),
  manufacturer_id: z
    .number()
    .min(1, 'Selecione um fabricante')
    .nullable()
    .optional(),
  product_group_id: z
    .number()
    .nullable()
    .optional(),
});

// Schema para Cargos
export const roleSchema = z.object({
  description: z
    .string()
    .min(1, 'Descrição é obrigatória')
    .max(100, 'Descrição muito longa'),
});

// Tipos inferidos dos schemas
export type LoginFormData = z.infer<typeof loginSchema>;
export type ResetEmailFormData = z.infer<typeof resetEmailSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type UserFormData = z.infer<typeof userSchema>;
export type StoreFormData = z.infer<typeof storeSchema>;
export type StoreGroupFormData = z.infer<typeof storeGroupSchema>;
export type FeedbackFormData = z.infer<typeof feedbackSchema>;
export type PostFormData = z.infer<typeof postSchema>;
export type RewardFormData = z.infer<typeof rewardSchema>;
export type RewardUpdateFormData = z.infer<typeof rewardUpdateSchema>;
export type CampaignFormData = z.infer<typeof campaignSchema>;
export type ProductFormData = z.infer<typeof productSchema>;
export type RoleFormData = z.infer<typeof roleSchema>;
