import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmModal } from '../../components/ConfirmModal';

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onConfirm: vi.fn(),
  title: 'Excluir item',
  message: 'Tem certeza que deseja excluir? Esta ação não pode ser desfeita.',
};

describe('ConfirmModal', () => {
  it('não renderiza quando isOpen=false', () => {
    render(<ConfirmModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Excluir item')).not.toBeInTheDocument();
  });

  it('renderiza título e mensagem quando isOpen=true', () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText('Excluir item')).toBeInTheDocument();
    expect(
      screen.getByText('Tem certeza que deseja excluir? Esta ação não pode ser desfeita.')
    ).toBeInTheDocument();
  });

  it('exibe textos padrão nos botões', () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
  });

  it('usa textos personalizados nos botões', () => {
    render(<ConfirmModal {...defaultProps} confirmText="Sim, excluir" cancelText="Não" />);
    expect(screen.getByRole('button', { name: 'Sim, excluir' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Não' })).toBeInTheDocument();
  });

  it('chama onConfirm ao clicar no botão de confirmação', () => {
    const onConfirm = vi.fn();
    render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('chama onClose ao clicar em Cancelar', () => {
    const onClose = vi.fn();
    render(<ConfirmModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('chama onClose ao clicar no ícone X', () => {
    const onClose = vi.fn();
    render(<ConfirmModal {...defaultProps} onClose={onClose} />);
    // O botão X é o único sem texto visível além dos dois botões de ação
    const buttons = screen.getAllByRole('button');
    const closeX = buttons.find(
      (b) => !['Confirmar', 'Cancelar'].includes(b.textContent ?? '')
    );
    expect(closeX).toBeDefined();
    fireEvent.click(closeX!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('desabilita os botões durante isLoading', () => {
    render(<ConfirmModal {...defaultProps} isLoading />);
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(screen.getByText('Processando...')).toBeInTheDocument();
  });

  it('exibe spinner durante isLoading', () => {
    render(<ConfirmModal {...defaultProps} isLoading />);
    expect(screen.queryByText('Confirmar')).not.toBeInTheDocument();
    expect(screen.getByText('Processando...')).toBeInTheDocument();
  });

  it('renderiza o tipo danger por padrão', () => {
    const { container } = render(<ConfirmModal {...defaultProps} />);
    expect(container.querySelector('.text-red-600')).toBeInTheDocument();
  });

  it('renderiza o tipo warning com cor âmbar', () => {
    const { container } = render(<ConfirmModal {...defaultProps} type="warning" />);
    expect(container.querySelector('.text-amber-600')).toBeInTheDocument();
  });

  it('renderiza o tipo info com cor azul', () => {
    const { container } = render(<ConfirmModal {...defaultProps} type="info" />);
    expect(container.querySelector('.text-blue-600')).toBeInTheDocument();
  });
});
