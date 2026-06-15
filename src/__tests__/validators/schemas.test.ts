import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  resetEmailSchema,
  resetPasswordSchema,
  userSchema,
  feedbackSchema,
  campaignSchema,
  rewardSchema,
  roleSchema,
  storeSchema,
} from '../../validators/schemas';

// ─── loginSchema ─────────────────────────────────────────────────────────────

describe('loginSchema', () => {
  it('aceita email e senha válidos', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'secret123' });
    expect(result.success).toBe(true);
  });

  it('rejeita email vazio', () => {
    const result = loginSchema.safeParse({ email: '', password: 'secret123' });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.email).toContain('E-mail é obrigatório');
  });

  it('rejeita email inválido', () => {
    const result = loginSchema.safeParse({ email: 'nao-email', password: 'secret123' });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.email).toContain('E-mail inválido');
  });

  it('rejeita senha vazia', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '' });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.password).toContain('Senha é obrigatória');
  });

  it('rejeita senha com menos de 6 caracteres', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'abc' });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.password).toContain(
      'A senha deve ter no mínimo 6 caracteres'
    );
  });

  it('aceita senha com exatamente 6 caracteres', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'abc123' });
    expect(result.success).toBe(true);
  });
});

// ─── resetEmailSchema ─────────────────────────────────────────────────────────

describe('resetEmailSchema', () => {
  it('aceita email válido', () => {
    expect(resetEmailSchema.safeParse({ email: 'user@example.com' }).success).toBe(true);
  });

  it('rejeita email vazio', () => {
    const result = resetEmailSchema.safeParse({ email: '' });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.email).toContain('E-mail é obrigatório');
  });

  it('rejeita email mal formatado', () => {
    const result = resetEmailSchema.safeParse({ email: 'invalido' });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.email).toContain('E-mail inválido');
  });
});

// ─── resetPasswordSchema ──────────────────────────────────────────────────────

describe('resetPasswordSchema', () => {
  const base = { code: '123456', password: 'newpass1', passwordConfirmation: 'newpass1' };

  it('aceita dados válidos', () => {
    expect(resetPasswordSchema.safeParse(base).success).toBe(true);
  });

  it('rejeita código com menos de 6 dígitos', () => {
    const result = resetPasswordSchema.safeParse({ ...base, code: '123' });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.code).toContain('O código deve ter 6 dígitos');
  });

  it('rejeita código com letras', () => {
    const result = resetPasswordSchema.safeParse({ ...base, code: '12345a' });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.code).toContain(
      'O código deve conter apenas números'
    );
  });

  it('rejeita quando senhas não coincidem', () => {
    const result = resetPasswordSchema.safeParse({ ...base, passwordConfirmation: 'diferente' });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.passwordConfirmation).toContain(
      'As senhas não coincidem'
    );
  });
});

// ─── userSchema ───────────────────────────────────────────────────────────────

describe('userSchema', () => {
  const base = {
    name: 'João Silva',
    email: 'joao@exemplo.com',
    password: 'senha123',
    user_type_id: '1',
  };

  it('aceita dados válidos', () => {
    expect(userSchema.safeParse(base).success).toBe(true);
  });

  it('rejeita nome com menos de 3 caracteres', () => {
    const result = userSchema.safeParse({ ...base, name: 'Jo' });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.name).toContain(
      'Nome deve ter no mínimo 3 caracteres'
    );
  });

  it('rejeita telefone inválido', () => {
    const result = userSchema.safeParse({ ...base, phone: '99999999' });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.phone).toContain('Telefone inválido');
  });

  it('aceita telefone válido no formato (99) 99999-9999', () => {
    expect(userSchema.safeParse({ ...base, phone: '(11) 99999-9999' }).success).toBe(true);
  });

  it('aceita sem telefone (campo opcional)', () => {
    expect(userSchema.safeParse({ ...base }).success).toBe(true);
  });
});

// ─── feedbackSchema ───────────────────────────────────────────────────────────

describe('feedbackSchema', () => {
  const base = { recipient_id: 1, content: 'Excelente trabalho em equipe', is_anonymous: false };

  it('aceita dados válidos', () => {
    expect(feedbackSchema.safeParse(base).success).toBe(true);
  });

  it('rejeita mensagem com menos de 10 caracteres', () => {
    const result = feedbackSchema.safeParse({ ...base, content: 'Curto' });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.content).toContain(
      'A mensagem deve ter no mínimo 10 caracteres'
    );
  });

  it('rejeita mensagem com mais de 1000 caracteres', () => {
    const result = feedbackSchema.safeParse({ ...base, content: 'a'.repeat(1001) });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.content).toContain(
      'A mensagem deve ter no máximo 1000 caracteres'
    );
  });

  it('rejeita recipient_id inválido', () => {
    const result = feedbackSchema.safeParse({ ...base, recipient_id: 0 });
    expect(result.success).toBe(false);
  });
});

// ─── campaignSchema ───────────────────────────────────────────────────────────

describe('campaignSchema', () => {
  const base = {
    name: 'Campanha Q1',
    type: 'sales',
    goal: '10000',
    start_date: '2026-01-01',
    end_date: '2026-03-31',
    status: 'ativa',
  };

  it('aceita campanha de vendas válida', () => {
    expect(campaignSchema.safeParse(base).success).toBe(true);
  });

  it('aceita campanha de engajamento válida', () => {
    expect(
      campaignSchema.safeParse({ ...base, type: 'engagement', goal: '50' }).success
    ).toBe(true);
  });

  it('rejeita tipo inválido', () => {
    const result = campaignSchema.safeParse({ ...base, type: 'invalido' });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.type).toContain('Tipo de campanha inválido');
  });

  it('rejeita status inválido', () => {
    const result = campaignSchema.safeParse({ ...base, status: 'rascunho' });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.status).toContain('Situação inválida');
  });

  it('rejeita quando goal está vazio para tipo sales', () => {
    const result = campaignSchema.safeParse({ ...base, goal: '' });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.goal).toContain('Meta é obrigatória');
  });

  it('rejeita goal não numérico para sales', () => {
    const result = campaignSchema.safeParse({ ...base, goal: 'abc' });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.goal).toContain('Deve ser um número válido');
  });

  it('rejeita nome com menos de 3 caracteres', () => {
    const result = campaignSchema.safeParse({ ...base, name: 'AB' });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.name).toContain(
      'Nome deve ter no mínimo 3 caracteres'
    );
  });

  it('rejeita data de início com ano fora do limite', () => {
    const result = campaignSchema.safeParse({ ...base, start_date: '31231-03-21' });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.start_date).toContain(
      'Data de início inválida ou ano fora do limite (máx 2100)'
    );
  });

  it('rejeita data de término com ano fora do limite', () => {
    const result = campaignSchema.safeParse({ ...base, end_date: '275760-12-12' });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.end_date).toContain(
      'Data de término inválida ou ano fora do limite (máx 2100)'
    );
  });
});

// ─── rewardSchema ─────────────────────────────────────────────────────────────

describe('rewardSchema', () => {
  const base = {
    name: 'Voucher Netflix',
    description: 'Assinatura mensal Netflix',
    price_coins: '500',
    stock: '100',
    fulfillment_type: 'voucher' as const,
    is_active: 'true',
  };

  it('aceita recompensa válida', () => {
    expect(rewardSchema.safeParse(base).success).toBe(true);
  });

  it('rejeita preço acima de 100.000.000', () => {
    const result = rewardSchema.safeParse({ ...base, price_coins: '100000001' });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.price_coins).toContain(
      'Preço máximo é 100.000.000'
    );
  });

  it('rejeita estoque não numérico', () => {
    const result = rewardSchema.safeParse({ ...base, stock: 'abc' });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.stock).toContain('Deve ser um número válido');
  });

  it('rejeita descrição com menos de 10 caracteres', () => {
    const result = rewardSchema.safeParse({ ...base, description: 'Curta' });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.description).toContain(
      'Descrição deve ter no mínimo 10 caracteres'
    );
  });
});

// ─── roleSchema ───────────────────────────────────────────────────────────────

describe('roleSchema', () => {
  it('aceita descrição válida', () => {
    expect(roleSchema.safeParse({ description: 'Gerente de Vendas' }).success).toBe(true);
  });

  it('rejeita descrição vazia', () => {
    const result = roleSchema.safeParse({ description: '' });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.description).toContain('Descrição é obrigatória');
  });

  it('rejeita descrição com mais de 100 caracteres', () => {
    const result = roleSchema.safeParse({ description: 'a'.repeat(101) });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.description).toContain('Descrição muito longa');
  });
});

// ─── storeSchema ──────────────────────────────────────────────────────────────

describe('storeSchema', () => {
  const base = {
    name: 'Loja Centro',
    cnpj: '12.345.678/0001-99',
    active: true,
    store_group_id: null,
  };

  it('aceita loja válida', () => {
    expect(storeSchema.safeParse(base).success).toBe(true);
  });

  it('rejeita CNPJ inválido', () => {
    const result = storeSchema.safeParse({ ...base, cnpj: '123' });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.cnpj).toContain('CNPJ inválido');
  });

  it('rejeita nome com menos de 3 caracteres', () => {
    const result = storeSchema.safeParse({ ...base, name: 'Lo' });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.name).toContain(
      'Nome da loja deve ter no mínimo 3 caracteres'
    );
  });
});
