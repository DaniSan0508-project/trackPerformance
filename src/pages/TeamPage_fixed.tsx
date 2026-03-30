                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                      {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                      {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal de Extrato de Moedas */}
      <CoinStatementModal
        isOpen={coinStatementModal.isOpen}
        user={coinStatementModal.user}
        token={token}
        onClose={handleCloseCoinStatement}
      />
    </Layout>
  );
};
