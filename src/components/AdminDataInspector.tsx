import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../config/firebase';
import { authService, User } from '../services/authService';
import { collection, getDocs } from 'firebase/firestore';

type FirestoreDoc = { id: string; [key: string]: any };

const AdminDataInspector: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [strategies, setStrategies] = useState<FirestoreDoc[]>([]);
  const [monthlyBenchmarks, setMonthlyBenchmarks] = useState<FirestoreDoc[]>([]);

  useEffect(() => {
    setCurrentUser(authService.getCurrentUser());
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const user = authService.getCurrentUser();
        if (!user) {
          setError('Usuário não autenticado. Faça login para inspecionar seus dados.');
          setLoading(false);
          return;
        }

        // Estratégias
        try {
          const strategiesSnap = await getDocs(collection(db, 'users', user.uid, 'adStrategies'));
          setStrategies(strategiesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any);
        } catch (e: any) {
          setError(prev => prev || `Erro ao carregar adStrategies: ${e?.message || e}`);
        }

        // Benchmarks mensais
        try {
          const benchSnap = await getDocs(collection(db, 'users', user.uid, 'monthlyBenchmarks'));
          setMonthlyBenchmarks(benchSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any);
        } catch (e: any) {
          setError(prev => prev || `Erro ao carregar monthlyBenchmarks: ${e?.message || e}`);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const exportJson = useMemo(() => {
    return JSON.stringify({
      user: currentUser?.uid,
      adStrategies: strategies,
      monthlyBenchmarks,
      exportedAt: new Date().toISOString()
    }, null, 2);
  }, [currentUser, strategies, monthlyBenchmarks]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500 mx-auto mb-3"></div>
          Carregando dados do Firestore...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-slate-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Admin Data Inspector (somente leitura)</h1>
        {error && (
          <div className="bg-red-900/30 border border-red-600/40 text-red-200 px-4 py-3 rounded-lg">{error}</div>
        )}

        <section className="bg-slate-800/50 border border-slate-600 rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-2">Usuário Atual</h2>
          <pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(currentUser, null, 2)}</pre>
        </section>

        <section className="bg-slate-800/50 border border-slate-600 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">adStrategies</h2>
            <span className="text-slate-400 text-sm">{strategies.length} documentos</span>
          </div>
          <pre className="text-xs whitespace-pre-wrap break-all max-h-80 overflow-auto">{JSON.stringify(strategies, null, 2)}</pre>
        </section>

        <section className="bg-slate-800/50 border border-slate-600 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">monthlyBenchmarks</h2>
            <span className="text-slate-400 text-sm">{monthlyBenchmarks.length} documentos</span>
          </div>
          <pre className="text-xs whitespace-pre-wrap break-all max-h-80 overflow-auto">{JSON.stringify(monthlyBenchmarks, null, 2)}</pre>
        </section>

        <section className="bg-slate-800/50 border border-slate-600 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Export JSON</h2>
            <button
              className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
              onClick={() => navigator.clipboard.writeText(exportJson)}
            >Copiar</button>
          </div>
          <pre className="text-xs whitespace-pre-wrap break-all max-h-80 overflow-auto">{exportJson}</pre>
        </section>
      </div>
    </div>
  );
};

export default AdminDataInspector;


