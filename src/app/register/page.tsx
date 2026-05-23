"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function RegisterContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const filiereId = searchParams.get("filiere");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
        setError("Les mots de passe ne correspondent pas");
        return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/formation/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, email, password, filiere_id: filiereId }),
      });

      const data = await res.json();
      if (data.ok) {
        router.push(`/login?filiere=${filiereId}&registered=true`);
      } else {
        setError(data.error || "Erreur lors de l'inscription");
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
          <h1 className="text-2xl font-bold uppercase">Inscription</h1>
          <p className="mt-2 text-red-100">Créer votre compte étudiant</p>
        </div>

        <form className="p-8 space-y-4" onSubmit={handleRegister}>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg border border-red-200 text-sm font-medium">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700 block">Nom complet</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 transition outline-none"
              placeholder="Prénom Nom"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700 block">Email</label>
            <input
              type="email"
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 transition outline-none"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700 block">Mot de passe</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 transition outline-none"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700 block">Confirmer mot de passe</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 transition outline-none"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-700 text-white font-bold py-3 mt-4 rounded-lg hover:bg-red-800 transition transform active:scale-95 disabled:opacity-50"
          >
            {loading ? "Création..." : "CRÉER MON COMPTE"}
          </button>

          <p className="text-center text-sm text-gray-600 mt-4">
            Déjà un compte ? <Link href={`/login?filiere=${filiereId}`} className="text-red-700 font-bold hover:underline">Se connecter</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement...</div>}>
      <RegisterContent />
    </Suspense>
  );
}
