import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { Search, Filter, Store, MoreHorizontal, Plus, MapPin, Phone, Users } from 'lucide-react';
import { motion } from 'motion/react';

interface StoreConfig {
  id: number;
  name: string;
  address: string;
  manager: string;
  status: 'active' | 'inactive' | 'maintenance';
  phone: string;
}

const MOCK_STORES: StoreConfig[] = [
  { id: 1, name: 'Loja Matriz', address: 'Av. Paulista, 1000 - SP', manager: 'Carlos Silva', status: 'active', phone: '(11) 99999-0001' },
  { id: 2, name: 'Filial Centro', address: 'Rua Direita, 50 - SP', manager: 'Ana Souza', status: 'active', phone: '(11) 99999-0002' },
  { id: 3, name: 'Filial Zona Sul', address: 'Av. Santo Amaro, 200 - SP', manager: 'Roberto Lima', status: 'maintenance', phone: '(11) 99999-0003' },
  { id: 4, name: 'Filial Zona Norte', address: 'Av. Cruzeiro do Sul, 300 - SP', manager: 'Fernanda Costa', status: 'inactive', phone: '(11) 99999-0004' },
  { id: 5, name: 'Quiosque Shopping', address: 'Shopping Eldorado - SP', manager: 'Pedro Santos', status: 'active', phone: '(11) 99999-0005' },
];

export const SettingsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredStores = MOCK_STORES.filter(store => {
    const matchesSearch = store.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          store.manager.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || store.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Configurações de Lojas</h1>
            <p className="text-zinc-500">Gerencie as configurações e status das suas unidades.</p>
          </div>
          <button className="bg-emerald-600 px-4 py-2 rounded-xl text-sm font-medium text-white hover:bg-emerald-700 shadow-sm transition-all flex items-center gap-2">
            <Plus size={18} />
            Nova Loja
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou gerente..." 
              className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter size={20} className="text-zinc-400" />
            <select 
              className="flex-1 md:w-48 p-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos os Status</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
              <option value="maintenance">Manutenção</option>
            </select>
          </div>
        </div>

        {/* Store List */}
        <div className="grid grid-cols-1 gap-4">
          {filteredStores.map((store) => (
            <motion.div 
              key={store.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="bg-zinc-100 p-3 rounded-xl">
                    <Store className="w-6 h-6 text-zinc-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-zinc-900">{store.name}</h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1 text-sm text-zinc-500">
                      <span className="flex items-center gap-1">
                        <MapPin size={14} />
                        {store.address}
                      </span>
                      <span className="hidden sm:inline">•</span>
                      <span className="flex items-center gap-1">
                        <Users size={14} />
                        Gerente: {store.manager}
                      </span>
                      <span className="hidden sm:inline">•</span>
                      <span className="flex items-center gap-1">
                        <Phone size={14} />
                        {store.phone}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-zinc-100">
                  <StatusBadge status={store.status} />
                  <button className="p-2 text-zinc-400 hover:bg-zinc-50 rounded-full transition-colors">
                    <MoreHorizontal size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}

          {filteredStores.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-zinc-200">
              <Store className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-zinc-900">Nenhuma loja encontrada</h3>
              <p className="text-zinc-500">Tente ajustar seus filtros de busca.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

const StatusBadge: React.FC<{ status: StoreConfig['status'] }> = ({ status }) => {
  const styles = {
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-red-100 text-red-700',
    maintenance: 'bg-amber-100 text-amber-700'
  };

  const labels = {
    active: 'Ativo',
    inactive: 'Inativo',
    maintenance: 'Manutenção'
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};
