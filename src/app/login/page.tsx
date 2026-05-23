"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const filiereId = searchParams.get("filiere");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const filiereName = {
    "1": "Tourisme, Voyage & Hôtellerie",
    "2": "Droit & Techniques des Affaires",
    "3": "Bâtiment & Travaux Publics",
    "4": "Informatique de Gestion",
    "5": "Management des Affaires",
    "6": "Multimédia, Communication & Journalisme",
    "7": "Entrepreneur du BTP (EBTP)",
    "8": "Marketing digital & Création de Contenus (MDC)",
    "9": "Management des Entreprises (MAE)",
    "10": "Multimédia, Communication & Journalisme (MCJ)",
    "11": "Informatique de Gestion, Électronique et Télécommunication (IGET)"
  }[filiereId || ""] || "votre filière";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/formation/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, filiere_id: filiereId }),
      });

      const data = await res.json();
      if (data.ok) {
        router.push("/dashboard");
      } else {
        setError(data.error || "Identifiants incorrects");
      }
    } catch (err) {
      setError("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-red-700 p-6 text-white text-center">
          <h1 className="text-2xl font-bold uppercase">Connexion</h1>
          <p className="mt-2 text-red-100">Accès à l'espace {filiereName}</p>
        </div>

        <form className="p-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg border border-red-200 text-sm font-medium">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 block">Email</label>
            <input
              type="email"
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition outline-none"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 block">Mot de passe</label>
            <input
              type="password"
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition outline-none"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-700 text-white font-bold py-3 rounded-lg hover:bg-red-800 transition transform active:scale-95 disabled:opacity-50"
          >
            {loading ? "Connexion..." : "SE CONNECTER"}
          </button>

          <p className="text-center text-sm text-gray-600">
            Nouveau ici ? <Link href={`/register?filiere=${filiereId}`} className="text-red-700 font-bold hover:underline">Créer un compte</Link>
          </p>

          <Link href="/" className="block text-center text-xs text-gray-400 hover:text-gray-600 mt-4">
            ← Retour aux filières
          </Link>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement...</div>}>
      <LoginContent />
    </Suspense>
  );
}
