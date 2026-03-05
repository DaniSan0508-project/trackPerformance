import React from 'react';
import { Layout } from '../components/Layout';
import { TrendingUp, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const DashboardPage: React.FC = () => {
  const { user, tenant } = useAuth();

  if (!user) return null;

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Bem-vindo, {user.name.split(' ')[0]}!</h1>
            <p className="text-zinc-500 dark:text-zinc-400">Aqui está o que está acontecendo na {tenant?.trading_name}.</p>
          </div>
          <div className="flex gap-2">
            <button className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-4 py-2 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all">
              Exportar
            </button>
            <button className="bg-emerald-600 px-4 py-2 rounded-xl text-sm font-medium text-white hover:bg-emerald-700 shadow-sm transition-all">
              Novo Relatório
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Vendas Totais" value="R$ 45.280" change="+12.5%" positive />
          <StatCard label="Novos Clientes" value="124" change="+3.2%" positive />
          <StatCard label="Taxa de Conversão" value="2.4%" change="-0.4%" />
          <StatCard label="Satisfação" value="98%" change="+1.2%" positive />
        </div>

        {/* Info Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 transition-colors duration-200">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-zinc-900 dark:text-white">
              <TrendingUp size={20} className="text-emerald-600" />
              Desempenho Semanal
            </h3>
            <div className="h-64 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-400 dark:text-zinc-500 transition-colors duration-200">
              Gráfico de Desempenho (Placeholder)
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 space-y-4 transition-colors duration-200">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-zinc-900 dark:text-white">
              <Building2 size={20} className="text-emerald-600" />
              Dados da Empresa
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl transition-colors duration-200">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Nome</span>
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">{tenant?.trading_name}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl transition-colors duration-200">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Status</span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${tenant?.is_active ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                  {tenant?.is_active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl transition-colors duration-200">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">ID do Tenant</span>
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">#{tenant?.id}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

const StatCard: React.FC<{ label: string; value: string; change: string; positive?: boolean }> = ({ label, value, change, positive }) => (
  <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 transition-colors duration-200">
    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">{label}</p>
    <div className="flex items-end justify-between">
      <h4 className="text-2xl font-bold text-zinc-900 dark:text-white">{value}</h4>
      <span className={`text-xs font-bold px-2 py-1 rounded-lg ${positive ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>
        {change}
      </span>
    </div>
  </div>
);
